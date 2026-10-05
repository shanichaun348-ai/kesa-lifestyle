import { describe, expect, it } from "vitest";

import { allocateProportionally, codAllowed, inclusiveTax, priceCart, type CouponInput, type PricingLineInput } from "@/modules/pricing/engine";
import { DEFAULT_STORE_SETTINGS } from "@/modules/settings/store-settings";

const now = new Date("2026-10-05T10:00:00Z");

const line = (over: Partial<PricingLineInput> = {}): PricingLineInput => ({
  sku: "A",
  productId: "p1",
  quantity: 1,
  unitPricePaise: 129900,
  gstRateBp: 300,
  isOnSale: false,
  categoryIds: ["c1"],
  collectionIds: [],
  ...over,
});

const coupon = (over: Partial<CouponInput> = {}): CouponInput => ({
  id: "cp",
  codeId: "cc",
  code: "WELCOME10",
  kind: "code",
  valueType: "percent",
  value: 1000,
  appliesTo: "order",
  targetProductIds: [],
  targetCollectionIds: [],
  targetCategoryIds: [],
  minSubtotalPaise: 0,
  maxDiscountPaise: null,
  firstOrderOnly: false,
  excludeSaleItems: false,
  usageLimitTotal: null,
  usageLimitPerCustomer: null,
  usageCountTotal: 0,
  usageCountForCustomer: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
  customerHasPriorOrders: null,
  ...over,
});

const base = { coupon: null, shippingMethod: "standard" as const, destinationStateCode: null, paymentMethod: "razorpay" as const, giftWrap: false, settings: DEFAULT_STORE_SETTINGS, now };

describe("inclusive GST", () => {
  it("derives tax from a GST-inclusive amount", () => {
    expect(inclusiveTax(103000, 300)).toBe(3000);
    expect(inclusiveTax(0, 300)).toBe(0);
  });

  it("splits CGST/SGST intra-state and IGST inter-state", () => {
    const intra = priceCart({ ...base, lines: [line()], destinationStateCode: "MH" });
    expect(intra.taxBreakdown.igstPaise).toBe(0);
    expect(intra.taxBreakdown.cgstPaise + intra.taxBreakdown.sgstPaise).toBe(intra.taxPaise);
    const inter = priceCart({ ...base, lines: [line()], destinationStateCode: "KA" });
    expect(inter.taxBreakdown.igstPaise).toBe(inter.taxPaise);
    expect(inter.taxBreakdown.splitKnown).toBe(true);
  });
});

describe("shipping, fees and totals", () => {
  it("charges the flat rate under the threshold and nothing above it", () => {
    const small = priceCart({ ...base, lines: [line({ unitPricePaise: 49900 })] });
    expect(small.shippingPaise).toBe(DEFAULT_STORE_SETTINGS.shipping.flatRatePaise);
    const big = priceCart({ ...base, lines: [line()] });
    expect(big.shippingPaise).toBe(0);
    expect(big.totalPaise).toBe(129900);
  });

  it("adds the express surcharge, COD fee and gift wrap", () => {
    const r = priceCart({ ...base, lines: [line()], shippingMethod: "express", paymentMethod: "cod", giftWrap: true });
    expect(r.shippingPaise).toBe(DEFAULT_STORE_SETTINGS.shipping.expressSurchargePaise);
    expect(r.codFeePaise).toBe(DEFAULT_STORE_SETTINGS.cod.feePaise);
    expect(r.giftWrapPaise).toBe(DEFAULT_STORE_SETTINGS.giftWrap.feePaise);
    expect(r.totalPaise).toBe(129900 + r.shippingPaise + r.codFeePaise + r.giftWrapPaise);
  });

  it("an empty cart costs nothing", () => {
    const r = priceCart({ ...base, lines: [] });
    expect(r.totalPaise).toBe(0);
    expect(r.shippingPaise).toBe(0);
  });
});

describe("coupons", () => {
  it("applies a percentage and allocates it across lines without losing paise", () => {
    const lines = [line({ sku: "A", unitPricePaise: 33333, quantity: 1 }), line({ sku: "B", productId: "p2", unitPricePaise: 33333, quantity: 2 })];
    const r = priceCart({ ...base, lines, coupon: coupon() });
    expect(r.coupon?.applied).toBe(true);
    expect(r.discountPaise).toBe(Math.round((33333 * 3 * 1000) / 10000));
    expect(r.lines.reduce((n, l) => n + l.discountPaise, 0)).toBe(r.discountPaise);
  });

  it("scopes to targeted categories and respects the cap", () => {
    const lines = [line({ sku: "A", categoryIds: ["earrings"] }), line({ sku: "B", productId: "p2", categoryIds: ["chains"], unitPricePaise: 50000 })];
    const r = priceCart({ ...base, lines, coupon: coupon({ appliesTo: "categories", targetCategoryIds: ["earrings"], valueType: "fixed", value: 50000, maxDiscountPaise: 20000 }) });
    expect(r.discountPaise).toBe(20000);
    expect(r.lines.find((l) => l.sku === "B")?.discountPaise).toBe(0);
  });

  it("rejects with specific reasons", () => {
    const l = [line()];
    expect(priceCart({ ...base, lines: l, coupon: coupon({ isActive: false }) }).coupon).toMatchObject({ applied: false, reason: "inactive" });
    expect(priceCart({ ...base, lines: l, coupon: coupon({ endsAt: "2026-01-01T00:00:00Z" }) }).coupon).toMatchObject({ applied: false, reason: "expired" });
    expect(priceCart({ ...base, lines: l, coupon: coupon({ minSubtotalPaise: 200000 }) }).coupon).toMatchObject({ applied: false, reason: "min_subtotal" });
    expect(priceCart({ ...base, lines: l, coupon: coupon({ firstOrderOnly: true, customerHasPriorOrders: true }) }).coupon).toMatchObject({ applied: false, reason: "first_order_only" });
    expect(priceCart({ ...base, lines: l, coupon: coupon({ usageLimitTotal: 5, usageCountTotal: 5 }) }).coupon).toMatchObject({ applied: false, reason: "usage_limit_total" });
    expect(priceCart({ ...base, lines: l, coupon: coupon({ appliesTo: "products", targetProductIds: ["other"] }) }).coupon).toMatchObject({ applied: false, reason: "no_eligible_items" });
    expect(priceCart({ ...base, lines: [line({ isOnSale: true })], coupon: coupon({ excludeSaleItems: true }) }).coupon).toMatchObject({ applied: false, reason: "no_eligible_items" });
  });

  it("free shipping coupons zero standard shipping", () => {
    const r = priceCart({ ...base, lines: [line({ unitPricePaise: 49900 })], coupon: coupon({ valueType: "free_shipping", value: 0 }) });
    expect(r.shippingPaise).toBe(0);
    expect(r.discountPaise).toBe(0);
  });

  it("taxes the discounted amount", () => {
    const r = priceCart({ ...base, lines: [line({ unitPricePaise: 103000 })], coupon: coupon({ valueType: "fixed", value: 3000 }) });
    expect(r.taxPaise).toBe(inclusiveTax(100000, 300));
  });
});

describe("allocateProportionally", () => {
  it("sums exactly to the total", () => {
    const parts = allocateProportionally([10, 10, 10], 10);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10);
    expect(allocateProportionally([0, 0], 5)).toEqual([0, 0]);
  });
});

describe("cash on delivery", () => {
  it("respects the cap and the pincode", () => {
    const small = priceCart({ ...base, lines: [line()], paymentMethod: "cod" });
    expect(codAllowed(small, DEFAULT_STORE_SETTINGS, true).allowed).toBe(true);
    expect(codAllowed(small, DEFAULT_STORE_SETTINGS, false).allowed).toBe(false);
    const big = priceCart({ ...base, lines: [line({ unitPricePaise: 300000 })], paymentMethod: "cod" });
    expect(codAllowed(big, DEFAULT_STORE_SETTINGS, true).allowed).toBe(false);
  });
});
