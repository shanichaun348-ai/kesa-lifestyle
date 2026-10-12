import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import type { ImageRef } from "@/modules/catalog/types";

import { OPEN_RETURN_STATUSES, type ReturnItem, type ReturnKind, type ReturnRequest, type ReturnStatus } from "./types";

type Row = {
  id: string;
  order_id: string;
  customer_email: string;
  profile_id: string | null;
  kind: ReturnKind;
  items: ReturnItem[];
  details: string | null;
  photos: ImageRef[] | null;
  status: ReturnStatus;
  admin_note: string | null;
  internal_note: string | null;
  refund_paise: number | string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export const RETURN_PHOTO_BUCKET = "return-photos";

function toRequest(r: Row): ReturnRequest {
  return {
    id: r.id,
    orderId: r.order_id,
    customerEmail: r.customer_email,
    profileId: r.profile_id,
    kind: r.kind,
    items: r.items ?? [],
    details: r.details,
    photos: r.photos ?? [],
    status: r.status,
    adminNote: r.admin_note,
    internalNote: r.internal_note,
    refundPaise: r.refund_paise === null ? null : Number(r.refund_paise),
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const db = () => getSupabaseServiceClient().from("return_requests");

export async function listRequestsForOrder(orderId: string): Promise<ReturnRequest[]> {
  const { data, error } = await db().select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load return requests: ${error.message}`);
  return ((data ?? []) as Row[]).map(toRequest);
}

export async function openRequestForOrder(orderId: string): Promise<ReturnRequest | null> {
  const all = await listRequestsForOrder(orderId);
  return all.find((r) => OPEN_RETURN_STATUSES.has(r.status)) ?? null;
}

export type CreateReturnInput = {
  orderId: string;
  customerEmail: string;
  profileId: string | null;
  kind: ReturnKind;
  items: ReturnItem[];
  details: string;
  photos: ImageRef[];
};

export async function createReturnRequest(input: CreateReturnInput): Promise<{ ok: true; request: ReturnRequest } | { ok: false; error: string }> {
  if (await openRequestForOrder(input.orderId)) return { ok: false, error: "A return or exchange request is already open for this order." };
  const { data, error } = await db()
    .insert({
      order_id: input.orderId,
      customer_email: input.customerEmail.trim().toLowerCase(),
      profile_id: input.profileId,
      kind: input.kind,
      items: input.items,
      details: input.details.trim() || null,
      photos: input.photos,
      status: "requested",
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "We could not save your request. Please try again." };
  return { ok: true, request: toRequest(data as Row) };
}

/** The customer may withdraw while nothing has happened yet. Ownership by email. */
export async function cancelReturnByCustomer(id: string, email: string): Promise<{ ok: true; request: ReturnRequest } | { ok: false; error: string }> {
  const { data, error } = await db()
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("customer_email", email.trim().toLowerCase())
    .eq("status", "requested")
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This request can no longer be cancelled." };
  return { ok: true, request: toRequest(data as Row) };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export type ReturnTab = "open" | "approved" | "received" | "closed";

const TAB_STATUSES: Record<ReturnTab, ReturnStatus[]> = {
  open: ["requested"],
  approved: ["approved"],
  received: ["received"],
  closed: ["rejected", "refunded", "exchanged", "cancelled"],
};

export async function listReturnRequests(tab: ReturnTab): Promise<ReturnRequest[]> {
  const { data, error } = await db().select("*").in("status", TAB_STATUSES[tab]).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Failed to load return requests: ${error.message}`);
  return ((data ?? []) as Row[]).map(toRequest);
}

export async function countOpenReturns(): Promise<number> {
  const { count } = await db().select("id", { count: "exact", head: true }).eq("status", "requested");
  return count ?? 0;
}

export async function getReturnRequest(id: string): Promise<ReturnRequest | null> {
  const { data, error } = await db().select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toRequest(data as Row);
}

const ADMIN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["refunded", "exchanged"],
  rejected: [],
  refunded: [],
  exchanged: [],
  cancelled: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

export type ReturnTransitionPatch = { adminNote?: string | null; refundPaise?: number | null };

export async function transitionReturn(id: string, to: ReturnStatus, patch: ReturnTransitionPatch = {}): Promise<{ ok: true; request: ReturnRequest } | { ok: false; error: string }> {
  const current = await getReturnRequest(id);
  if (!current) return { ok: false, error: "Request not found." };
  if (!canTransitionReturn(current.status, to)) return { ok: false, error: `Cannot move a request from ${current.status} to ${to}.` };
  const terminal = ADMIN_TRANSITIONS[to].length === 0;
  const { data, error } = await db()
    .update({
      status: to,
      ...(patch.adminNote !== undefined ? { admin_note: patch.adminNote?.trim() || null } : {}),
      ...(patch.refundPaise !== undefined ? { refund_paise: patch.refundPaise } : {}),
      ...(terminal ? { resolved_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
  return { ok: true, request: toRequest(data as Row) };
}

export async function setInternalNote(id: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db().update({ internal_note: note.trim() || null }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
