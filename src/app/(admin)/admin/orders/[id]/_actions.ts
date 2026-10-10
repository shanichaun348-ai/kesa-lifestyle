"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { PAID_STATUSES, setOrderStatus } from "@/modules/admin/orders-data";
import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import { getOrderRepository } from "@/modules/orders/queries";
import type { OrderStatus } from "@/modules/orders/types";

export type OrderActionState = { error: string } | { success: string } | null;

const FULFILMENT_STEPS: ReadonlySet<OrderStatus> = new Set(["PROCESSING", "SHIPPED", "DELIVERED"]);

export async function advanceOrder(orderId: string, to: OrderStatus): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  if (!FULFILMENT_STEPS.has(to)) return { error: "Not a fulfilment step." };
  const result = await setOrderStatus(orderId, to);
  if (!result.ok) return { error: result.error };
  auditLog(session, "order.update_status", { orderId, newStatus: to });
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
  revalidatePath("/admin/");
  return { success: `Order marked as ${to.toLowerCase()}.` };
}

export async function cancelOrder(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
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
  if (!PAID_STATUSES.has(order.status)) return { error: "Only paid orders have a confirmation email." };
  const result = await notifyOrderPaid(order, { only: "email" });
  if (!result.customer.ok) return { error: result.customer.error };
  auditLog(session, "order.resend_email", { orderId, to: order.customer.email });
  return { success: `Confirmation sent to ${order.customer.email}.` };
}

export async function resendConfirmationWhatsApp(orderId: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:write");
  const order = await getOrderRepository().findById(orderId);
  if (!order) return { error: "Order not found." };
  if (!PAID_STATUSES.has(order.status)) return { error: "Only paid orders have a confirmation message." };
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
