import { RatingStars } from "@/components/storefront/rating-stars";
import type { ReviewSummary } from "@/modules/reviews/types";

type ProductReviewsProps = {
  productName: string;
  summary: ReviewSummary;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Reviews section. Shows real reviews when they exist; otherwise an honest
 * empty state. Never renders placeholder stars or invented counts.
 */
export function ProductReviews({ productName, summary }: ProductReviewsProps) {
  return (
    <section aria-labelledby="reviews-title" className="border-t border-line pt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-eyebrow text-ink-subtle">Reviews</p>
          <h2 id="reviews-title" className="type-h2 mt-2">
            What customers say
          </h2>
        </div>
        {summary.count > 0 && summary.average !== null ? (
          <div className="flex items-center gap-3">
            <span className="type-h3 tabular-nums">{summary.average.toFixed(1)}</span>
            <RatingStars rating={summary.average} count={summary.count} size="md" />
          </div>
        ) : null}
      </div>

      {summary.count === 0 ? (
        <div className="mt-6 rounded-md border border-line bg-surface p-6">
          <p className="text-base text-ink">No reviews yet for {productName}.</p>
          <p className="type-small mt-1 text-ink-muted">
            Reviews come from verified buyers after delivery. Once orders are flowing, the first ones will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {summary.reviews.map((r) => (
            <li key={r.id}>
              <article className="flex h-full flex-col gap-2 rounded-md border border-line bg-surface p-5">
                <RatingStars rating={r.rating} />
                <h3 className="text-base font-medium text-ink">{r.title}</h3>
                <p className="type-small flex-1 text-ink-muted">{r.body}</p>
                <footer className="type-small text-ink-subtle">
                  <span className="text-ink">{r.authorName}</span>
                  {r.verifiedPurchase ? " · Verified buyer" : null} · <time dateTime={r.createdAt}>{dateFormat.format(new Date(r.createdAt))}</time>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
