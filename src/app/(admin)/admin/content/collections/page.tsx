import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";

export default async function AdminCollectionsPage() {
  const session = await requireAdmin("content:read");
  const collections = await getCatalogRepository().getCollections();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        back={{ href: "/admin/content/", label: "Content" }}
        actions={
          session.role === "owner" || session.role === "catalogue_manager" ? (
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
              + New collection
            </button>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Name</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Slug</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {collections.map((c) => (
              <tr key={c.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted md:table-cell">{c.slug}</td>
                <td className="hidden px-4 py-3 text-ink-muted sm:table-cell capitalize">{c.kind}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={c.isVisible ? "Visible" : "Hidden"} variant={c.isVisible ? "success" : "neutral"} />
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={`/collections/${c.slug}/`} target="_blank" rel="noopener" className="text-sm text-brand hover:underline">
                    View ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
