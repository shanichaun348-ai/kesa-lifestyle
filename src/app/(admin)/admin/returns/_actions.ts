"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getOrder } from "@/modules/admin/orders-data";
import type { ReturnEmailEvent } from "@/modules/email/return-request";
import { notifyReturnEvent } from "@/modules/notifications/return-request";
import { setInternalNote, transitionReturn, type ReturnTransitionPatch } from "@/modules/returns/supabase-returns";
import type { ReturnStatus } from "@/modules/returns/types";

export type ReturnActionState = { error: string } | { success: string } | null;

function revalidate(id: string, orderId: string) {
  revalidatePath("/admin/returns/");
  revalidatePath(`/admin/returns/${id}/`);
  revalidatePath(`/admin/orders/${orderId}/`);
  revalidatePath("/admin/");
}

async function move(id: string, to: ReturnStatus, event: ReturnEmailEvent, patch: ReturnTransitionPatch, permission: "orders:write" | "orders:refund", audit: "return.approve" | "return.reject" | "return.receive" | "return.refund" | "return.exchange", success: string): Promise<ReturnActionState> {
  const session = await requireAdmin(permission);
  const result = await transitionReturn(id, to, patch);
  if (!result.ok) return { error: result.error };
  const order = await getOrder(result.request.orderId);
  if (order) await notifyReturnEvent(event, result.request, order);
  auditLog(session, audit, { returnId: id, orderId: result.request.orderId, ...patch });
  revalidate(id, result.request.orderId);
  return { success };
}

export async function approveReturn(id: string, note: string): Promise<ReturnActionState> {
  if (!note.trim()) return { error: "Add the pickup or return instructions — they are emailed to the customer." };
  return move(id, "approved", "approved", { adminNote: note }, "orders:write", "return.approve", "Approved and instructions emailed.");
}

export async function rejectReturn(id: string, note: string): Promise<ReturnActionState> {
  if (!note.trim()) return { error: "Give a reason — it is emailed to the customer." };
  return move(id, "rejected", "rejected", { adminNote: note }, "orders:write", "return.reject", "Rejected and the customer notified.");
}

export async function receiveReturn(id: string): Promise<ReturnActionState> {
  return move(id, "received", "received", {}, "orders:write", "return.receive", "Marked as received and the customer notified.");
}

export async function refundReturn(id: string, rupees: string, note: string): Promise<ReturnActionState> {
  const amount = Number(rupees);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the refund amount in rupees." };
  return move(id, "refunded", "refunded", { refundPaise: Math.round(amount * 100), adminNote: note }, "orders:refund", "return.refund", "Refund recorded and the customer notified.");
}

export async function exchangeReturn(id: string, note: string): Promise<ReturnActionState> {
  return move(id, "exchanged", "exchanged", { adminNote: note }, "orders:write", "return.exchange", "Exchange recorded and the customer notified.");
}

export async function saveInternalNote(id: string, orderId: string, note: string): Promise<ReturnActionState> {
  const session = await requireAdmin("orders:write");
  const result = await setInternalNote(id, note);
  if (!result.ok) return { error: result.error };
  auditLog(session, "return.note", { returnId: id });
  revalidate(id, orderId);
  return { success: "Note saved." };
}
