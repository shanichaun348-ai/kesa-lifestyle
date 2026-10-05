import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";

export default async function SeoPage() {
  await requireAdmin("seo:read");

  const repo = getCatalogRepository();
  const [categories, collections, products] = await Promise.all([
    repo.getCategories(),
    repo.getCollections(),
    repo.getAllActiveProducts(),
  ]);

  const withSeoTitle = categories.filter((c) => c.seoTitle).length;
  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const hasFeedToken = !!process.env.FEED_TOKEN;
  const feedUrl = `/api/feed/google-shopping${hasFeedToken ? "?token=••••••••" : ""}`;
  const feedUrlFull = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/feed/google-shopping${hasFeedToken ? "?token=<FEED_TOKEN>" : ""}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Metadata, canonicals, noindex and redirects" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Categories", value: categories.length, note: `${withSeoTitle} have custom SEO title` },
          { label: "Collections", value: collections.length, note: `${collections.filter((c) => c.seoTitle).length} have custom SEO title` },
          { label: "Redirects", value: "0", note: "Manage below" },
          { label: "Noindex pages", value: "3", note: "Login, checkout, admin" },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">{s.label}</p>
            <p className="mt-1 text-2xl font-medium text-ink">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <a href="/admin/seo/redirects/" className="rounded-md border border-line bg-surface p-5 hover:border-ink-muted hover:shadow-(--shadow-float) transition-shadow">
          <p className="font-medium text-ink">Redirects</p>
          <p className="mt-1 text-sm text-ink-muted">Manage 301 and 302 redirects for changed or deleted URLs</p>
        </a>
        <div className="rounded-md border border-line bg-surface p-5">
          <p className="font-medium text-ink">Sitemap</p>
          <p className="mt-1 text-sm text-ink-muted">Auto-generated from products, categories and collections</p>
          <a href="/sitemap.xml" target="_blank" rel="noopener" className="mt-2 inline-block text-sm text-brand hover:underline">View sitemap.xml ↗</a>
        </div>
      </div>

      {/* Product Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-ink">Product feed — Google Merchant Center</h2>
          <Link
            href="/api/feed/google-shopping"
            target="_blank"
            rel="noopener"
            className="text-sm text-brand hover:underline"
          >
            Preview feed ↗
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Feed stats */}
          {[
            { label: "Products in feed", value: products.length, note: "active, published" },
            { label: "Feed items (offers)", value: totalVariants, note: "one per variant" },
            { label: "Token security", value: hasFeedToken ? "Enabled" : "Disabled", note: hasFeedToken ? "FEED_TOKEN set" : "Set FEED_TOKEN env var" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-line bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">{s.label}</p>
              <p className="mt-1 text-2xl font-medium text-ink">{s.value}</p>
              <p className={`mt-0.5 text-xs ${s.label === "Token security" && !hasFeedToken ? "text-warning" : "text-ink-muted"}`}>{s.note}</p>
            </div>
          ))}
        </div>

        {/* Feed URL */}
        <div className="mt-4 rounded-md border border-line bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Feed URL (for GMC scheduled fetch)</p>
          {feedUrlFull ? (
            <p className="mt-2 break-all font-mono text-sm text-ink">{feedUrlFull}</p>
          ) : (
            <p className="mt-2 break-all font-mono text-sm text-ink">
              {`<NEXT_PUBLIC_SITE_URL>${feedUrl}`}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            Set <code className="rounded bg-surface-muted px-1 font-mono">NEXT_PUBLIC_SITE_URL</code> to your production HTTPS domain.
            {!hasFeedToken && (
              <> Set <code className="rounded bg-surface-muted px-1 font-mono">FEED_TOKEN</code> to a secret and append <code className="rounded bg-surface-muted px-1 font-mono">?token=&lt;value&gt;</code> to the URL above.</>
            )}
          </p>
        </div>

        {/* GMC setup checklist */}
        <div className="mt-4 rounded-md border border-line bg-surface p-5">
          <p className="text-sm font-medium text-ink">GMC setup checklist</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {[
              { done: !!feedUrlFull, label: "NEXT_PUBLIC_SITE_URL set to production HTTPS domain" },
              { done: hasFeedToken, label: "FEED_TOKEN set (feed is public without it)" },
              { done: false, label: "Google Merchant Center account created at merchants.google.com" },
              { done: false, label: "Website domain verified and claimed in GMC" },
              { done: false, label: "Business information completed (name, address, email)" },
              { done: false, label: "Shipping service created for India (₹59 flat / free ≥ ₹999)" },
              { done: false, label: "Return policy created in GMC → set GOOGLE_RETURN_POLICY_LABEL" },
              { done: false, label: "Feed registered as scheduled fetch with URL above (daily, 2 AM IST)" },
              { done: false, label: "First fetch triggered and products approved" },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 text-xs ${item.done ? "text-success" : "text-ink-subtle"}`}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className={item.done ? "text-ink" : undefined}>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Full setup guide: <code className="rounded bg-surface-muted px-1 font-mono">docs/14_GOOGLE_MERCHANT_CENTER.md</code>
          </p>
        </div>
      </section>

      {/* Category SEO */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-ink">Category metadata</h2>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Category</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">SEO title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Indexed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.slice(0, 8).map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{cat.name}</p>
                    <p className="font-mono text-xs text-ink-subtle">/{cat.path}/</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{cat.seoTitle ?? <span className="text-ink-subtle italic">Auto-generated</span>}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-success">✓ Indexed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
