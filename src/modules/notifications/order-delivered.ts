import "server-only";

import { getCatalogRepository } from "@/modules/catalog/queries";
import { orderDeliveredEmail } from "@/modules/email/order-delivered";
import { sendEmail } from "@/modules/email/resend";
import type { ReviewRequestItem } from "@/modules/email/review-request";
import type { Order } from "@/modules/orders/types";
import { sendWhatsAppTemplate, type SendWhatsAppResult } from "@/modules/whatsapp/cloud-api";
import { DEFAULT_TEMPLATE_LANGUAGE, toWhatsAppNumber } from "@/modules/whatsapp/order-confirmation";
import { DEFAULT_DELIVERED_TEMPLATE, orderDeliveredParams } from "@/modules/whatsapp/order-status";

import type { StatusNotifyResult } from "./order-shipped";

/** Products in the order that still exist, each once, for the review links. */
async function reviewItems(order: Order): Promise<ReviewRequestItem[]> {
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
  return items;
}

/**
 * One "delivered" message per channel: the email doubles as the review
 * request (links per product), so the customer is not emailed twice for the
 * same event. Called once when the order is marked delivered; never throws.
 */
export async function notifyOrderDelivered(order: Order): Promise<StatusNotifyResult> {
  const items = await reviewItems(order).catch(() => [] as ReviewRequestItem[]);
  const to = toWhatsAppNumber(order.customer.phone);
  const [email, whatsapp] = await Promise.all([
    sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...orderDeliveredEmail(order, items) }),
    to
      ? sendWhatsAppTemplate({
          to,
          template: process.env.WHATSAPP_DELIVERED_TEMPLATE || DEFAULT_DELIVERED_TEMPLATE,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE,
          bodyParams: orderDeliveredParams(order),
        })
      : Promise.resolve<SendWhatsAppResult>({ ok: false, error: `"${order.customer.phone}" is not a mobile number WhatsApp can deliver to.`, skipped: true }),
  ]);
  return { email, whatsapp };
}
