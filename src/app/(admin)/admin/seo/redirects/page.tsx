import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

// Demo redirect rules — replace with DB table once Postgres (D10) is connected.
const DEMO_REDIRECTS = [
  { id: "r1", from: "/jewellery/", to: "/women/", type: "301", active: true },
  { id: "r2", from: "/shop/", to: "/women/", type: "301", active: true },
];

export default async function RedirectsPage() {
  await requireAdmin("seo:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redirects"
        back={{ href: "/admin/seo/", label: "SEO" }}
        description="301 and 302 redirects for changed or removed URLs"
        actions={
          <button className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
            + Add redirect
          </button>
        }
      />

      {DEMO_REDIRECTS.length === 0 ? (
        <div className="rounded-md border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-muted">No redirects configured.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DEMO_REDIRECTS.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{r.from}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.to}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-sm border border-line px-2 py-0.5 text-xs text-ink-muted">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-danger hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-subtle">Redirect rules require next.config.ts rewrites and DB storage. Full implementation ships with Postgres (D10).</p>
    </div>
  );
}
