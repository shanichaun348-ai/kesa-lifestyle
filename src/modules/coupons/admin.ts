import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { countRedemptions, rowToCoupon, type CouponRow } from "@/modules/checkout/coupon-store";
import { couponStatus, type CouponRecord, type CouponStatus } from "@/modules/checkout/coupon-rules";

export type CouponInput = Omit<CouponRecord, "id" | "createdAt" | "updatedAt">;

export type AdminCoupon = CouponRecord & { usageCount: number; status: CouponStatus };

type Result = { ok: true } | { ok: false; error: string };

function toRow(input: CouponInput) {
  return {
    code: input.code,
    description: input.description,
    type: input.type,
    value: input.value,
    min_order_paise: input.minOrderPaise,
    max_discount_paise: input.maxDiscountPaise,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    usage_limit: input.usageLimit,
    per_customer_limit: input.perCustomerLimit,
    first_order_only: input.firstOrderOnly,
    active: input.active,
  };
}

function friendly(message: string, code: string): string {
  if (/coupons_code_unique|duplicate key/i.test(message)) return `The code ${code} already exists.`;
  if (/coupons_window_valid/.test(message)) return "The end date must be after the start date.";
  if (/coupons_value_valid/.test(message)) return "Percent discounts must be 1–100; fixed discounts must be more than ₹0.";
  return message;
}

/** All coupons, newest first, with how often each has been redeemed. */
export async function listCoupons(now = new Date()): Promise<AdminCoupon[]> {
  const db = getSupabaseServiceClient();
  const [{ data: rows, error }, { data: redemptions, error: rErr }] = await Promise.all([
    db.from("coupons").select("*").order("created_at", { ascending: false }),
    db.from("coupon_redemptions").select("coupon_code"),
  ]);
  if (error) throw new Error(`Could not load coupons: ${error.message}`);
  if (rErr) throw new Error(`Could not load redemptions: ${rErr.message}`);
  const usage = new Map<string, number>();
  for (const r of (redemptions ?? []) as Array<{ coupon_code: string }>) usage.set(r.coupon_code, (usage.get(r.coupon_code) ?? 0) + 1);
  return ((rows ?? []) as CouponRow[]).map((r) => {
    const c = rowToCoupon(r);
    const usageCount = usage.get(c.code) ?? 0;
    return { ...c, usageCount, status: couponStatus(c, usageCount, now) };
  });
}

export async function getCoupon(id: string, now = new Date()): Promise<AdminCoupon | null> {
  const { data, error } = await getSupabaseServiceClient().from("coupons").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const c = rowToCoupon(data as CouponRow);
  const usageCount = await countRedemptions(c.code);
  return { ...c, usageCount, status: couponStatus(c, usageCount, now) };
}

export async function createCoupon(input: CouponInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await getSupabaseServiceClient().from("coupons").insert(toRow(input)).select("id").single();
  if (error || !data) return { ok: false, error: friendly(error?.message ?? "Could not save the coupon.", input.code) };
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateCoupon(id: string, input: CouponInput): Promise<Result> {
  const { data, error } = await getSupabaseServiceClient().from("coupons").update(toRow(input)).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: friendly(error.message, input.code) };
  if (!data) return { ok: false, error: "Coupon not found." };
  return { ok: true };
}

export async function setCouponActive(id: string, active: boolean): Promise<Result> {
  const { data, error } = await getSupabaseServiceClient().from("coupons").update({ active }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Coupon not found." };
  return { ok: true };
}

/** Deletes a code that was never redeemed; redeemed codes are kept for order history and must be deactivated instead. */
export async function deleteCoupon(id: string): Promise<Result> {
  const existing = await getCoupon(id);
  if (!existing) return { ok: false, error: "Coupon not found." };
  if (existing.usageCount > 0) return { ok: false, error: `${existing.code} has been used ${existing.usageCount} time${existing.usageCount === 1 ? "" : "s"}, so it stays on record — deactivate it instead.` };
  const { error } = await getSupabaseServiceClient().from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
