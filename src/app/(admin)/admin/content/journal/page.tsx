import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { demoJournalPosts } from "@/lib/demo/homepage";

export default async function JournalPage() {
  await requireAdmin("content:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal posts"
        back={{ href: "/admin/content/", label: "Content" }}
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
            + New post
          </button>
        }
      />

      <div className="space-y-3">
        {demoJournalPosts.map((post, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-line bg-surface p-4">
            <div>
              <p className="font-medium text-ink">{post.title}</p>
              <p className="mt-0.5 text-xs text-ink-subtle">{post.category}</p>
            </div>
            <button className="text-sm text-brand hover:underline">Edit</button>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-subtle">Journal CRUD requires Postgres (D10). Changes are demo only.</p>
    </div>
  );
}
