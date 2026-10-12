import { describe, expect, it } from "vitest";

import { couponStatus, describeDiscount, evaluateCoupon, normaliseCode, type CouponContext, type CouponRecord } from "@/modules/checkout/coupon-rules";

const now = new Date("2026-10-12T10:00:00Z");
const hour = 3_600_000;

const record = (over: Partial<CouponRecord> = {}): CouponRecord => ({
  id: "c1",
  code: "FIRST100",
  description: "",
  type: "fixed",
  value: 10000,
  minOrderPaise: 0,
  maxDiscountPaise: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perCustomerLimit: null,
  firstOrderOnly: false,
  active: true,
  ...over,
});

const ctx = (over: Partial<CouponContext> = {}): CouponContext => ({
  coupon: record(),
  code: "FIRST100",
  subtotalPaise: 150000,
  now,
  totalRedemptions: 0,
  customerRedemptions: 0,
  customerHasPriorPaidOrder: false,
  ...over,
});

const reason = (c: CouponContext) => {
  const r = evaluateCoupon(c);
  return r.ok ? "ok" : r.error.code;
};

describe("evaluateCoupon", () => {
  it("applies a fixed discount and never exceeds the subtotal", () => {
    const r = evaluateCoupon(ctx());
    expect(r.ok && r.coupon.discountPaise).toBe(10000);
    const capped = evaluateCoupon(ctx({ subtotalPaise: 4000 }));
    expect(capped.ok && capped.coupon.discountPaise).toBe(4000);
  });

  it("applies a percent discount, floored, with an optional cap", () => {
    const r = evaluateCoupon(ctx({ coupon: record({ type: "percent", value: 15 }), subtotalPaise: 99999 }));
    expect(r.ok && r.coupon.discountPaise).toBe(14999);
    const capped = evaluateCoupon(ctx({ coupon: record({ type: "percent", value: 50, maxDiscountPaise: 20000 }) }));
    expect(capped.ok && capped.coupon.discountPaise).toBe(20000);
  });

  it("rejects unknown, inactive, not-yet-started and expired codes in that order", () => {
    expect(reason(ctx({ coupon: null }))).toBe("COUPON_NOT_FOUND");
    expect(reason(ctx({ coupon: record({ active: false, endsAt: new Date(now.getTime() - hour).toISOString() }) }))).toBe("COUPON_INACTIVE");
    expect(reason(ctx({ coupon: record({ startsAt: new Date(now.getTime() + hour).toISOString() }) }))).toBe("COUPON_NOT_STARTED");
    expect(reason(ctx({ coupon: record({ endsAt: new Date(now.getTime() - 1).toISOString() }) }))).toBe("COUPON_EXPIRED");
    expect(reason(ctx({ coupon: record({ endsAt: new Date(now.getTime() + hour).toISOString() }) }))).toBe("ok");
  });

  it("enforces total, first-order and per-customer limits", () => {
    expect(reason(ctx({ coupon: record({ usageLimit: 5 }), totalRedemptions: 5 }))).toBe("COUPON_USAGE_LIMIT_REACHED");
    expect(reason(ctx({ coupon: record({ usageLimit: 5 }), totalRedemptions: 4 }))).toBe("ok");
    expect(reason(ctx({ coupon: record({ firstOrderOnly: true }), customerHasPriorPaidOrder: true }))).toBe("COUPON_FIRST_ORDER_ONLY");
    expect(reason(ctx({ coupon: record({ firstOrderOnly: true }) }))).toBe("ok");
    expect(reason(ctx({ coupon: record({ perCustomerLimit: 1 }), customerRedemptions: 1 }))).toBe("COUPON_PER_CUSTOMER_LIMIT_REACHED");
  });

  it("explains how much more to add when the minimum is not met", () => {
    const r = evaluateCoupon(ctx({ coupon: record({ minOrderPaise: 99900 }), subtotalPaise: 50000 }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
      expect(r.error.message).toContain("₹499");
      expect(r.error.couponCode).toBe("FIRST100");
    }
  });

  it("normalises codes", () => {
    expect(normaliseCode("  first100 ")).toBe("FIRST100");
  });
});

describe("couponStatus", () => {
  it("derives the lifecycle state", () => {
    expect(couponStatus(record({ active: false }), 0, now)).toBe("inactive");
    expect(couponStatus(record({ endsAt: new Date(now.getTime() - 1).toISOString() }), 0, now)).toBe("expired");
    expect(couponStatus(record({ usageLimit: 2 }), 2, now)).toBe("exhausted");
    expect(couponStatus(record({ startsAt: new Date(now.getTime() + hour).toISOString() }), 0, now)).toBe("scheduled");
    expect(couponStatus(record(), 1, now)).toBe("active");
  });
});

describe("describeDiscount", () => {
  it("labels percent and fixed discounts", () => {
    expect(describeDiscount(record({ type: "percent", value: 10, maxDiscountPaise: null }))).toBe("10% off");
    expect(describeDiscount(record({ type: "percent", value: 10, maxDiscountPaise: 30000 }))).toBe("10% off (up to ₹300)");
    expect(describeDiscount(record({ type: "fixed", value: 20000 }))).toBe("₹200 off");
  });
});
