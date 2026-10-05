import "server-only";

import { seedCoupons } from "@/lib/demo/seed-coupons";
import type { AppliedCoupon, PricingError } from "./types";

type CouponResult = { ok: true; coupon: AppliedCoupon } | { ok: false; error: PricingError };

/**
 * Validate a coupon code server-side and compute the discount amount.
 *
 * Phase 2: replace the seedCoupons scan with a DB query + per-customer
 * usage check against the orders table.
 *
 * @param code       Coupon code from the client (only the identifier is trusted).
 * @param subtotalPaise  Pre-discount subtotal in paise, used for min-order check.
 * @param productSlugs   Slugs of all products in the cart, for eligibility check.
 */
export function validateCoupon(code: string, subtotalPaise: number, productSlugs: string[]): CouponResult {
  const normalized = code.trim().toUpperCase();
  const coupon = seedCoupons.find((c) => c.code === normalized);

  if (!coupon) {
    return { ok: false, error: { code: "COUPON_NOT_FOUND", message: `Coupon "${normalized}" not found.`, couponCode: normalized } };
  }

  if (coupon.status === "inactive") {
    return { ok: false, error: { code: "COUPON_INACTIVE", message: "This coupon is not active.", couponCode: normalized } };
  }

  if (coupon.status === "expired" || (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())) {
    return { ok: false, error: { code: "COUPON_EXPIRED", message: "This coupon has expired.", couponCode: normalized } };
  }

  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, error: { code: "COUPON_USAGE_LIMIT_REACHED", message: "This coupon has reached its usage limit.", couponCode: normalized } };
  }

  if (subtotalPaise < coupon.minOrderPaise) {
    const minRupees = Math.ceil(coupon.minOrderPaise / 100);
    return {
      ok: false,
      error: {
        code: "COUPON_MIN_ORDER_NOT_MET",
        message: `Minimum order of ₹${minRupees} required for this coupon.`,
        couponCode: normalized,
      },
    };
  }

  // Product/category eligibility: if the coupon restricts to specific products,
  // at least one cart item must match.
  if (coupon.productSlugs && coupon.productSlugs.length > 0) {
    const eligible = productSlugs.some((s) => coupon.productSlugs!.includes(s));
    if (!eligible) {
      return { ok: false, error: { code: "COUPON_NOT_APPLICABLE", message: "This coupon is not applicable to the items in your cart.", couponCode: normalized } };
    }
  }

  let discountPaise: number;
  if (coupon.type === "percent") {
    discountPaise = Math.floor((subtotalPaise * coupon.value) / 100);
  } else {
    // Fixed discount must not exceed the subtotal.
    discountPaise = Math.min(coupon.value, subtotalPaise);
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountPaise,
    },
  };
}
