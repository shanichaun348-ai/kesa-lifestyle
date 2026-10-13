/**
 * Pure presentation decisions for the product detail page: which badges to
 * show, the discount percentage, and the benefit lines derived from the
 * store policies and the product's return policy. Kept free of I/O so it can
 * be unit-tested and shared by the page and the benefits strip.
 */
import { percentOff } from "@/lib/money";

import { isBestseller, isInStock, isNewArrival } from "./listing";
import type { Product, ReturnPolicy } from "./types";

export type PdpBadgeTone = "gold" | "muted" | "warning" | "danger";
export type PdpBadge = { label: string; tone: PdpBadgeTone };

/** Total units across variants; "Only N left" is judged on this. */
export function totalStock(product: Pick<Product, "variants">): number {
  return product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

/** Badges for the product header, in display order. Sold out suppresses the others. */
export function pdpBadges(product: Product, now: Date): PdpBadge[] {
  if (!isInStock(product)) return [{ label: "Sold out", tone: "danger" }];
  const badges: PdpBadge[] = [];
  if (isNewArrival(product, now)) badges.push({ label: "New", tone: "gold" });
  if (isBestseller(product)) badges.push({ label: "Bestseller", tone: "muted" });
  const stock = totalStock(product);
  if (stock > 0 && stock <= product.lowStockThreshold) badges.push({ label: `Only ${stock} left`, tone: "warning" });
  return badges;
}

/** Whole-number saving when a compare-at price is genuinely higher; otherwise null. */
export function discountPercent(pricePaise: number, compareAtPaise: number | undefined): number | null {
  if (compareAtPaise === undefined) return null;
  return percentOff(compareAtPaise, pricePaise);
}

export type BenefitLine = { key: "shipping" | "returns" | "payment" | "quality"; title: string; detail: string };

/** Store promises as stated on the shipping and returns policy pages and the homepage. */
export const STORE_PROMISES = {
  freeShippingOverPaise: 99900,
  shippingFeeBelowPaise: 5900,
  dispatchDays: "1–2 business days",
  deliveryDays: "3–5 business days",
  returnWindowDays: 7,
} as const;

export const RETURNS_COPY: Record<ReturnPolicy, { title: string; detail: string }> = {
  returnable: { title: "7-day easy returns", detail: "Unworn pieces with tags; refund to the original payment method." },
  exchange_only: { title: "Exchange only", detail: "Hygiene item. Exchanged for size or style; damaged or incorrect items replaced free." },
  final_sale: { title: "Final sale", detail: "Not eligible for return or exchange, except if damaged or incorrect." },
};

export function benefitLines(returnPolicy: ReturnPolicy): BenefitLine[] {
  const r = RETURNS_COPY[returnPolicy];
  return [
    { key: "shipping", title: "Free shipping over ₹999", detail: `₹59 below. Dispatched in ${STORE_PROMISES.dispatchDays}.` },
    { key: "returns", title: r.title, detail: r.detail },
    { key: "payment", title: "Secure payments", detail: "UPI, cards and netbanking via Razorpay; cash on delivery available." },
    { key: "quality", title: "Anti-tarnish, skin-friendly", detail: "Nickel-safe, hypoallergenic base metals." },
  ];
}
