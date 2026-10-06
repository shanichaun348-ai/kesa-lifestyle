import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { orderStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { formatOrderNumber, getCustomer } from "@/modules/admin/orders-data";
import { formatPaise } from "@/lib/money";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  await requireAdmin("customers:read");
  const found = await getCustomer(decodeURIComponent(id));
  if (!found) notFound();
  const { customer, orders } = found;

  return (
    <div className="space-y-6">
      <PageHeader title={customer.name} description={customer.email} back={{ href: "/admin/customers/", label: "Customers" }} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-line bg-surface p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink">Orders ({orders.length})</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Order</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Date</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-subtle">Total</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3">
                      <Link href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">{formatOrderNumber(order.orderNumber)}</Link>
                    </td>
                    <td className="py-3 text-ink-muted">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 text-right font-medium text-ink">{formatPaise(order.totalPaise)}</td>
                    <td className="py-3">{orderStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Contact</h2>
            <div className="space-y-2 text-sm">
              <div><p className="text-xs text-ink-subtle">Email</p><p className="text-ink">{customer.email}</p></div>
              <div><p className="text-xs text-ink-subtle">Phone</p><p className="text-ink">{customer.phone}</p></div>
            </div>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-subtle">Orders</span><span className="font-medium text-ink">{customer.orderCount}</span></div>
              <div className="flex justify-between"><span className="text-ink-subtle">Total spent</span><span className="font-medium text-ink">{customer.totalSpentPaise > 0 ? formatPaise(customer.totalSpentPaise) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink-subtle">First order</span><span className="text-ink">{new Date(customer.firstOrderAt).toLocaleDateString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-ink-subtle">Last order</span><span className="text-ink">{new Date(customer.lastOrderAt).toLocaleDateString("en-IN")}</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
