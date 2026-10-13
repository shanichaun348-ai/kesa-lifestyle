import { Suspense } from "react";
import Link from "next/link";
import { BadgeCheckIcon } from "lucide-react";

import { ReviewForm } from "@/components/product/review-form";
import { RatingStars } from "@/components/storefront/rating-stars";
import type { ReviewSummary } from "@/modules/reviews/types";

type ProductReviewsProps = {
  productSlug: string;
  productName: string;
  summary: ReviewSummary;
  /** Signed-in customer's email, if any; pre-fills and locks the form's email field. */
  sessionEmail?: string | null | undefined;
  /** True when every approved review is in `summary.reviews` (the `?reviews=all` view). */
  showingAll: boolean;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Reviews section: summary, the review form, and the approved reviews with
 * photos. Never renders placeholder stars or invented counts.
 */
export function ProductReviews({ productSlug, productName, summary, sessionEmail, showingAll }: ProductReviewsProps) {
  const hidden = summary.count - summary.reviews.length;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24 border-t border-highlight/25 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-eyebrow text-highlight">Reviews</p>
          <h2 id="reviews-title" className="type-h2 mt-2">
            What customers say
          </h2>
          <span className="lux-divider mt-3" aria-hidden="true" />
        </div>
        {summary.count > 0 && summary.average !== null ? (
          <div className="flex items-center gap-3">
            <span className="type-h3 tabular-nums">{summary.average.toFixed(1)}</span>
            <RatingStars rating={summary.average} count={summary.count} size="md" />
          </div>
        ) : null}
      </div>

      {summary.count > 0 ? (
        <dl className="mt-5 grid max-w-sm grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-sm" aria-label="Rating breakdown">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const share = summary.count ? (summary.distribution[n] / summary.count) * 100 : 0;
            return (
              <div key={n} className="contents">
                <dt className="text-ink-muted">{n} star</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-highlight" style={{ width: `${share}%` }} />
                </dd>
                <dd className="tabular-nums text-ink-subtle">{summary.distribution[n]}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      <div className="mt-6">
        <Suspense fallback={null}>
          <ReviewForm productSlug={productSlug} productName={productName} sessionEmail={sessionEmail} />
        </Suspense>
      </div>

      {summary.count === 0 ? (
        <div className="lux-surface mt-6 rounded-md p-6">
          <p className="text-base text-ink">No reviews yet for {productName}.</p>
          <p className="type-small mt-1 text-ink-muted">Be the first — reviews from verified buyers are published straight away.</p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {summary.reviews.map((r) => (
              <li key={r.id}>
                <article className="lux-surface flex h-full flex-col gap-2 rounded-md p-5">
                  <div className="flex items-center justify-between gap-3">
                    <RatingStars rating={r.rating} />
                    {r.verifiedPurchase ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                        Verified purchase
                      </span>
                    ) : null}
                  </div>
                  {r.title ? <h3 className="text-base font-medium text-ink">{r.title}</h3> : null}
                  <p className="type-small flex-1 whitespace-pre-line text-ink-muted">{r.body}</p>
                  {r.images && r.images.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-2" aria-label="Customer photos">
                      {r.images.map((img, i) => (
                        <li key={i}>
                          <a href={img.src} target="_blank" rel="noopener noreferrer" className="block size-20 overflow-hidden rounded-sm border border-line bg-surface-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.alt || `Customer photo ${i + 1}`} loading="lazy" className="size-full object-cover transition-transform duration-400 ease-(--ease-standard) motion-safe:hover:scale-110" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <footer className="type-small text-ink-subtle">
                    <span className="text-ink">{r.authorName}</span> · <time dateTime={r.createdAt}>{dateFormat.format(new Date(r.createdAt))}</time>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
          {hidden > 0 && !showingAll ? (
            <p className="mt-5">
              <Link href={`/products/${productSlug}/?reviews=all#reviews`} className="type-small font-medium text-ink underline decoration-line-strong underline-offset-6 hover:decoration-ink">
                Show all {summary.count} reviews
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
