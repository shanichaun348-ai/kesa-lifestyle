/**
 * Pure coupon rules. The database/seed access lives in coupon-store.ts and
 * coupon.ts; everything here is deterministic given its inputs, so the
 * tests cover every rejection reason without a database.
 */
import type { AppliedCoupon, PricingError } from "./types";

export type CouponType = "percent" | "fixed";

/** One discount code as stored in the `coupons` table (or mapped from the dev seed). */
export type CouponRecord = {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  /** Percent 1–100, or paise for fixed. */
  value: number;
  minOrderPaise: number;
  /** Cap for percent discounts, in paise. */
  maxDiscountPaise: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CouponContext = {
  /** Null when no coupon has that code. */
  coupon: CouponRecord | null;
  /** The code as the customer typed it, normalised. */
  code: string;
  /** Merchandise subtotal before discount, in paise. */
  subtotalPaise: number;
  now: Date;
  /** Redemptions of this code so far, all customers. */
  totalRedemptions: number;
  /** Redemptions of this code by this customer (0 when the email is unknown). */
  customerRedemptions: number;
  /** Whether this customer has any earlier paid order (false when the email is unknown). */
  customerHasPriorPaidOrder: boolean;
};

export type CouponEvaluation = { ok: true; coupon: AppliedCoupon } | { ok: false; error: PricingError };

export const CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

const rupees = (paise: number) => `₹${Math.ceil(paise / 100).toLocaleString("en-IN")}`;

/** Apply every rule in order and compute the discount. Never throws. */
export function evaluateCoupon(ctx: CouponContext): CouponEvaluation {
  const code = normaliseCode(ctx.code);
  const reject = (errorCode: PricingError["code"], message: string): CouponEvaluation => ({ ok: false, error: { code: errorCode, message, couponCode: code } });

  const c = ctx.coupon;
  if (!c) return reject("COUPON_NOT_FOUND", `We don't recognise the code "${code}".`);
  if (!c.active) return reject("COUPON_INACTIVE", "This code is not active right now.");

  const now = ctx.now.getTime();
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return reject("COUPON_NOT_STARTED", "This code isn't valid yet — check back soon.");
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return reject("COUPON_EXPIRED", "This code has expired.");

  if (c.usageLimit !== null && ctx.totalRedemptions >= c.usageLimit) return reject("COUPON_USAGE_LIMIT_REACHED", "This code has been fully redeemed.");
  if (c.firstOrderOnly && ctx.customerHasPriorPaidOrder) return reject("COUPON_FIRST_ORDER_ONLY", "This code is for first orders only.");
  if (c.perCustomerLimit !== null && ctx.customerRedemptions >= c.perCustomerLimit) {
    return reject("COUPON_PER_CUSTOMER_LIMIT_REACHED", c.perCustomerLimit === 1 ? "You've already used this code." : `This code can be used ${c.perCustomerLimit} times per customer.`);
  }

  if (ctx.subtotalPaise < c.minOrderPaise) {
    const shortfall = c.minOrderPaise - ctx.subtotalPaise;
    return reject("COUPON_MIN_ORDER_NOT_MET", `Add ${rupees(shortfall)} more to use this code (minimum order ${rupees(c.minOrderPaise)}).`);
  }

  let discountPaise: number;
  if (c.type === "percent") {
    discountPaise = Math.floor((ctx.subtotalPaise * c.value) / 100);
    if (c.maxDiscountPaise !== null) discountPaise = Math.min(discountPaise, c.maxDiscountPaise);
  } else {
    discountPaise = Math.min(c.value, ctx.subtotalPaise);
  }

  return { ok: true, coupon: { id: c.id, code: c.code, type: c.type, value: c.value, discountPaise } };
}

export type CouponStatus = "active" | "inactive" | "scheduled" | "expired" | "exhausted";

/** Lifecycle state shown in the admin list. */
export function couponStatus(c: CouponRecord, usageCount: number, now: Date): CouponStatus {
  if (!c.active) return "inactive";
  const t = now.getTime();
  if (c.endsAt && new Date(c.endsAt).getTime() <= t) return "expired";
  if (c.usageLimit !== null && usageCount >= c.usageLimit) return "exhausted";
  if (c.startsAt && new Date(c.startsAt).getTime() > t) return "scheduled";
  return "active";
}

/** Short human label for the discount, e.g. "10% off" or "₹200 off". */
export function describeDiscount(c: Pick<CouponRecord, "type" | "value" | "maxDiscountPaise">): string {
  if (c.type === "percent") return c.maxDiscountPaise ? `${c.value}% off (up to ${rupees(c.maxDiscountPaise)})` : `${c.value}% off`;
  return `${rupees(c.value)} off`;
}
