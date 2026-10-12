import { z } from "zod";

export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
export const REVIEW_PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const photo = z.object({
  src: z.string().url().max(600),
  alt: z.string().max(200).default(""),
});

export const reviewSubmissionSchema = z.object({
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2, "Please tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(20, "Tell us a little more — at least 20 characters.").max(2000),
  photos: z.array(photo).max(MAX_REVIEW_PHOTOS).default([]),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional().default(""),
});

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
