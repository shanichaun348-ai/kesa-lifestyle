import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { RatingStars } from "@/components/storefront/rating-stars";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { countPendingReviews, listReviews } from "@/modules/reviews/supabase-reviews";
import type { ReviewStatus } from "@/modules/reviews/summary";

import { ModerateReview } from "./_moderate";

const TABS: Array<{ label: string; value: ReviewStatus }> = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

type Props = { searchParams: Promise<{ status?: string }> };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function ReviewsPage({ searchParams }: Props) {
  const [, { status }] = await Promise.all([requireAdmin("reviews:moderate"), searchParams]);
  const active: ReviewStatus = TABS.find((t) => t.value === status)?.value ?? "pending";
  const [reviews, pending] = await Promise.all([listReviews(active), countPendingReviews()]);
  const products = await getCatalogRepository().getAllProducts();
  const nameOf = new Map(products.map((p) => [p.slug, p.name]));

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description={pending > 0 ? `${pending} waiting for a decision` : "Nothing waiting — all caught up"} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/reviews/?status=${t.value}`}
            className={`rounded-sm border px-3 py-1.5 text-sm ${t.value === active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}
          >
            {t.label}
            {t.value === "pending" && pending > 0 ? <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-xs text-warning">{pending}</span> : null}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-md border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">No {active} reviews.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-md border border-line bg-surface p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <RatingStars rating={r.rating} />
                    <Link href={`/admin/products/${r.product_slug}/`} className="text-sm font-medium text-brand hover:underline">
                      {nameOf.get(r.product_slug) ?? r.product_slug}
                    </Link>
                    {r.verified_purchase ? <StatusBadge label="Verified purchase" variant="success" /> : <StatusBadge label="Unverified" variant="neutral" />}
                    <span className="text-xs text-ink-subtle">{dateFormat.format(new Date(r.created_at))}</span>
                  </div>
                  {r.title ? <p className="font-medium text-ink">{r.title}</p> : null}
                  <p className="whitespace-pre-line text-sm text-ink-muted">{r.body}</p>
                  {r.photos && r.photos.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {r.photos.map((p, i) => (
                        <li key={i}>
                          <a href={p.src} target="_blank" rel="noopener noreferrer" className="block size-16 overflow-hidden rounded-sm border border-line">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.src} alt="" className="size-full object-cover" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-ink-subtle">
                    {r.customer_name} · {r.customer_email}
                    {r.order_id ? ` · order ${r.order_id}` : ""}
                    {r.admin_note ? ` · note: ${r.admin_note}` : ""}
                  </p>
                </div>
                <ModerateReview id={r.id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
