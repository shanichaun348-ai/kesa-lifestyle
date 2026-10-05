import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { ReviewForm } from "@/components/account/review-form";
import { RatingStars } from "@/components/storefront/rating-stars";
import { requireUser } from "@/lib/auth/guard";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

export default async function ReviewsPage() {
  const user = await requireUser("/account/reviews/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const [eligible, reviews] = await Promise.all([service.reviews.eligibleItems(user.id), service.reviews.list(user.id)]);

  return (
    <>
      <AccountHeading title="Reviews" intro="Reviews are verified purchases only and are published after a quick moderation check." />
      <section aria-labelledby="pending-title" className="mb-10">
        <h2 id="pending-title" className="type-h3 mb-3">
          Waiting for your review
        </h2>
        {eligible.length === 0 ? (
          <p className="type-small text-ink-muted">Nothing to review right now. Delivered items appear here.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {eligible.map((item) => (
              <ReviewForm key={item.orderItemId} orderItemId={item.orderItemId} productName={item.productName} />
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="done-title">
        <h2 id="done-title" className="type-h3 mb-3">
          Your reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="type-small text-ink-muted">You have not written any reviews yet.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/products/${r.productSlug}/`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {r.productName}
                  </Link>
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "muted"}>{r.status}</Badge>
                </div>
                <RatingStars rating={r.rating} />
                <p className="text-ink">{r.title}</p>
                <p className="type-small text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
