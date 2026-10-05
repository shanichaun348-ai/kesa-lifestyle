import type { ImageRef } from "@/modules/catalog/types";

export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  authorName: string;
  /** ISO date. */
  createdAt: string;
  verifiedPurchase: boolean;
  images?: ImageRef[] | undefined;
};

export type ReviewSummary = {
  count: number;
  /** Null when there are no reviews; never a placeholder number. */
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Latest approved reviews (bounded). */
  reviews: Review[];
};

export const EMPTY_SUMMARY: ReviewSummary = {
  count: 0,
  average: null,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  reviews: [],
};

/** Contract implemented by the Postgres reviews module in Phase 3. */
export interface ReviewsRepository {
  getSummaryForProduct(productSlug: string, limit: number): Promise<ReviewSummary>;
}

/**
 * Until the reviews table exists there are no reviews. This implementation
 * returns the empty summary so the UI shows "no reviews yet" and the schema
 * omits AggregateRating/Review entirely (docs/06 §3). Nothing is invented.
 */
export class NoReviewsRepository implements ReviewsRepository {
  async getSummaryForProduct(): Promise<ReviewSummary> {
    return EMPTY_SUMMARY;
  }
}
