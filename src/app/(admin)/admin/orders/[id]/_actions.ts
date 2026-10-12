"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getOrder, isConfirmed, recordShipment, setOrderStatus } from "@/modules/admin/orders-data";
import { notifyOrderDelivered } from "@/modules/notifications/order-delivered";
import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import { notifyOrderShipped } from "@/modules/notifications/order-shipped";
import { getOrderRepository } from "@/modules/orders/queries";
import { isCod, type OrderStatus } from "@/modules/orders/types";
import { isCourierId, resolveTrackingUrl } from "@/modules/shipping/couriers";

export type OrderActionState = { error: string } | { success: string } | null;

/** Steps that need no extra data; SHIPPED goes through `shipOrder` so the consignment is recorded. */
const FULFILMENT_STEPS: ReadonlySet<OrderStatus> = new Set(["PROCESSING", "DELIVERED"]);

function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
  revalidatePath("/admin/");
}

export async function advanceOrder(orderId: string, to: OrderStatus): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  if (!FULFILMENT_STEPS.has(to)) return { error: "Not a fulfilment step." };
  const result = await setOrderStatus(orderId, to);
  if (!result.ok) return { error: result.error };
  auditLog(session, "order.update_status", { orderId, newStatus: to });
  if (to === "DELIVERED") {
    // One "delivered" message per channel; the email carries the review links. Never blocks the status change.
    const order = await getOrderRepository().findById(orderId);
    if (order) {
      const sent = await notifyOrderDelivered(order);
      if (sent.email.ok) auditLog(session, "order.review_request", { orderId });
    }
  }
  revalidateOrder(orderId);
  return { success: `Order marked as ${to.toLowerCase()}.` };
}

const TRACKING_RE = /^[A-Za-z0-9][A-Za-z0-9 /_-]{3,60}$/;

/** Record courier + consignment, move to SHIPPED and tell the customer. */
export async function shipOrder(orderId: string, _prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  const courier = formData.get("courier");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const trackingUrlInput = String(formData.get("trackingUrl") ?? "").trim();
  if (!isCourierId(courier)) return { error: "Choose the courier." };
  if (!TRACKING_RE.test(trackingNumber)) return { error: "Enter the tracking / AWB number (letters, digits, dashes)." };
  if (trackingUrlInput && !/^https?:\/\//i.test(trackingUrlInput)) return { error: "The tracking link must start with https://." };
  const trackingUrl = resolveTrackingUrl(courier, trackingNumber, trackingUrlInput || null);

  const result = await recordShipment(orderId, { courier, trackingNumber, trackingUrl });
  if (!result.ok) return { error: result.error };
  auditLog(session, "order.ship", { orderId, courier, trackingNumber });

  const order = await getOrderRepository().findById(orderId);
  const notice = order ? await notifyOrderShipped(order) : null;
  revalidateOrder(orderId);
  const channels = notice ? [notice.email.ok ? "email" : null, notice.whatsapp.ok ? "WhatsApp" : null].filter(Boolean) : [];
  return { success: channels.length > 0 ? `Marked as shipped — customer notified by ${channels.join(" and ")}.` : "Marked as shipped." };
}

export async function cancelOrder(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  const order = await getOrder(orderId);
  if (!order) return { error: "Order not found." };
  // Online orders that have been paid are refunded, never cancelled; COD has nothing charged until delivery.
  if (!isCod(order) && order.status === "PROCESSING") return { error: "This order is paid — refund it instead of cancelling." };
  const result = await setOrderStatus(orderId, "CANCELLED");
  if (!result.ok) return { error: result.error };
  // Unpaid orders still hold reserved stock — give it back.
  await getOrderRepository().releaseOrderInventory(orderId);
  auditLog(session, "order.cancel", { orderId });
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
  revalidatePath("/admin/");
  return { success: "Order cancelled and stock released." };
}

export async function resendConfirmationEmail(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  const order = await getOrderRepository().findById(orderId);
  if (!order) return { error: "Order not found." };
  if (!isConfirmed(order)) return { error: "Only confirmed orders have a confirmation email." };
  const result = await notifyOrderPaid(order, { only: "email" });
  if (!result.customer.ok) return { error: result.customer.error };
  auditLog(session, "order.resend_email", { orderId, to: order.customer.email });
  return { success: `Confirmation sent to ${order.customer.email}.` };
}

export async function resendConfirmationWhatsApp(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  const order = await getOrderRepository().findById(orderId);
  if (!order) return { error: "Order not found." };
  if (!isConfirmed(order)) return { error: "Only confirmed orders have a confirmation message." };
  const result = await notifyOrderPaid(order, { only: "whatsapp" });
  if (!result.whatsapp || !result.whatsapp.ok) return { error: result.whatsapp?.error ?? "WhatsApp message was not sent." };
  auditLog(session, "order.resend_whatsapp", { orderId, to: order.customer.phone });
  return { success: `WhatsApp confirmation sent to ${order.customer.phone}.` };
}

export async function markRefunded(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:refund");
  const result = await setOrderStatus(orderId, "REFUNDED");
  if (!result.ok) return { error: result.error };
  auditLog(session, "order.refund", { orderId });
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
  revalidatePath("/admin/");
  return { success: "Order marked as refunded." };
}
