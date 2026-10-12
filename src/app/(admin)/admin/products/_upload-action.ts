"use server";

import { randomBytes } from "node:crypto";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { MAX_PRODUCT_VIDEOS, MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/modules/catalog/videos";

const BUCKET = "product-images";
const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

const VIDEO_BUCKET = "product-videos";

export type UploadTarget = { name: string; bucket: string; path: string; token: string; publicUrl: string };
export type PrepareUploadResult = { ok: true; targets: UploadTarget[] } | { ok: false; error: string };

async function ensureBucket(): Promise<void> {
  const storage = getSupabaseServiceClient().storage;
  const { data } = await storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) });
  // A concurrent request may have created it; only a genuine failure matters.
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

/**
 * Validate the chosen files and issue a signed upload URL for each, so the
 * browser can send the bytes straight to Supabase Storage (Vercel caps request
 * bodies at 4.5 MB, so files must not pass through the server).
 */
export async function prepareProductUploads(
  slug: string,
  files: Array<{ name: string; type: string; size: number }>,
): Promise<PrepareUploadResult> {
  const session = await requireAdmin("products:write");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: "Invalid product." };
  if (files.length === 0) return { ok: false, error: "Choose at least one image." };
  if (files.length > MAX_FILES) return { ok: false, error: `Upload at most ${MAX_FILES} photos at a time.` };
  for (const f of files) {
    if (!TYPES[f.type]) return { ok: false, error: `"${f.name}" is not a JPEG, PNG, WebP or AVIF image.` };
    if (f.size <= 0 || f.size > MAX_BYTES) return { ok: false, error: `"${f.name}" is larger than 8 MB — please resize it first.` };
  }

  try {
    await ensureBucket();
  } catch (err) {
    return { ok: false, error: `Storage is not ready: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  const storage = getSupabaseServiceClient().storage.from(BUCKET);
  const targets: UploadTarget[] = [];
  for (const f of files) {
    const path = `${slug}/${Date.now()}-${randomBytes(4).toString("hex")}.${TYPES[f.type]}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: `Could not prepare upload for "${f.name}": ${error?.message ?? "unknown error"}` };
    targets.push({ name: f.name, bucket: BUCKET, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
  }

  auditLog(session, "product.update", { productId: slug, uploads: targets.length });
  return { ok: true, targets };
}

async function ensureVideoBucket(): Promise<void> {
  const storage = getSupabaseServiceClient().storage;
  const { data } = await storage.getBucket(VIDEO_BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(VIDEO_BUCKET, { public: true, fileSizeLimit: MAX_VIDEO_BYTES, allowedMimeTypes: Object.keys(VIDEO_TYPES) });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

/** Signed direct-upload URLs for product video clips (MP4/WebM, up to 40 MB each). */
export async function prepareProductVideoUploads(
  slug: string,
  files: Array<{ name: string; type: string; size: number }>,
): Promise<PrepareUploadResult> {
  const session = await requireAdmin("products:write");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: "Invalid product." };
  if (files.length === 0) return { ok: false, error: "Choose a video file." };
  if (files.length > MAX_PRODUCT_VIDEOS) return { ok: false, error: `Up to ${MAX_PRODUCT_VIDEOS} videos per product.` };
  for (const f of files) {
    if (!VIDEO_TYPES[f.type]) return { ok: false, error: `"${f.name}" is not an MP4 or WebM video.` };
    if (f.size <= 0 || f.size > MAX_VIDEO_BYTES) return { ok: false, error: `"${f.name}" is larger than 40 MB — please compress it first.` };
  }

  try {
    await ensureVideoBucket();
  } catch (err) {
    return { ok: false, error: `Storage is not ready: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  const storage = getSupabaseServiceClient().storage.from(VIDEO_BUCKET);
  const targets: UploadTarget[] = [];
  for (const f of files) {
    const path = `${slug}/${Date.now()}-${randomBytes(4).toString("hex")}.${VIDEO_TYPES[f.type]}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: `Could not prepare upload for "${f.name}": ${error?.message ?? "unknown error"}` };
    targets.push({ name: f.name, bucket: VIDEO_BUCKET, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
  }

  auditLog(session, "product.update", { productId: slug, videoUploads: targets.length });
  return { ok: true, targets };
}
