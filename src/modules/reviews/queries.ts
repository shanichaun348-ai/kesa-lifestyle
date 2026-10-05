import "server-only";

import { NoReviewsRepository, type ReviewsRepository, type ReviewSummary } from "./types";

let repository: ReviewsRepository | null = null;

export function getReviewsRepository(): ReviewsRepository {
  repository ??= new NoReviewsRepository();
  return repository;
}

export async function getProductReviewSummary(productSlug: string, limit = 5): Promise<ReviewSummary> {
  return getReviewsRepository().getSummaryForProduct(productSlug, limit);
}
