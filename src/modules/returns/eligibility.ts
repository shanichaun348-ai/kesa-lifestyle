import type { ReturnPolicy } from "@/modules/catalog/types";

import { RETURN_WINDOW_DAYS, type ReturnKind } from "./types";

/** The slice of an order the rules need. `delivered` is the live DELIVERED status. */
export type EligibilityOrder = {
  delivered: boolean;
  deliveredAt: string | null;
  updatedAt: string;
  items: Array<{ sku: string; productName: string; quantity: number }>;
};

export type ItemEligibility = {
  sku: string;
  productName: string;
  quantity: number;
  eligible: boolean;
  allowedKinds: ReturnKind[];
  reason: string | null;
};

export type ReturnEligibility = {
  eligible: boolean;
  /** Why nothing on the order can be returned right now; null when eligible. */
  reason: string | null;
  windowEndsAt: string | null;
  items: ItemEligibility[];
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function itemRule(policy: ReturnPolicy | undefined): Pick<ItemEligibility, "eligible" | "allowedKinds" | "reason"> {
  switch (policy) {
    case "final_sale":
      return { eligible: false, allowedKinds: [], reason: "Final sale — not eligible for return or exchange" };
    case "exchange_only":
      return { eligible: true, allowedKinds: ["exchange"], reason: "Exchange only (hygiene item)" };
    default:
      return { eligible: true, allowedKinds: ["return", "exchange"], reason: null };
  }
}

/**
 * Pure return-policy decision for one order: delivered, inside the 7-day
 * window from delivery, no request already open, and per item the product's
 * own policy (final sale excluded, hygiene items exchange-only).
 */
export function returnEligibility(
  order: EligibilityOrder,
  policies: ReadonlyMap<string, ReturnPolicy | undefined>,
  hasOpenRequest: boolean,
  now: Date = new Date(),
): ReturnEligibility {
  const items: ItemEligibility[] = order.items.map((i) => ({ sku: i.sku, productName: i.productName, quantity: i.quantity, ...itemRule(policies.get(i.sku)) }));
  const deliveredAt = order.deliveredAt ?? (order.delivered ? order.updatedAt : null);
  const windowEndsAt = deliveredAt ? new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * 86_400_000).toISOString() : null;

  const blocked = (reason: string): ReturnEligibility => ({ eligible: false, reason, windowEndsAt, items: items.map((i) => ({ ...i, eligible: false, allowedKinds: [] })) });

  if (!order.delivered) return blocked("Returns and exchanges can be requested once the order has been delivered.");
  if (hasOpenRequest) return blocked("A return or exchange request is already open for this order.");
  if (windowEndsAt && new Date(windowEndsAt).getTime() < now.getTime()) {
    return blocked(`The ${RETURN_WINDOW_DAYS}-day return window closed on ${dateFormat.format(new Date(windowEndsAt))}.`);
  }
  if (!items.some((i) => i.eligible)) return blocked("The pieces in this order are final sale and cannot be returned or exchanged.");
  return { eligible: true, reason: null, windowEndsAt, items };
}

/** Which kinds the whole request may use, given the items the customer picked. */
export function allowedKindsFor(items: ItemEligibility[], skus: string[]): ReturnKind[] {
  const picked = items.filter((i) => skus.includes(i.sku));
  if (picked.length === 0) return [];
  return (["return", "exchange"] as ReturnKind[]).filter((k) => picked.every((i) => i.allowedKinds.includes(k)));
}
