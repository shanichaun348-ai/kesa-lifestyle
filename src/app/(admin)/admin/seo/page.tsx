import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";

export default async function SeoPage() {
  await requireAdmin("seo:read");

  const [categories, collections] = await Promise.all([
    getCatalogRepository().getCategories(),
    getCatalogRepository().getCollections(),
  ]);

  const withSeoTitle = categories.filter((c) => c.seoTitle).length;

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
