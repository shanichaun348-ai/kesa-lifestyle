import "server-only";

import type { AdminOrder } from "@/modules/admin/orders-data";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { ReturnPolicy } from "@/modules/catalog/types";

import { returnEligibility, type ReturnEligibility } from "./eligibility";
import { listRequestsForOrder } from "./supabase-returns";
import { OPEN_RETURN_STATUSES, type ReturnRequest } from "./types";

export type ReturnContext = { eligibility: ReturnEligibility; requests: ReturnRequest[] };

/** Product return policies for the SKUs on an order; unknown SKUs fall back to "returnable". */
export async function policiesForOrder(order: Pick<AdminOrder, "items">): Promise<Map<string, ReturnPolicy | undefined>> {
  const skus = order.items.map((i) => i.sku);
  const found = await getCatalogRepository().getProductsBySku(skus);
  return new Map(skus.map((sku) => [sku, found.get(sku)?.product.returnPolicy]));
}

/** Everything a page needs to offer (or explain) a return on one order. */
export async function getReturnContext(order: AdminOrder, now: Date = new Date()): Promise<ReturnContext> {
  const [policies, requests] = await Promise.all([policiesForOrder(order), listRequestsForOrder(order.id)]);
  const hasOpen = requests.some((r) => OPEN_RETURN_STATUSES.has(r.status));
  const eligibility = returnEligibility(
    { delivered: order.status === "DELIVERED", deliveredAt: order.deliveredAt ?? null, updatedAt: order.updatedAt, items: order.items },
    policies,
    hasOpen,
    now,
  );
  return { eligibility, requests };
}
