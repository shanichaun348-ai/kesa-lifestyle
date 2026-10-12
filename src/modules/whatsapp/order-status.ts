/**
 * Shipped / delivered WhatsApp messages: pure helpers that turn an order into
 * template parameters. Templates must be approved in Meta Business Manager
 * (category: Utility) under WHATSAPP_SHIPPED_TEMPLATE / WHATSAPP_DELIVERED_TEMPLATE.
 *
 * Shipped — 4 parameters: first name, order reference, courier, tracking:
 *   Hi {{1}}, your Kesa Lifestyle order {{2}} is on its way with {{3}}.
 *   Tracking: {{4}}. Delivery usually takes 3–7 days.
 *
 * Delivered — 2 parameters: first name, order reference:
 *   Hi {{1}}, your Kesa Lifestyle order {{2}} has been delivered. We'd love
 *   to hear how it looks — reply to this message or review it on our site.
 */
import { orderReference } from "@/modules/email/order-confirmation";
import type { Order } from "@/modules/orders/types";
import { courierName } from "@/modules/shipping/couriers";

export const DEFAULT_SHIPPED_TEMPLATE = "order_shipped";
export const DEFAULT_DELIVERED_TEMPLATE = "order_delivered";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstName(order: Order): string {
  return clean(order.customer.name).split(" ")[0] || "there";
}

/** Values for {{1}}…{{4}} of the shipped template. */
export function orderShippedParams(order: Order): [firstName: string, reference: string, courier: string, tracking: string] {
  const courier = courierName(order.courier) ?? "our courier partner";
  const number = order.trackingNumber?.trim();
  const tracking = number ? (order.trackingUrl ? `${number} ${order.trackingUrl}` : number) : "shared soon";
  return [firstName(order), orderReference(order), clean(courier), clean(tracking)];
}

/** Values for {{1}}…{{2}} of the delivered template. */
export function orderDeliveredParams(order: Order): [firstName: string, reference: string] {
  return [firstName(order), orderReference(order)];
}
