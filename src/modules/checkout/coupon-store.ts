import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { listOrdersForCustomer, PAID_STATUSES } from "@/modules/admin/orders-data";

import type { CouponContext, CouponRecord } from "./coupon-rules";

export type CouponRow = {
  id: string;
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  min_order_paise: number;
  max_discount_paise: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  first_order_only: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function rowToCoupon(r: CouponRow): CouponRecord {
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    type: r.type,
    value: Number(r.value),
    minOrderPaise: Number(r.min_order_paise),
    maxDiscountPaise: r.max_discount_paise === null ? null : Number(r.max_discount_paise),
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    usageLimit: r.usage_limit,
    perCustomerLimit: r.per_customer_limit,
    firstOrderOnly: r.first_order_only,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** How many times a code has been redeemed, optionally by one customer. */
export async function countRedemptions(code: string, customerEmail?: string): Promise<number> {
  let q = getSupabaseServiceClient().from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_code", code);
  if (customerEmail) q = q.eq("customer_email", customerEmail.toLowerCase());
  const { count, error } = await q;
  if (error) throw new Error(`Could not count redemptions: ${error.message}`);
  return count ?? 0;
}

/**
 * Everything the pure rules need for one code: the coupon row and the usage
 * facts about this customer. Only looks at orders when the rule needs it.
 */
export async function loadCouponContext(code: string, customerEmail: string | undefined, now: Date, subtotalPaise: number): Promise<CouponContext> {
  const base: CouponContext = { coupon: null, code, subtotalPaise, now, totalRedemptions: 0, customerRedemptions: 0, customerHasPriorPaidOrder: false };

  const { data, error } = await getSupabaseServiceClient().from("coupons").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(`Could not read coupon: ${error.message}`);
  if (!data) return base;
  const coupon = rowToCoupon(data as CouponRow);

  const email = customerEmail?.trim().toLowerCase() || undefined;
  const [totalRedemptions, customerRedemptions, customerHasPriorPaidOrder] = await Promise.all([
    coupon.usageLimit !== null ? countRedemptions(code) : Promise.resolve(0),
    coupon.perCustomerLimit !== null && email ? countRedemptions(code, email) : Promise.resolve(0),
    coupon.firstOrderOnly && email ? listOrdersForCustomer(email).then((orders) => orders.some((o) => PAID_STATUSES.has(o.status))) : Promise.resolve(false),
  ]);

  return { ...base, coupon, totalRedemptions, customerRedemptions, customerHasPriorPaidOrder };
}
