"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { isSupabaseConfigured } from "@/lib/supabase";
import { lookupOrderForTracking, type TrackedOrder } from "@/modules/orders/track";

export type TrackState = { status: "idle" } | { status: "error"; message: string } | { status: "found"; order: TrackedOrder };

export const TRACK_IDLE: TrackState = { status: "idle" };

const NOT_FOUND = "We couldn't find an order with those details. Check the order number and use the email or mobile number from your order confirmation.";

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "Order tracking is not available right now." };
  const reference = String(formData.get("reference") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (!reference || !contact) return { status: "error", message: "Enter your order number and the email or mobile number you ordered with." };

  // Generous for real customers, tight enough that guessing numbers against contacts is impractical.
  const limit = consumeMemoryRateLimit(limiterKey("track-order", await clientKey()), 10, 60 * 60);
  if (!limit.allowed) return { status: "error", message: "Too many lookups — please try again in an hour, or sign in to see your orders." };

  const order = await lookupOrderForTracking(reference, contact);
  if (!order) return { status: "error", message: NOT_FOUND };
  return { status: "found", order };
}
