import "server-only";

import { randomBytes } from "node:crypto";

import { getSupabaseServiceClient } from "@/lib/supabase";
import type { CartLine } from "@/modules/cart/store";
import { cartTotals } from "@/modules/cart/store";

import { CART_TTL_MS, FIRST_REMINDER_AFTER_MS, MAX_REMINDERS } from "./rules";
import type { AbandonedCart, CartStatus } from "./types";

type Row = {
  id: string;
  token: string;
  email: string | null;
  phone: string | null;
  profile_id: string | null;
  consent: boolean;
  items: CartLine[];
  subtotal_paise: number;
  status: CartStatus;
  reminder_count: number;
  last_reminded_at: string | null;
  converted_order_id: string | null;
  last_activity_at: string;
};

const SELECT = "id, token, email, phone, profile_id, consent, items, subtotal_paise, status, reminder_count, last_reminded_at, converted_order_id, last_activity_at";

function toCart(r: Row): AbandonedCart {
  return {
    id: r.id,
    token: r.token,
    email: r.email,
    phone: r.phone,
    profileId: r.profile_id,
    consent: r.consent,
    items: Array.isArray(r.items) ? r.items : [],
    subtotalPaise: Number(r.subtotal_paise),
    status: r.status,
    reminderCount: Number(r.reminder_count),
    lastRemindedAt: r.last_reminded_at,
    convertedOrderId: r.converted_order_id,
    lastActivityAt: r.last_activity_at,
  };
}

export function newCartToken(): string {
  return randomBytes(16).toString("hex");
}

export async function getCartByToken(token: string): Promise<AbandonedCart | null> {
  const { data } = await getSupabaseServiceClient().from("carts").select(SELECT).eq("token", token).maybeSingle();
  return data ? toCart(data as Row) : null;
}

export type UpsertCartInput = {
  token: string;
  items: CartLine[];
  email?: string | null | undefined;
  phone?: string | null | undefined;
  consent?: boolean | undefined;
  profileId?: string | null | undefined;
};

/**
 * Record the latest bag. Identity fields are only ever added or updated,
 * never cleared by a later anonymous sync; any activity reopens a reminded
 * or expired bag so the schedule restarts from the new activity.
 */
export async function upsertCart(input: UpsertCartInput): Promise<void> {
  const db = getSupabaseServiceClient();
  const existing = await getCartByToken(input.token);
  const { subtotalPaise } = cartTotals(input.items);
  const now = new Date().toISOString();
  const reopen = existing?.status === "reminded" || existing?.status === "expired";
  const patch = {
    items: input.items,
    subtotal_paise: subtotalPaise,
    last_activity_at: now,
    ...(input.email ? { email: input.email.toLowerCase() } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.consent !== undefined ? { consent: input.consent } : {}),
    ...(input.profileId ? { profile_id: input.profileId } : {}),
    ...(reopen ? { status: "open" as const, reminder_count: 0, last_reminded_at: null } : {}),
  };
  if (existing) {
    // Converted and unsubscribed bags are never re-armed by this token.
    if (existing.status === "converted" || existing.status === "unsubscribed") return;
    await db.from("carts").update(patch).eq("id", existing.id);
    return;
  }
  await db.from("carts").insert({ token: input.token, consent: false, ...patch });
}

export async function deleteCart(token: string): Promise<void> {
  await getSupabaseServiceClient().from("carts").delete().eq("token", token).neq("status", "converted");
}

/** Items only — the resume link must never expose who the bag belongs to. */
export async function getResumeItems(token: string): Promise<CartLine[] | null> {
  const cart = await getCartByToken(token);
  if (!cart || cart.status === "converted") return null;
  return cart.items;
}

export async function markCartConverted(token: string, orderId: string): Promise<void> {
  await getSupabaseServiceClient()
    .from("carts")
    .update({ status: "converted", converted_order_id: orderId })
    .eq("token", token)
    .neq("status", "converted");
}

export async function unsubscribeCart(token: string): Promise<boolean> {
  const { data } = await getSupabaseServiceClient().from("carts").update({ status: "unsubscribed", consent: false }).eq("token", token).select("id").maybeSingle();
  return !!data;
}

/** Bags that might be due a reminder; the pure rules decide per row. */
export async function listReminderCandidates(now: Date, limit = 100): Promise<AbandonedCart[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("carts")
    .select(SELECT)
    .in("status", ["open", "reminded"])
    .eq("consent", true)
    .not("email", "is", null)
    .lt("reminder_count", MAX_REMINDERS)
    .lte("last_activity_at", new Date(now.getTime() - FIRST_REMINDER_AFTER_MS).toISOString())
    .order("last_activity_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`carts: ${error.message}`);
  return ((data ?? []) as Row[]).map(toCart);
}

export async function recordReminder(id: string, reminderCount: number, now: Date): Promise<void> {
  await getSupabaseServiceClient()
    .from("carts")
    .update({ status: "reminded", reminder_count: reminderCount, last_reminded_at: now.toISOString() })
    .eq("id", id);
}

/** Close every open or reminded bag idle for longer than the retention window. */
export async function expireStaleCarts(now: Date): Promise<number> {
  const { data, error } = await getSupabaseServiceClient()
    .from("carts")
    .update({ status: "expired" })
    .in("status", ["open", "reminded"])
    .lt("last_activity_at", new Date(now.getTime() - CART_TTL_MS).toISOString())
    .select("id");
  if (error) throw new Error(`carts expire: ${error.message}`);
  return data?.length ?? 0;
}

export async function profileConsent(profileId: string): Promise<boolean> {
  const { data } = await getSupabaseServiceClient().from("profiles").select("accepts_marketing").eq("id", profileId).maybeSingle();
  return Boolean((data as { accepts_marketing?: boolean } | null)?.accepts_marketing);
}
