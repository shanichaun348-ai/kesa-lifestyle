import "server-only";

import { seedCoupons, type DemoCoupon } from "@/lib/demo/seed-coupons";
import { isSupabaseConfigured } from "@/lib/supabase";

import { loadCouponContext } from "./coupon-store";
import { evaluateCoupon, normaliseCode, type CouponContext, type CouponEvaluation, type CouponRecord } from "./coupon-rules";

/** The dev seed as the same record shape the database produces. */
function seedToRecord(c: DemoCoupon): CouponRecord {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    minOrderPaise: c.minOrderPaise,
    maxDiscountPaise: null,
    startsAt: null,
    endsAt: c.expiresAt ?? (c.status === "expired" ? new Date(0).toISOString() : null),
    usageLimit: c.usageLimit ?? null,
    perCustomerLimit: c.perCustomerLimit ?? null,
    firstOrderOnly: false,
    // "expired" seeds stay active so the date rule (not the inactive rule) rejects them.
    active: c.status !== "inactive",
    createdAt: c.createdAt,
  };
}

function seedContext(code: string, subtotalPaise: number, productSlugs: string[]): { ctx: CouponContext; notApplicable: boolean } {
  const demo = seedCoupons.find((c) => c.code === code) ?? null;
  const notApplicable = !!demo?.productSlugs?.length && !productSlugs.some((s) => demo.productSlugs!.includes(s));
  const ctx: CouponContext = {
    coupon: demo ? seedToRecord(demo) : null,
    code,
    subtotalPaise,
    now: new Date(),
    totalRedemptions: demo?.usageCount ?? 0,
    customerRedemptions: 0,
    customerHasPriorPaidOrder: false,
  };
  return { ctx, notApplicable };
}

/**
 * Validate a coupon code server-side and compute the discount amount.
 * Reads the `coupons` table (and the redemption ledger) when Supabase is
 * configured; falls back to the dev seed otherwise. All rules live in
 * coupon-rules.ts.
 *
 * @param code           Coupon code from the client (only the identifier is trusted).
 * @param subtotalPaise  Pre-discount merchandise subtotal in paise.
 * @param productSlugs   Slugs of all products in the cart (seed-only eligibility check).
 * @param customerEmail  Lower-cased email, for per-customer and first-order rules.
 */
export async function validateCoupon(code: string, subtotalPaise: number, productSlugs: string[], customerEmail?: string): Promise<CouponEvaluation> {
  const normalized = normaliseCode(code);

  if (isSupabaseConfigured()) {
    try {
      const ctx = await loadCouponContext(normalized, customerEmail, new Date(), subtotalPaise);
      return evaluateCoupon(ctx);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", event: "coupon", action: "lookup_failed", code: normalized, error: err instanceof Error ? err.message : "unknown", ts: new Date().toISOString() }));
      return { ok: false, error: { code: "COUPON_NOT_FOUND", message: "We couldn't check that code right now — please try again.", couponCode: normalized } };
    }
  }

  const { ctx, notApplicable } = seedContext(normalized, subtotalPaise, productSlugs);
  const result = evaluateCoupon(ctx);
  if (result.ok && notApplicable) {
    return { ok: false, error: { code: "COUPON_NOT_APPLICABLE", message: "This coupon is not applicable to the items in your cart.", couponCode: normalized } };
  }
  return result;
}
