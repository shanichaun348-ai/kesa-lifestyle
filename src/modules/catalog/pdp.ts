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

export type BenefitLine = { key: "shipping" | "payment" | "returns"; title: string; detail: string };

export type HighlightIconKey = "gem" | "sparkles" | "feather" | "gift" | "shield" | "leaf" | "hand" | "star";
export type HighlightIcon = { icon: HighlightIconKey; lines: [string, string]; text: string };

const HIGHLIGHT_ICON_RULES: Array<[RegExp, HighlightIconKey]> = [
  [/\b(gold|plated|plating|brass|silver)\b/i, "gem"],
  [/\b(charm|charms|colou?r|colou?rful|multicolou?r|stone|stones|crystal|crystals|cz|zircon)\b/i, "sparkles"],
  [/\b(light|lightweight|weight|comfort|comfortable|feather)\b/i, "feather"],
  [/\b(gift|gifting|gifts)\b/i, "gift"],
  [/\b(tarnish|anti-tarnish|water|durable|long-lasting|lasting)\b/i, "shield"],
  [/\b(skin|hypoallergenic|hypo|nickel)\b/i, "leaf"],
  [/\b(handmade|hand-made|handcrafted|crafted|craft|artisan)\b/i, "hand"],
];

/** Connector words that read badly stranded at the end of a line. */
const CONNECTORS = new Set(["&", "and", "for", "of", "in", "with", "to", "the", "a", "on", "or"]);

/** Splits a short phrase onto two lines at the word nearest the midpoint, never ending line one on a connector. */
export function splitLabel(text: string): [string, string] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [words[0] ?? "", ""];
  const total = words.join(" ").length;
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    if (CONNECTORS.has(words[i - 1]!.toLowerCase())) continue;
    const first = words.slice(0, i).join(" ").length;
    const diff = Math.abs(first - (total - first));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Up to four highlights as icon tiles; the icon is picked from keywords in the text. */
export function highlightIcons(highlights: readonly string[], max = 4): HighlightIcon[] {
  return highlights
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((text) => {
      const match = HIGHLIGHT_ICON_RULES.find(([re]) => re.test(text));
      return { icon: match ? match[1] : "star", lines: splitLabel(text), text };
    });
}

/** Store promises as stated on the shipping and returns policy pages and the homepage. */
export const STORE_PROMISES = {
  freeShippingOverPaise: 99900,
  shippingFeeBelowPaise: 5900,
  dispatchDays: "1–2 business days",
  deliveryDays: "3–5 business days",
  returnWindowDays: 7,
} as const;

export const RETURNS_COPY: Record<ReturnPolicy, { title: string; detail: string }> = {
  returnable: { title: "Easy returns", detail: "7-day policy" },
  exchange_only: { title: "Exchange only", detail: "Hygiene item, 7 days" },
  final_sale: { title: "Final sale", detail: "No returns or exchanges" },
};

/** The three-item promise strip under the purchase controls: shipping, payment, returns. */
export function benefitLines(returnPolicy: ReturnPolicy): BenefitLine[] {
  const r = RETURNS_COPY[returnPolicy];
  return [
    { key: "shipping", title: "Free shipping", detail: "on orders above ₹999" },
    { key: "payment", title: "Secure payment", detail: "Razorpay" },
    { key: "returns", title: r.title, detail: r.detail },
  ];
}
