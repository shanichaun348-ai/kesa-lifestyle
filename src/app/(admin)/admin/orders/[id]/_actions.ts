"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";

export type OrderActionState = { error: string } | { success: string } | null;

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
  const session = await requireAdmin("orders:write");
  auditLog(session, "order.update_status", { orderId, newStatus });
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
}

export async function issueRefund(orderId: string, amountPaise: number, reason: string): Promise<OrderActionState> {
  const session = await requireAdmin("orders:refund");
  if (amountPaise <= 0) return { error: "Refund amount must be greater than 0." };
  auditLog(session, "order.refund", { orderId, amountPaise, reason });
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/orders/");
  return { success: `Refund of ₹${(amountPaise / 100).toLocaleString("en-IN")} recorded (demo — Razorpay not called).` };
}
