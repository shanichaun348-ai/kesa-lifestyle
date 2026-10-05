import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

export default async function HomepageEditorPage() {
  await requireAdmin("content:write");

  return (
    <div className="space-y-6">
      <PageHeader title="Homepage sections" back={{ href: "/admin/content/", label: "Content" }} description="Reorder, show or hide homepage sections" />

<div className="max-w-2xl space-y-3">
        {["Hero banner", "Gender tiles (Women / Men)", "Category tiles", "New arrivals rail", "Brand statement", "Why Kesa", "Reviews", "Journal preview", "Newsletter"].map((label, i) => (
          <div key={label} className="flex items-center gap-4 rounded-md border border-line bg-surface p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-xs text-ink-subtle">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{label}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-sm border border-success/30 bg-success/5 px-2.5 py-1 text-xs font-medium text-success">
                Visible
              </button>
              <button className="text-xs text-ink-subtle hover:text-ink">↑</button>
              <button className="text-xs text-ink-subtle hover:text-ink">↓</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-subtle">Homepage section ordering requires Postgres (D10). Changes shown are demo only.</p>
    </div>
  );
}
