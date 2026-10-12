import "server-only";

import { getCatalogRepository } from "@/modules/catalog/queries";
import { reviewRequestEmail, type ReviewRequestItem } from "@/modules/email/review-request";
import { isEmailConfigured, sendEmail } from "@/modules/email/resend";
import { getOrderRepository } from "@/modules/orders/queries";

/**
 * Email the customer a "How did we do?" with a review link per product.
 * Called once when an order is marked delivered. Returns whether it was
 * sent; silently skips when email is unconfigured or nothing resolves.
 */
export async function sendReviewRequest(orderId: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const order = await getOrderRepository().findById(orderId);
  if (!order || order.status !== "DELIVERED") return false;

  const bySku = await getCatalogRepository().getProductsBySku(order.items.map((i) => i.sku));
  const seen = new Set<string>();
  const items: ReviewRequestItem[] = [];
  for (const line of order.items) {
    const hit = bySku.get(line.sku);
    const slug = hit?.product.slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ name: hit.product.name, slug, image: hit.product.images[0]?.src });
  }
  if (items.length === 0) return false;

  const result = await sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...reviewRequestEmail(order, items) });
  return result.ok;
}
