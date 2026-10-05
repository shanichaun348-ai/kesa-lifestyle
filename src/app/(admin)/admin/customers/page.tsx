import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { seedCustomers } from "@/lib/demo/seed-customers";
import { formatPaise } from "@/lib/money";

export default async function CustomersPage() {
  await requireAdmin("customers:read");

  const customers = [...seedCustomers].sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${customers.length} accounts`} />

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Name</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Email</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Orders</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Spent</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-subtle">{c.phone}</p>
                </td>
                <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{c.email}</td>
                <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{c.orderCount}</td>
                <td className="hidden px-4 py-3 text-ink lg:table-cell">
                  {c.totalSpentPaise > 0 ? formatPaise(c.totalSpentPaise) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={c.status === "active" ? "Active" : "Suspended"}
                    variant={c.status === "active" ? "success" : "danger"}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={`/admin/customers/${c.id}/`} className="text-sm text-brand hover:underline">
                    View
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
