import Link from "next/link";
import { BadgeCheckIcon } from "lucide-react";

import { RatingStars } from "@/components/storefront/rating-stars";
import { SectionHeading } from "@/components/storefront/section-heading";
import type { ImageRef } from "@/modules/catalog/types";

export type HomeReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  location?: string | undefined;
  /** Product name shown under the quote. */
  product: string;
  /** Link to the product; absent for sample content. */
  productHref?: string | undefined;
  verified?: boolean | undefined;
  images?: ImageRef[] | undefined;
};

type ReviewsProps = {
  reviews: readonly HomeReview[];
  /** Shown beneath the grid while reviews are sample data. */
  notice?: string | undefined;
};

/**
 * Customer reviews. No AggregateRating or Review structured data is emitted
 * here on purpose: schema is generated only from approved reviews on the
 * product pages (docs/06 §3), never from demo content.
 */
export function Reviews({ reviews, notice }: ReviewsProps) {
  return (
    <section aria-labelledby="reviews-title" className="container-page reveal">
      <SectionHeading eyebrow="From customers" title="Worn and reviewed" className="mb-6" />
      <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
        {reviews.map((r) => (
          <li key={r.id}>
            <article className="relative flex h-full flex-col gap-3 rounded-md border border-line bg-surface p-6 transition-[transform,box-shadow] duration-400 ease-(--ease-standard) motion-safe:hover:-translate-y-1 hover:shadow-(--shadow-float)">
              <span aria-hidden="true" className="absolute top-3 right-5 font-display text-6xl leading-none text-line-strong/60">&ldquo;</span>
              {r.images && r.images.length > 0 ? (
                <div className="-mx-6 -mt-6 mb-1 aspect-[4/3] overflow-hidden rounded-t-md bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.images[0]!.src} alt={r.images[0]!.alt} loading="lazy" className="size-full object-cover" />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <RatingStars rating={r.rating} />
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                    Verified
                  </span>
                ) : null}
              </div>
              {r.title ? <h3 className="text-base font-medium text-ink">{r.title}</h3> : null}
              <blockquote className="type-small line-clamp-5 flex-1 text-ink-muted">{r.body}</blockquote>
              <footer className="type-small text-ink-subtle">
                <span className="text-ink">{r.author}</span>
                {r.location ? `, ${r.location}` : null}
                <span className="block">
                  on{" "}
                  {r.productHref ? (
                    <Link href={r.productHref} className="underline-offset-4 hover:text-ink hover:underline">
                      {r.product}
                    </Link>
                  ) : (
                    r.product
                  )}
                </span>
              </footer>
            </article>
          </li>
        ))}
      </ul>
      {notice ? <p className="type-small mt-4 text-ink-subtle">{notice}</p> : null}
    </section>
  );
}
