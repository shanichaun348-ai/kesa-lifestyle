import { z } from "zod";

import { isStoragePhotoUrl } from "@/modules/media/photo-url";

import { RETURN_REASONS } from "./types";

export const MAX_RETURN_PHOTOS = 3;
export const MAX_RETURN_PHOTO_BYTES = 5 * 1024 * 1024;
export const RETURN_PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Mirrors RETURN_PHOTO_BUCKET in supabase-returns.ts (kept here so the browser form needs no server import). */
export const RETURN_PHOTO_BUCKET_NAME = "return-photos";

// Only photos uploaded through the return form (our own storage bucket) may be attached.
const photo = z.object({
  src: z.string().url().max(600).refine((src) => isStoragePhotoUrl(src, RETURN_PHOTO_BUCKET_NAME), "Photo link is not allowed."),
  alt: z.string().max(200).default(""),
});

const item = z.object({
  sku: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().int().min(1).max(50),
  reason: z.enum(Object.keys(RETURN_REASONS) as [keyof typeof RETURN_REASONS, ...Array<keyof typeof RETURN_REASONS>]),
});

/** Ownership proof travels with the submission: the session, or the public-lookup credentials. */
const auth = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("session") }),
  z.object({ mode: z.literal("lookup"), reference: z.string().trim().min(1).max(20), contact: z.string().trim().min(3).max(120) }),
]);

export const returnSubmissionSchema = z.object({
  reference: z.string().trim().min(1).max(20),
  auth,
  kind: z.enum(["return", "exchange"]),
  items: z.array(item).min(1, "Choose at least one item.").max(20),
  details: z.string().trim().min(10, "Tell us a little more — at least 10 characters.").max(2000),
  photos: z.array(photo).max(MAX_RETURN_PHOTOS).default([]),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional().default(""),
});

export type ReturnSubmission = z.infer<typeof returnSubmissionSchema>;
