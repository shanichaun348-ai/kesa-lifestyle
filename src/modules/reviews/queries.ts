import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase";

import { getProductReviewSummary as supabaseSummary, latestApprovedShowcase } from "./supabase-reviews";
import { EMPTY_SUMMARY, type Review, type ReviewSummary } from "./types";

/**
 * Approved reviews for a product. Without Supabase (local dev, tests) there
 * are no reviews, so the UI shows "no reviews yet" and the schema omits
 * AggregateRating/Review entirely — nothing is invented.
 */
export async function getProductReviewSummary(productSlug: string, limit = 5): Promise<ReviewSummary> {
  if (!isSupabaseConfigured()) return EMPTY_SUMMARY;
  return supabaseSummary(productSlug, limit);
}

export type ShowcaseReview = Review & { productSlug: string };

/** Newest approved reviews across the catalogue for the homepage, photos first. */
export async function getReviewShowcase(limit = 6): Promise<{ total: number; reviews: ShowcaseReview[] }> {
  if (!isSupabaseConfigured()) return { total: 0, reviews: [] };
  return latestApprovedShowcase(limit);
}
