/**
 * Pure review maths and decisions — no I/O, so they can be unit-tested and
 * shared by the Supabase module, the catalogue repository and the UI.
 */
import type { ImageRef } from "@/modules/catalog/types";

import type { Review, ReviewSummary } from "./types";

export type ReviewStatus = "pending" | "approved" | "rejected";
export type Rating = 1 | 2 | 3 | 4 | 5;

export type ReviewRow = {
  id: string;
  product_slug: string;
  order_id: string | null;
  profile_id: string | null;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  photos: ImageRef[] | null;
  verified_purchase: boolean;
  status: ReviewStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  moderated_at: string | null;
};

export type ProductRating = { value: number; count: number };

export function isRating(n: number): n is Rating {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export function toReview(row: Pick<ReviewRow, "id" | "rating" | "title" | "body" | "customer_name" | "created_at" | "verified_purchase" | "photos">): Review {
  const rating = (isRating(row.rating) ? row.rating : 5) as Rating;
  const photos = (row.photos ?? []).filter((p) => typeof p?.src === "string" && p.src.trim() !== "");
  return {
    id: row.id,
    rating,
    title: row.title?.trim() || "",
    body: row.body,
    authorName: row.customer_name,
    createdAt: row.created_at,
    verifiedPurchase: row.verified_purchase,
    ...(photos.length > 0 ? { images: photos } : {}),
  };
}

/** Average to one decimal and the 1–5 distribution from approved ratings. */
export function summarise(ratings: readonly number[], latest: readonly Review[]): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let count = 0;
  for (const r of ratings) {
    if (!isRating(r)) continue;
    distribution[r] += 1;
    sum += r;
    count += 1;
  }
  return {
    count,
    average: count === 0 ? null : Math.round((sum / count) * 10) / 10,
    distribution,
    reviews: [...latest],
  };
}

/** Per-product rating from a flat list of (slug, rating) pairs; only products with reviews appear. */
export function ratingsBySlug(rows: ReadonlyArray<{ product_slug: string; rating: number }>): Map<string, ProductRating> {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    if (!isRating(row.rating)) continue;
    const cur = acc.get(row.product_slug) ?? { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    acc.set(row.product_slug, cur);
  }
  const out = new Map<string, ProductRating>();
  for (const [slug, { sum, count }] of acc) out.set(slug, { value: Math.round((sum / count) * 10) / 10, count });
  return out;
}

export type PurchaseEvidence = {
  /** Statuses that count as a completed purchase. */
  paidStatuses: ReadonlySet<string>;
  /** The reviewer's orders: status plus the product ids and SKUs on each. */
  orders: ReadonlyArray<{ id: string; status: string; items: ReadonlyArray<{ productId: string; sku: string }> }>;
  /** The product being reviewed. */
  product: { id: string; skus: ReadonlySet<string> };
};

/**
 * The first paid order containing the product, or null. Matches on the
 * catalogue product id or any of its SKUs, since order items snapshot both.
 */
export function verifiedOrderId(evidence: PurchaseEvidence): string | null {
  for (const order of evidence.orders) {
    if (!evidence.paidStatuses.has(order.status)) continue;
    if (order.items.some((i) => i.productId === evidence.product.id || evidence.product.skus.has(i.sku))) return order.id;
  }
  return null;
}

/** Choose the homepage set: photos first, then newest, capped. */
export function pickShowcase<T extends { images?: ImageRef[] | undefined; createdAt: string }>(reviews: readonly T[], limit: number): T[] {
  const byDate = (a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
  const withPhotos = reviews.filter((r) => (r.images?.length ?? 0) > 0).sort(byDate);
  const without = reviews.filter((r) => (r.images?.length ?? 0) === 0).sort(byDate);
  return [...withPhotos, ...without].slice(0, limit);
}
