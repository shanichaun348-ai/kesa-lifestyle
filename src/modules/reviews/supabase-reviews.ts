import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import type { ImageRef } from "@/modules/catalog/types";

import { pickShowcase, ratingsBySlug, summarise, toReview, type ProductRating, type ReviewRow, type ReviewStatus } from "./summary";
import { EMPTY_SUMMARY, type Review, type ReviewSummary } from "./types";

export const REVIEW_PHOTO_BUCKET = "review-photos";

const ROW_COLUMNS = "id, product_slug, order_id, profile_id, customer_name, customer_email, rating, title, body, photos, verified_purchase, status, admin_note, created_at, updated_at, moderated_at";

export type AdminReview = ReviewRow;

export type SubmitReviewInput = {
  productSlug: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  body: string;
  photos: ImageRef[];
  verifiedOrderId: string | null;
  profileId: string | null;
  /** Publish without moderation. Only when the reviewer's identity is proven (signed-in, confirmed email) — a typed email is not proof. */
  autoPublish: boolean;
};

export type SubmitReviewResult = { ok: true; status: ReviewStatus; id: string } | { ok: false; error: "duplicate" | "invalid"; message: string };

/** Approved reviews for one product: average, distribution and the latest `limit` (0 = all). */
export async function getProductReviewSummary(productSlug: string, limit = 5): Promise<ReviewSummary> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("reviews")
    .select("id, rating, title, body, customer_name, created_at, verified_purchase, photos")
    .eq("product_slug", productSlug)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(JSON.stringify({ level: "error", event: "reviews", action: "summary_failed", productSlug, error: error.message, ts: new Date().toISOString() }));
    return EMPTY_SUMMARY;
  }
  const rows = (data ?? []) as ReviewRow[];
  const latest = (limit > 0 ? rows.slice(0, limit) : rows).map(toReview);
  return summarise(rows.map((r) => r.rating), latest);
}

/** Approved ratings for many products in one query, keyed by slug. */
export async function getRatingsBySlug(slugs: readonly string[]): Promise<Map<string, ProductRating>> {
  if (slugs.length === 0) return new Map();
  const { data, error } = await getSupabaseServiceClient()
    .from("reviews")
    .select("product_slug, rating")
    .eq("status", "approved")
    .in("product_slug", [...slugs]);
  if (error) {
    console.error(JSON.stringify({ level: "error", event: "reviews", action: "ratings_failed", error: error.message, ts: new Date().toISOString() }));
    return new Map();
  }
  return ratingsBySlug((data ?? []) as Array<{ product_slug: string; rating: number }>);
}

/** Whether this email has already reviewed the product (any status). */
export async function hasReviewed(productSlug: string, customerEmail: string): Promise<boolean> {
  const { data } = await getSupabaseServiceClient()
    .from("reviews")
    .select("id")
    .eq("product_slug", productSlug)
    .eq("customer_email", customerEmail.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const email = input.customerEmail.trim().toLowerCase();
  const verified = input.verifiedOrderId !== null;
  const status: ReviewStatus = verified && input.autoPublish ? "approved" : "pending";
  const { data, error } = await getSupabaseServiceClient()
    .from("reviews")
    .insert({
      product_slug: input.productSlug,
      order_id: input.verifiedOrderId,
      profile_id: input.profileId,
      customer_name: input.customerName.trim(),
      customer_email: email,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      photos: input.photos,
      verified_purchase: verified,
      status,
      ...(verified ? { moderated_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate", message: "You have already reviewed this piece — thank you!" };
    console.error(JSON.stringify({ level: "error", event: "reviews", action: "submit_failed", productSlug: input.productSlug, error: error.message, ts: new Date().toISOString() }));
    return { ok: false, error: "invalid", message: "We could not save your review. Please try again." };
  }
  return { ok: true, status, id: (data as { id: string }).id };
}

/** Newest approved reviews site-wide, photos first; for the homepage. */
export async function latestApprovedShowcase(limit = 6): Promise<{ total: number; reviews: Array<Review & { productSlug: string }> }> {
  const db = getSupabaseServiceClient();
  const [{ count }, { data, error }] = await Promise.all([
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("reviews").select(ROW_COLUMNS).eq("status", "approved").order("created_at", { ascending: false }).limit(60),
  ]);
  if (error) return { total: 0, reviews: [] };
  const rows = (data ?? []) as ReviewRow[];
  const reviews = rows.map((r) => ({ ...toReview(r), productSlug: r.product_slug }));
  return { total: count ?? reviews.length, reviews: pickShowcase(reviews, limit) };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listReviews(status: ReviewStatus): Promise<AdminReview[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("reviews")
    .select(ROW_COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data ?? []) as AdminReview[];
}

export async function countPendingReviews(): Promise<number> {
  const { count } = await getSupabaseServiceClient().from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function moderateReview(id: string, status: Exclude<ReviewStatus, "pending">, note?: string | null): Promise<{ ok: true; productSlug: string } | { ok: false; error: string }> {
  const { data, error } = await getSupabaseServiceClient()
    .from("reviews")
    .update({ status, admin_note: note?.trim() || null, moderated_at: new Date().toISOString() })
    .eq("id", id)
    .select("product_slug")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Review not found." };
  return { ok: true, productSlug: (data as { product_slug: string }).product_slug };
}

export async function deleteReview(id: string): Promise<{ ok: true; productSlug: string } | { ok: false; error: string }> {
  const { data, error } = await getSupabaseServiceClient().from("reviews").delete().eq("id", id).select("product_slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Review not found." };
  return { ok: true, productSlug: (data as { product_slug: string }).product_slug };
}
