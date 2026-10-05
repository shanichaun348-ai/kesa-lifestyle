/**
 * Server-side pricing engine (docs/08 §2, §10; ADR-21).
 *
 * Pure and deterministic: given lines, an optional coupon, shipping choice,
 * destination and settings, it returns every amount the order needs. The
 * browser never sends amounts; it only sends SKUs, quantities and choices.
 *
 * All money is integer paise. Prices are GST-inclusive; tax is derived.
 */
import type { StoreSettings } from "@/modules/settings/store-settings";

export type ShippingMethod = "standard" | "express";
export type PaymentMethod = "razorpay" | "cod";

export type PricingLineInput = {
  sku: string;
  productId: string;
  quantity: number;
  unitPricePaise: number;
  compareAtPaise?: number | undefined;
  gstRateBp: number;
  /** True when the unit price is a scheduled sale price. */
  isOnSale: boolean;
  categoryIds: string[];
  collectionIds: string[];
};

export type CouponInput = {
  id: string;
  codeId: string;
  code: string;
  kind: "code" | "automatic";
  valueType: "percent" | "fixed" | "free_shipping" | "bxgy";
  /** Basis points for percent, paise for fixed. */
  value: number;
  appliesTo: "order" | "products" | "collections" | "categories";
  targetProductIds: string[];
  targetCollectionIds: string[];
  targetCategoryIds: string[];
  minSubtotalPaise: number;
  maxDiscountPaise: number | null;
  firstOrderOnly: boolean;
  excludeSaleItems: boolean;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  usageCountTotal: number;
  usageCountForCustomer: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  /** Null when unknown (guest); first-order-only coupons then require checkout-time verification. */
  customerHasPriorOrders: boolean | null;
};

export type PricingInput = {
  lines: PricingLineInput[];
  coupon: CouponInput | null;
  shippingMethod: ShippingMethod;
  /** Two-letter state code of the shipping address; null when not yet known. */
  destinationStateCode: string | null;
  paymentMethod: PaymentMethod;
  giftWrap: boolean;
  settings: StoreSettings;
  now: Date;
};

export type CouponRejectReason =
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "first_order_only"
  | "usage_limit_total"
  | "usage_limit_customer"
  | "no_eligible_items"
  | "unsupported";

export type CouponOutcome =
  | { applied: true; code: string; discountPaise: number; freeShipping: boolean }
  | { applied: false; code: string; reason: CouponRejectReason };

export type PricedLine = PricingLineInput & {
  lineSubtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  taxPaise: number;
  lineTotalPaise: number;
};

export type PricingResult = {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  giftWrapPaise: number;
  /** Included in the total, shown for transparency and invoices. */
  taxPaise: number;
  taxBreakdown: { cgstPaise: number; sgstPaise: number; igstPaise: number; splitKnown: boolean };
  totalPaise: number;
  coupon: CouponOutcome | null;
};

export const COUPON_REASON_COPY: Record<CouponRejectReason, string> = {
  inactive: "This code is no longer active.",
  not_started: "This code is not active yet.",
  expired: "This code has expired.",
  min_subtotal: "Your bag does not meet the minimum order value for this code.",
  first_order_only: "This code is for first orders only.",
  usage_limit_total: "This code has reached its usage limit.",
  usage_limit_customer: "You have already used this code.",
  no_eligible_items: "This code does not apply to the items in your bag.",
  unsupported: "This code cannot be applied online.",
};

function lineIsEligible(line: PricingLineInput, coupon: CouponInput): boolean {
  if (coupon.excludeSaleItems && line.isOnSale) return false;
  switch (coupon.appliesTo) {
    case "order":
      return true;
    case "products":
      return coupon.targetProductIds.includes(line.productId);
    case "collections":
      return line.collectionIds.some((c) => coupon.targetCollectionIds.includes(c));
    case "categories":
      return line.categoryIds.some((c) => coupon.targetCategoryIds.includes(c));
  }
}

/** Allocate a discount across lines proportionally; remainder paise go to the largest lines first. */
export function allocateProportionally(amounts: number[], total: number): number[] {
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return amounts.map(() => 0);
  const raw = amounts.map((a) => (a * total) / sum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remainder -= 1;
  }
  return floors;
}

function evaluateCoupon(coupon: CouponInput, lines: PricingLineInput[], subtotal: number, now: Date): CouponOutcome & { eligibleIndexes: number[] } {
  const reject = (reason: CouponRejectReason) => ({ applied: false as const, code: coupon.code, reason, eligibleIndexes: [] as number[] });
  if (!coupon.isActive) return reject("inactive");
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return reject("not_started");
  if (coupon.endsAt && new Date(coupon.endsAt) < now) return reject("expired");
  if (coupon.valueType === "bxgy") return reject("unsupported");
  if (subtotal < coupon.minSubtotalPaise) return reject("min_subtotal");
  if (coupon.firstOrderOnly && coupon.customerHasPriorOrders === true) return reject("first_order_only");
  if (coupon.usageLimitTotal !== null && coupon.usageCountTotal >= coupon.usageLimitTotal) return reject("usage_limit_total");
  if (coupon.usageLimitPerCustomer !== null && coupon.usageCountForCustomer >= coupon.usageLimitPerCustomer) return reject("usage_limit_customer");

  const eligibleIndexes = lines.map((l, i) => (lineIsEligible(l, coupon) ? i : -1)).filter((i) => i >= 0);
  if (coupon.valueType !== "free_shipping" && eligibleIndexes.length === 0) return reject("no_eligible_items");

  const eligibleSubtotal = eligibleIndexes.reduce((n, i) => n + (lines[i]?.unitPricePaise ?? 0) * (lines[i]?.quantity ?? 0), 0);
  let discount = 0;
  if (coupon.valueType === "percent") discount = Math.round((eligibleSubtotal * coupon.value) / 10000);
  else if (coupon.valueType === "fixed") discount = Math.min(coupon.value, eligibleSubtotal);
  if (coupon.maxDiscountPaise !== null) discount = Math.min(discount, coupon.maxDiscountPaise);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  return { applied: true, code: coupon.code, discountPaise: discount, freeShipping: coupon.valueType === "free_shipping", eligibleIndexes };
}

export function inclusiveTax(amountPaise: number, gstRateBp: number): number {
  if (amountPaise <= 0 || gstRateBp <= 0) return 0;
  return Math.round((amountPaise * gstRateBp) / (10000 + gstRateBp));
}

export function priceCart(input: PricingInput): PricingResult {
  const { lines, settings } = input;
  const subtotal = lines.reduce((n, l) => n + l.unitPricePaise * l.quantity, 0);

  const couponEval = input.coupon ? evaluateCoupon(input.coupon, lines, subtotal, input.now) : null;
  const discountTotal = couponEval?.applied ? couponEval.discountPaise : 0;
  const eligible = couponEval?.applied ? couponEval.eligibleIndexes : [];
  const allocation = allocateProportionally(
    eligible.map((i) => (lines[i]?.unitPricePaise ?? 0) * (lines[i]?.quantity ?? 0)),
    discountTotal,
  );
  const discountByIndex = new Map(eligible.map((i, k) => [i, allocation[k] ?? 0]));

  const splitKnown = input.destinationStateCode !== null;
  const intraState = splitKnown && input.destinationStateCode === settings.tax.originStateCode;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const priced: PricedLine[] = lines.map((line, i) => {
    const lineSubtotal = line.unitPricePaise * line.quantity;
    const discount = discountByIndex.get(i) ?? 0;
    const taxable = lineSubtotal - discount;
    const tax = inclusiveTax(taxable, line.gstRateBp);
    if (intraState) {
      const half = Math.floor(tax / 2);
      cgst += half;
      sgst += tax - half;
    } else {
      igst += tax;
    }
    return { ...line, lineSubtotalPaise: lineSubtotal, discountPaise: discount, taxablePaise: taxable, taxPaise: tax, lineTotalPaise: taxable };
  });

  const afterDiscount = subtotal - discountTotal;
  const freeShipping = (couponEval?.applied && couponEval.freeShipping) || afterDiscount >= settings.shipping.freeShippingThresholdPaise;
  let shipping = lines.length === 0 ? 0 : freeShipping ? 0 : settings.shipping.flatRatePaise;
  if (input.shippingMethod === "express" && lines.length > 0) shipping += settings.shipping.expressSurchargePaise;

  const codFee = input.paymentMethod === "cod" && settings.cod.enabled ? settings.cod.feePaise : 0;
  const giftWrap = input.giftWrap && settings.giftWrap.enabled ? settings.giftWrap.feePaise : 0;
  const tax = priced.reduce((n, l) => n + l.taxPaise, 0);

  const outcome: CouponOutcome | null = couponEval
    ? couponEval.applied
      ? { applied: true, code: couponEval.code, discountPaise: couponEval.discountPaise, freeShipping: couponEval.freeShipping }
      : { applied: false, code: couponEval.code, reason: couponEval.reason }
    : null;

  return {
    lines: priced,
    subtotalPaise: subtotal,
    discountPaise: discountTotal,
    shippingPaise: shipping,
    codFeePaise: codFee,
    giftWrapPaise: giftWrap,
    taxPaise: tax,
    taxBreakdown: { cgstPaise: cgst, sgstPaise: sgst, igstPaise: igst, splitKnown },
    totalPaise: afterDiscount + shipping + codFee + giftWrap,
    coupon: outcome,
  };
}

/** Cash on delivery eligibility from settings and the priced total. */
export function codAllowed(pricing: PricingResult, settings: StoreSettings, pincodeCodAvailable: boolean | null): { allowed: boolean; reason?: string } {
  if (!settings.cod.enabled) return { allowed: false, reason: "Cash on delivery is not available right now." };
  if (pincodeCodAvailable === false) return { allowed: false, reason: "Cash on delivery is not available for this pincode." };
  const prepaidTotal = pricing.totalPaise - pricing.codFeePaise;
  if (prepaidTotal > settings.cod.capPaise) return { allowed: false, reason: `Cash on delivery is available for orders up to ₹${Math.floor(settings.cod.capPaise / 100).toLocaleString("en-IN")}.` };
  return { allowed: true };
}
