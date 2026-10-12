import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { orderStatusBadge, paymentStatusBadge } from "@/components/admin/status-badge";
import { courierName } from "@/modules/shipping/couriers";
import { requireAdmin } from "@/modules/admin/guard";
import { formatOrderNumber, listOrders, paymentStatusOf } from "@/modules/admin/orders-data";
import type { OrderStatus } from "@/modules/orders/types";
import { formatPaise } from "@/lib/money";

const FILTERS: Array<{ label: string; value?: OrderStatus }> = [
  { label: "All" },
  { label: "To process", value: "PAID" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Awaiting payment", value: "CREATED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  await requireAdmin("orders:read");
  const { status } = await searchParams;
  const active = FILTERS.find((f) => f.value === status)?.value;
  const orders = await listOrders(active);

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description={`${orders.length} ${active ? FILTERS.find((f) => f.value === active)!.label.toLowerCase() : ""} orders`} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const selected = f.value === active;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/orders/?status=${f.value}` : "/admin/orders/"}
              className={`rounded-sm border px-3 py-1.5 text-sm ${selected ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">No orders here yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Order</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Customer</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Items</th>
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
                    <p className="font-medium text-ink">{formatOrderNumber(order.orderNumber)}</p>
                    <p className="text-xs text-ink-subtle">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="text-ink">{order.customer.name}</p>
                    <p className="text-xs text-ink-subtle">{order.customer.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatPaise(order.totalPaise)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{paymentStatusBadge(paymentStatusOf(order))}</td>
                  <td className="px-4 py-3">
                    {orderStatusBadge(order.status)}
                    {order.trackingNumber && (order.status === "SHIPPED" || order.status === "DELIVERED") ? (
                      <p className="mt-1 text-xs text-ink-subtle">
                        {courierName(order.courier)} · <span className="font-mono">{order.trackingNumber}</span>
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${order.id}/`} className="text-sm text-brand hover:underline">View</Link>
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
