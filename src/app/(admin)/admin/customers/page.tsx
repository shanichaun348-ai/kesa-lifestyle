import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { listCustomers } from "@/modules/admin/orders-data";
import { formatPaise } from "@/lib/money";

export default async function CustomersPage() {
  await requireAdmin("customers:read");
  const customers = await listCustomers();

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${customers.length} customers who have placed an order`} />

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {customers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">No customers yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Name</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Email</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Orders</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Spent</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Last order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => (
                <tr key={c.key} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-subtle">{c.phone}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{c.email}</td>
                  <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{c.orderCount}</td>
                  <td className="hidden px-4 py-3 text-ink lg:table-cell">{c.totalSpentPaise > 0 ? formatPaise(c.totalSpentPaise) : "—"}</td>
                  <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">{new Date(c.lastOrderAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/customers/${encodeURIComponent(c.key)}/`} className="text-sm text-brand hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
