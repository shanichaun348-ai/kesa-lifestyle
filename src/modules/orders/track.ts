import "server-only";

import { formatOrderNumber, getOrderByNumber } from "@/modules/admin/orders-data";
import { isCod, type OrderStatus } from "@/modules/orders/types";
import { courierName } from "@/modules/shipping/couriers";

import { contactMatches, maskEmail, parseOrderReference } from "./track-match";

export type TrackedStatus = "pending_payment" | "failed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

/** What the public tracking page may show: status and shipment, no address or amounts. */
export type TrackedOrder = {
  orderNumber: string;
  status: TrackedStatus;
  paymentMethod: "razorpay" | "cod";
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  maskedEmail: string;
  itemCount: number;
};

const STATUS: Record<OrderStatus, TrackedStatus> = {
  CREATED: "pending_payment",
  PAYMENT_PENDING: "pending_payment",
  PAYMENT_FAILED: "failed",
  PAID: "paid",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

/**
 * Public lookup: the order number plus the email or phone used at checkout.
 * Any mismatch returns null — callers must not reveal which part was wrong.
 */
export async function lookupOrderForTracking(reference: string, contact: string): Promise<TrackedOrder | null> {
  const n = parseOrderReference(reference);
  if (n === null) return null;
  const order = await getOrderByNumber(n);
  if (!order) return null;
  if (!contactMatches({ customerEmail: order.customer.email, customerPhone: order.customer.phone, shippingPhone: order.shippingAddress?.phone ?? null }, contact)) return null;
  return {
    orderNumber: formatOrderNumber(order.orderNumber),
    status: STATUS[order.status],
    paymentMethod: isCod(order) ? "cod" : "razorpay",
    placedAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
    courier: courierName(order.courier),
    trackingNumber: order.trackingNumber ?? null,
    trackingUrl: order.trackingUrl ?? null,
    maskedEmail: maskEmail(order.customer.email),
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
  };
}
