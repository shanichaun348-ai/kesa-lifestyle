"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSessionUser } from "@/lib/auth/session";
import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { getOrderByNumber, type AdminOrder } from "@/modules/admin/orders-data";
import { notifyReturnEvent } from "@/modules/notifications/return-request";
import { contactMatches, parseOrderReference } from "@/modules/orders/track-match";

import { getReturnContext } from "./context";
import { allowedKindsFor } from "./eligibility";
import { MAX_RETURN_PHOTO_BYTES, MAX_RETURN_PHOTOS, RETURN_PHOTO_TYPES, returnSubmissionSchema } from "./schemas";
import { cancelReturnByCustomer, createReturnRequest, RETURN_PHOTO_BUCKET } from "./supabase-returns";
import type { ReturnRequest } from "./types";

export type ReturnFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; request: ReturnRequest };

export const RETURN_FORM_IDLE: ReturnFormState = { status: "idle" };

type Auth = { mode: "session" } | { mode: "lookup"; reference: string; contact: string };

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Prove the caller owns the order: a signed-in, confirmed account whose email
 * placed it, or the public-lookup pair (order number + email/phone) re-checked
 * with the same matcher the tracking page uses.
 */
async function authorisedOrder(reference: string, auth: Auth): Promise<{ order: AdminOrder; email: string; profileId: string | null } | null> {
  const n = parseOrderReference(reference);
  if (n === null) return null;
  const order = await getOrderByNumber(n);
  if (!order) return null;
  if (auth.mode === "session") {
    const user = await getSessionUser();
    if (!user?.email || !user.emailConfirmed) return null;
    if (user.email.toLowerCase() !== order.customer.email.trim().toLowerCase()) return null;
    return { order, email: user.email.toLowerCase(), profileId: user.id };
  }
  if (parseOrderReference(auth.reference) !== n) return null;
  if (!contactMatches({ customerEmail: order.customer.email, customerPhone: order.customer.phone, shippingPhone: order.shippingAddress?.phone ?? null }, auth.contact)) return null;
  return { order, email: order.customer.email.trim().toLowerCase(), profileId: null };
}

function parseJson(value: FormDataEntryValue | null, fallback: unknown): unknown {
  try {
    return JSON.parse(String(value ?? ""));
  } catch {
    return fallback;
  }
}

export async function submitReturnAction(_prev: ReturnFormState, formData: FormData): Promise<ReturnFormState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "Returns are not available right now." };

  const parsed = returnSubmissionSchema.safeParse({
    reference: formData.get("reference"),
    auth: parseJson(formData.get("authJson"), {}),
    kind: formData.get("kind"),
    items: parseJson(formData.get("itemsJson"), []),
    details: formData.get("details"),
    photos: parseJson(formData.get("photosJson"), []),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    if (fieldErrors.website) return { status: "error", message: "Please try again." }; // bot
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;

  const limit = consumeMemoryRateLimit(limiterKey("return", await clientKey()), 5, 60 * 60);
  if (!limit.allowed) return { status: "error", message: "Too many requests from this connection — please try again in an hour." };

  const owner = await authorisedOrder(input.reference, input.auth);
  if (!owner) return { status: "error", message: "We couldn't match that order to you. Sign in, or look the order up again with the email or mobile number you used." };

  const { eligibility } = await getReturnContext(owner.order);
  if (!eligibility.eligible) return { status: "error", message: eligibility.reason ?? "This order is not eligible for a return." };

  // Every chosen line must exist, be eligible, fit the ordered quantity, and allow the chosen kind.
  const items: ReturnRequest["items"] = [];
  for (const picked of input.items) {
    const line = eligibility.items.find((i) => i.sku === picked.sku);
    if (!line || !line.eligible) return { status: "error", message: "One of the selected items cannot be returned." };
    if (picked.quantity > line.quantity) return { status: "error", message: `You ordered ${line.quantity} of ${line.productName}.` };
    items.push({ sku: line.sku, productName: line.productName, quantity: picked.quantity, reason: picked.reason });
  }
  if (!allowedKindsFor(eligibility.items, items.map((i) => i.sku)).includes(input.kind)) {
    return { status: "error", message: "One of the selected items is exchange-only — choose Exchange, or remove it from the request." };
  }

  const created = await createReturnRequest({
    orderId: owner.order.id,
    customerEmail: owner.email,
    profileId: owner.profileId,
    kind: input.kind,
    items,
    details: input.details,
    photos: input.photos.map((p) => ({ src: p.src, alt: p.alt || "Customer photo" })),
  });
  if (!created.ok) return { status: "error", message: created.error };

  await notifyReturnEvent("submitted", created.request, owner.order);
  revalidatePath("/admin/returns/");
  revalidatePath(`/admin/orders/${owner.order.id}/`);
  return { status: "success", request: created.request };
}

export type CancelReturnState = { error: string } | { success: string } | null;

export async function cancelReturnAction(id: string, reference: string, authJson: string): Promise<CancelReturnState> {
  if (!isSupabaseConfigured()) return { error: "Returns are not available right now." };
  const auth = parseJson(authJson, null) as Auth | null;
  if (!auth || (auth.mode !== "session" && auth.mode !== "lookup")) return { error: "Could not verify the order." };
  const owner = await authorisedOrder(reference, auth);
  if (!owner) return { error: "Could not verify the order." };
  const result = await cancelReturnByCustomer(id, owner.email);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/returns/");
  return { success: "Your request has been cancelled." };
}

export type ReturnUploadTarget = { name: string; bucket: string; path: string; token: string; publicUrl: string };
export type PrepareReturnUploadResult = { ok: true; targets: ReturnUploadTarget[] } | { ok: false; error: string };

async function ensureBucket(): Promise<void> {
  const storage = getSupabaseServiceClient().storage;
  const { data } = await storage.getBucket(RETURN_PHOTO_BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(RETURN_PHOTO_BUCKET, { public: true, fileSizeLimit: MAX_RETURN_PHOTO_BYTES, allowedMimeTypes: Object.keys(RETURN_PHOTO_TYPES) });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

/** Signed upload URLs for photos of the pieces; the browser sends the bytes straight to Storage. */
export async function prepareReturnPhotoUploads(reference: string, files: Array<{ name: string; type: string; size: number }>): Promise<PrepareReturnUploadResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Photo uploads are not available right now." };
  const n = parseOrderReference(reference);
  if (n === null) return { ok: false, error: "Invalid order." };
  if (files.length === 0) return { ok: false, error: "Choose at least one photo." };
  if (files.length > MAX_RETURN_PHOTOS) return { ok: false, error: `Up to ${MAX_RETURN_PHOTOS} photos per request.` };
  for (const f of files) {
    if (!RETURN_PHOTO_TYPES[f.type]) return { ok: false, error: `"${f.name}" is not a JPEG, PNG or WebP image.` };
    if (f.size <= 0 || f.size > MAX_RETURN_PHOTO_BYTES) return { ok: false, error: `"${f.name}" is larger than 5 MB.` };
  }
  const limit = consumeMemoryRateLimit(limiterKey("return-upload", await clientKey()), 15, 60 * 60);
  if (!limit.allowed) return { ok: false, error: "Too many uploads — please try again later." };
  try {
    await ensureBucket();
  } catch (err) {
    return { ok: false, error: `Storage is not ready: ${err instanceof Error ? err.message : "unknown error"}` };
  }
  const storage = getSupabaseServiceClient().storage.from(RETURN_PHOTO_BUCKET);
  const targets: ReturnUploadTarget[] = [];
  for (const f of files) {
    const path = `kl-${n}/${Date.now()}-${randomBytes(4).toString("hex")}.${RETURN_PHOTO_TYPES[f.type]}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: `Could not prepare upload for "${f.name}".` };
    targets.push({ name: f.name, bucket: RETURN_PHOTO_BUCKET, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
  }
  return { ok: true, targets };
}
