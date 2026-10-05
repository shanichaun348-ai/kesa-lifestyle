import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

const GUIDES = [
  { id: "g1", title: "Gifts for Her Under ₹999", type: "gift", updatedAt: "2026-09-15" },
  { id: "g2", title: "Diwali Gift Guide", type: "gift", updatedAt: "2026-09-01" },
  { id: "g3", title: "How to Layer Necklaces", type: "style", updatedAt: "2026-08-20" },
  { id: "g4", title: "Office-to-Evening Look Guide", type: "style", updatedAt: "2026-08-10" },
];

type Props = { searchParams: Promise<{ type?: string }> };

export default async function GuidesPage({ searchParams }: Props) {
  await requireAdmin("content:write");
  const { type } = await searchParams;
  const filtered = type ? GUIDES.filter((g) => g.type === type) : GUIDES;
  const heading = type === "gift" ? "Gift guides" : type === "style" ? "Style guides" : "All guides";

  return (
    <div className="space-y-6">
      <PageHeader
        title={heading}
        back={{ href: "/admin/content/", label: "Content" }}
        actions={
          <button className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
            + New guide
          </button>
        }
      />

      <div className="flex gap-2">
        <a href="/admin/content/guides/" className={`rounded-sm border px-3 py-1.5 text-sm ${!type ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}>All</a>
        <a href="/admin/content/guides/?type=gift" className={`rounded-sm border px-3 py-1.5 text-sm ${type === "gift" ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}>Gift guides</a>
        <a href="/admin/content/guides/?type=style" className={`rounded-sm border px-3 py-1.5 text-sm ${type === "style" ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}>Style guides</a>
      </div>

      <div className="space-y-3">
        {filtered.map((guide) => (
          <div key={guide.id} className="flex items-center justify-between rounded-md border border-line bg-surface p-4">
            <div>
              <p className="font-medium text-ink">{guide.title}</p>
              <p className="mt-0.5 text-xs text-ink-subtle capitalize">{guide.type} guide · Updated {guide.updatedAt}</p>
            </div>
            <button className="text-sm text-brand hover:underline">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
