import { PageHeader } from "@/components/admin/page-header";
import { orderStatusBadge, paymentStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { seedOrders } from "@/lib/demo/seed-orders";
import { formatPaise } from "@/lib/money";

export default async function OrdersPage() {
  await requireAdmin("orders:read");

  const orders = [...seedOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description={`${orders.length} orders`} />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["All", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Refunded"].map((f) => (
          <button key={f} className={`rounded-sm border px-3 py-1.5 text-sm ${f === "All" ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Order</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Total</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{order.number}</p>
                    <p className="text-xs text-ink-subtle">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{order.customer.name}</td>
                <td className="px-4 py-3 font-medium text-ink">{formatPaise(order.totalPaise)}</td>
                <td className="hidden px-4 py-3 md:table-cell">{paymentStatusBadge(order.paymentStatus)}</td>
                <td className="px-4 py-3">{orderStatusBadge(order.status)}</td>
                <td className="px-4 py-3 text-right">
                  <a href={`/admin/orders/${order.id}/`} className="text-sm text-brand hover:underline">
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
