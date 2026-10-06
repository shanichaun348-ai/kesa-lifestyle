import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { orderStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { dashboardStats, formatOrderNumber } from "@/modules/admin/orders-data";
import { hasPermission } from "@/modules/admin/rbac";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { formatPaise } from "@/lib/money";

export default async function AdminDashboard() {
  const session = await requireAdmin();

  const canSeeOrders = hasPermission(session.role, "orders:read");
  const canSeeProducts = hasPermission(session.role, "products:read");
  const canSeeCustomers = hasPermission(session.role, "customers:read");

  const [stats, activeProducts] = await Promise.all([
    canSeeOrders || canSeeCustomers ? dashboardStats() : null,
    canSeeProducts ? getCatalogRepository().getAllActiveProducts() : null,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium text-ink">Dashboard</h1>
        <p className="mt-0.5 text-sm text-ink-muted">Welcome back, {session.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {canSeeOrders && stats ? (
          <>
            <StatCard label="Revenue (paid)" value={formatPaise(stats.revenuePaise)} sub="All time" />
            <StatCard
              label="Orders to fulfil"
              value={stats.needsAction}
              sub="Paid, not yet shipped"
              {...(stats.needsAction > 0 ? { trend: { direction: "down" as const, label: "Needs action" } } : {})}
            />
          </>
        ) : null}
        {canSeeProducts && activeProducts ? (
          <StatCard label="Active products" value={activeProducts.length} sub="Live in store" />
        ) : null}
        {canSeeCustomers && stats ? (
          <StatCard label="Customers" value={stats.customers} sub="Have placed an order" />
        ) : null}
      </div>

      {canSeeOrders && stats ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-ink">Recent orders</h2>
            <Link href="/admin/orders/" className="text-sm text-brand hover:underline">View all →</Link>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            {stats.recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink-muted">No orders yet. They will appear here as soon as a customer checks out.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-muted">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.recent.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">
                          {formatOrderNumber(order.orderNumber)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{order.customer.name}</td>
                      <td className="px-4 py-3 font-medium text-ink">{formatPaise(order.totalPaise)}</td>
                      <td className="px-4 py-3">{orderStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-base font-medium text-ink">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {canSeeProducts ? (
            <Link href="/admin/products/new/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">+ Add product</Link>
          ) : null}
          {hasPermission(session.role, "coupons:write") ? (
            <Link href="/admin/coupons/new/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">+ Create coupon</Link>
          ) : null}
          {hasPermission(session.role, "content:write") ? (
            <Link href="/admin/content/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">Edit homepage</Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
