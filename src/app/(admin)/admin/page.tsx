import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { seedOrders } from "@/lib/demo/seed-orders";
import { seedCustomers } from "@/lib/demo/seed-customers";
import { seedProducts } from "@/lib/demo/seed-catalog";

export default async function AdminDashboard() {
  const session = await requireAdmin();

  const canSeeOrders = hasPermission(session.role, "orders:read");
  const canSeeProducts = hasPermission(session.role, "products:read");
  const canSeeCustomers = hasPermission(session.role, "customers:read");

  const totalRevenue = seedOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalPaise, 0);

  const pendingOrders = seedOrders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const activeProducts = seedProducts.filter((p) => p.status === "active").length;
  const totalCustomers = seedCustomers.length;

  const recentOrders = [...seedOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium text-ink">Dashboard</h1>
        <p className="mt-0.5 text-sm text-ink-muted">Welcome back, {session.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {canSeeOrders ? (
          <>
            <StatCard
              label="Revenue (paid)"
              value={`₹${(totalRevenue / 100).toLocaleString("en-IN")}`}
              sub="All time"
            />
            <StatCard
              label="Pending orders"
              value={pendingOrders}
              sub="Needs action"
              {...(pendingOrders > 0 ? { trend: { direction: "down" as const, label: "Needs fulfilment" } } : {})}
            />
          </>
        ) : null}
        {canSeeProducts ? (
          <StatCard label="Active products" value={activeProducts} sub={`of ${seedProducts.length} total`} />
        ) : null}
        {canSeeCustomers ? (
          <StatCard label="Customers" value={totalCustomers} sub="Registered accounts" />
        ) : null}
      </div>

      {/* Recent orders */}
      {canSeeOrders ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-ink">Recent orders</h2>
            <Link href="/admin/orders/" className="text-sm text-brand hover:underline">View all →</Link>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-surface">
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
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <a href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">
                        {order.number}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{order.customer.name}</td>
                    <td className="px-4 py-3 font-medium text-ink">₹{(order.totalPaise / 100).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium ${
                        order.status === "delivered" ? "border-success/20 bg-success/10 text-success"
                        : order.status === "cancelled" || order.status === "refunded" ? "border-danger/20 bg-danger/10 text-danger"
                        : "border-warning/20 bg-warning/10 text-warning"
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-base font-medium text-ink">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {canSeeProducts ? (
            <Link href="/admin/products/new/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
              + Add product
            </Link>
          ) : null}
          {hasPermission(session.role, "coupons:write") ? (
            <Link href="/admin/coupons/new/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
              + Create coupon
            </Link>
          ) : null}
          {hasPermission(session.role, "content:write") ? (
            <Link href="/admin/content/" className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
              Edit homepage
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
