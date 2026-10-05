import { RatingStars } from "@/components/storefront/rating-stars";
import { SectionHeading } from "@/components/storefront/section-heading";

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  location?: string | undefined;
  product: string;
};

type ReviewsProps = {
  reviews: readonly Review[];
  /** Shown beneath the grid while reviews are sample data. */
  notice?: string | undefined;
};

/**
 * Customer reviews. No AggregateRating or Review structured data is emitted
 * here on purpose: schema is generated only from verified reviews in the
 * database (docs/06 §3), never from demo content.
 */
export function Reviews({ reviews, notice }: ReviewsProps) {
  return (
    <section aria-labelledby="reviews-title" className="container-page">
      <SectionHeading eyebrow="From customers" title="Worn and reviewed" className="mb-6" />
      <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
        {reviews.map((r) => (
          <li key={r.id}>
            <article className="flex h-full flex-col gap-3 rounded-md border border-line bg-surface p-5">
              <RatingStars rating={r.rating} />
              <h3 className="text-base font-medium text-ink">{r.title}</h3>
              <blockquote className="type-small flex-1 text-ink-muted">{r.body}</blockquote>
              <footer className="type-small text-ink-subtle">
                <span className="text-ink">{r.author}</span>
                {r.location ? `, ${r.location}` : null}
                <span className="block">on {r.product}</span>
              </footer>
            </article>
          </li>
        ))}
      </ul>
      {notice ? <p className="type-small mt-4 text-ink-subtle">{notice}</p> : null}
    </section>
  );
}
