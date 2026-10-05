import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, orderStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getCustomerById } from "@/lib/demo/seed-customers";
import { seedOrders } from "@/lib/demo/seed-orders";
import { formatPaise } from "@/lib/money";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdmin("customers:read");
  const customer = getCustomerById(id);
  if (!customer) notFound();

  const canWrite = hasPermission(session.role, "customers:write");
  const customerOrders = seedOrders.filter((o) => o.customer.id === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.email}
        back={{ href: "/admin/customers/", label: "Customers" }}
        actions={
          <StatusBadge
            label={customer.status === "active" ? "Active" : "Suspended"}
            variant={customer.status === "active" ? "success" : "danger"}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-line bg-surface p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink">Orders ({customerOrders.length})</h2>
            {customerOrders.length === 0 ? (
              <p className="text-sm text-ink-muted">No orders yet.</p>
            ) : (
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
                  {customerOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3">
                        <a href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">
                          {order.number}
                        </a>
                      </td>
                      <td className="py-3 text-ink-muted">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 text-right font-medium text-ink">{formatPaise(order.totalPaise)}</td>
                      <td className="py-3">{orderStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Contact</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-ink-subtle">Email</p>
                <p className="text-ink">{customer.email}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Phone</p>
                <p className="text-ink">{customer.phone}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-subtle">Orders</span>
                <span className="font-medium text-ink">{customer.orderCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Total spent</span>
                <span className="font-medium text-ink">
                  {customer.totalSpentPaise > 0 ? formatPaise(customer.totalSpentPaise) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Member since</span>
                <span className="text-ink">{new Date(customer.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          </section>

          {canWrite ? (
            <section className="rounded-md border border-line bg-surface p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">Actions</h2>
              {customer.status === "active" ? (
                <button className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
                  Suspend account
                </button>
              ) : (
                <button className="w-full rounded-md border border-success/30 bg-success/5 px-3 py-2 text-left text-sm text-success hover:bg-success/10">
                  Reinstate account
                </button>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
