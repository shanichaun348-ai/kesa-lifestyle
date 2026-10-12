"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSessionUser } from "@/lib/auth/session";
import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { listOrdersForCustomer, PAID_STATUSES } from "@/modules/admin/orders-data";
import { getCatalogRepository } from "@/modules/catalog/queries";

import { MAX_REVIEW_PHOTO_BYTES, MAX_REVIEW_PHOTOS, REVIEW_PHOTO_TYPES, reviewSubmissionSchema } from "./schemas";
import { verifiedOrderId } from "./summary";
import { hasReviewed, REVIEW_PHOTO_BUCKET, submitReview } from "./supabase-reviews";

export type ReviewFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; published: boolean; message: string };

export const REVIEW_FORM_IDLE: ReviewFormState = { status: "idle" };

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  // Hash so a raw IP never lands in logs or memory.
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** The submit path: validate, rate-limit, decide verified-purchase, store. */
export async function submitReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "Reviews are not available right now." };

  let photos: unknown = [];
  try {
    photos = JSON.parse(String(formData.get("photosJson") ?? "[]"));
  } catch {
    return { status: "error", message: "Photo data was malformed — reload the page and try again." };
  }

  const parsed = reviewSubmissionSchema.safeParse({
    productSlug: formData.get("productSlug"),
    name: formData.get("name"),
    email: formData.get("email"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body"),
    photos,
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    if (fieldErrors.website) return { status: "success", published: false, message: "Thanks for your review." }; // bot: pretend
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;

  const key = await clientKey();
  const limit = consumeMemoryRateLimit(limiterKey("review", key), 5, 60 * 60);
  if (!limit.allowed) return { status: "error", message: "Too many reviews from this connection — please try again in an hour." };

  // Signed-in customers review as themselves; the form's email is ignored.
  // Only a confirmed account proves who is writing: a guest could type any
  // buyer's email, so guest reviews always pass through moderation.
  const session = await getSessionUser();
  const email = session?.email ? session.email.toLowerCase() : input.email;
  const identityProven = Boolean(session?.email && session.emailConfirmed);

  const product = await getCatalogRepository().getProductBySlug(input.productSlug);
  if (!product) return { status: "error", message: "This product is no longer available for review." };

  if (await hasReviewed(product.slug, email)) return { status: "error", message: "You have already reviewed this piece — thank you!" };

  // Any paid order on this email containing the product makes the review verified.
  const orders = await listOrdersForCustomer(email);
  const orderId = verifiedOrderId({
    paidStatuses: PAID_STATUSES,
    orders: orders.map((o) => ({ id: o.id, status: o.status, items: o.items.map((i) => ({ productId: i.productId, sku: i.sku })) })),
    product: { id: product.id, skus: new Set(product.variants.map((v) => v.sku)) },
  });

  const result = await submitReview({
    productSlug: product.slug,
    customerName: input.name,
    customerEmail: email,
    rating: input.rating,
    title: input.title || null,
    body: input.body,
    photos: input.photos.map((p) => ({ src: p.src, alt: p.alt || `${product.name} — customer photo` })),
    verifiedOrderId: orderId,
    profileId: session?.id ?? null,
    autoPublish: identityProven,
  });
  if (!result.ok) return { status: "error", message: result.message };

  if (result.status === "approved") {
    revalidatePath(`/products/${product.slug}/`);
    revalidatePath("/");
    return { status: "success", published: true, message: "Thanks — your review is live." };
  }
  return { status: "success", published: false, message: "Thanks — we'll publish your review after a quick check." };
}

export type ReviewUploadTarget = { name: string; bucket: string; path: string; token: string; publicUrl: string };
export type PrepareReviewUploadResult = { ok: true; targets: ReviewUploadTarget[] } | { ok: false; error: string };

async function ensureBucket(): Promise<void> {
  const storage = getSupabaseServiceClient().storage;
  const { data } = await storage.getBucket(REVIEW_PHOTO_BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(REVIEW_PHOTO_BUCKET, { public: true, fileSizeLimit: MAX_REVIEW_PHOTO_BYTES, allowedMimeTypes: Object.keys(REVIEW_PHOTO_TYPES) });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

/** Signed upload URLs for review photos; the browser sends the bytes straight to Storage. */
export async function prepareReviewPhotoUploads(productSlug: string, files: Array<{ name: string; type: string; size: number }>): Promise<PrepareReviewUploadResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Photo uploads are not available right now." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) return { ok: false, error: "Invalid product." };
  if (files.length === 0) return { ok: false, error: "Choose at least one photo." };
  if (files.length > MAX_REVIEW_PHOTOS) return { ok: false, error: `Up to ${MAX_REVIEW_PHOTOS} photos per review.` };
  for (const f of files) {
    if (!REVIEW_PHOTO_TYPES[f.type]) return { ok: false, error: `"${f.name}" is not a JPEG, PNG or WebP image.` };
    if (f.size <= 0 || f.size > MAX_REVIEW_PHOTO_BYTES) return { ok: false, error: `"${f.name}" is larger than 5 MB.` };
  }

  const key = await clientKey();
  const limit = consumeMemoryRateLimit(limiterKey("review-upload", key), 15, 60 * 60);
  if (!limit.allowed) return { ok: false, error: "Too many uploads — please try again later." };

  try {
    await ensureBucket();
  } catch (err) {
    return { ok: false, error: `Storage is not ready: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  const storage = getSupabaseServiceClient().storage.from(REVIEW_PHOTO_BUCKET);
  const targets: ReviewUploadTarget[] = [];
  for (const f of files) {
    const path = `${productSlug}/${Date.now()}-${randomBytes(4).toString("hex")}.${REVIEW_PHOTO_TYPES[f.type]}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: `Could not prepare upload for "${f.name}".` };
    targets.push({ name: f.name, bucket: REVIEW_PHOTO_BUCKET, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
  }
  return { ok: true, targets };
}
