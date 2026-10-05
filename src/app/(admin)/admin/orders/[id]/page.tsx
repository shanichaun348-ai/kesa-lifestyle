import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { orderStatusBadge, paymentStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getOrderById } from "@/lib/demo/seed-orders";
import { formatPaise } from "@/lib/money";

import { updateOrderStatus } from "./_actions";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdmin("orders:read");
  const order = getOrderById(id);
  if (!order) notFound();

  const canWrite = hasPermission(session.role, "orders:write");
  const canRefund = hasPermission(session.role, "orders:refund");

  const NEXT_STATUS: Record<string, string> = {
    pending: "confirmed",
    confirmed: "processing",
    processing: "shipped",
    shipped: "delivered",
  };
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.number}`}
        description={new Date(order.createdAt).toLocaleString("en-IN")}
        back={{ href: "/admin/orders/", label: "Orders" }}
        actions={
          <div className="flex gap-2">
            {orderStatusBadge(order.status)}
            {paymentStatusBadge(order.paymentStatus)}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium text-ink">Items</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Product</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Variant</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-subtle">Qty</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-subtle">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="font-mono text-xs text-ink-subtle">{item.sku}</p>
                    </td>
                    <td className="py-3 text-ink-muted">{item.variantLabel}</td>
                    <td className="py-3 text-right text-ink-muted">{item.quantity}</td>
                    <td className="py-3 text-right font-medium text-ink">{formatPaise(item.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span>{formatPaise(order.subtotalPaise)}</span>
              </div>
              {order.shippingPaise > 0 ? (
                <div className="flex justify-between text-ink-muted">
                  <span>Shipping</span>
                  <span>{formatPaise(order.shippingPaise)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-ink-muted">
                  <span>Shipping</span>
                  <span className="text-success">Free</span>
                </div>
              )}
              {order.discountPaise > 0 ? (
                <div className="flex justify-between text-success">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                  <span>− {formatPaise(order.discountPaise)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
                <span>Total</span>
                <span>{formatPaise(order.totalPaise)}</span>
              </div>
            </div>
          </section>

          {/* Fulfilment */}
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium text-ink">Fulfilment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-subtle">Fulfilment status</p>
                <p className="mt-0.5 capitalize text-ink">{order.fulfillmentStatus.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Tracking</p>
                <p className="mt-0.5 font-mono text-xs text-ink-muted">{order.trackingNumber ?? "—"}</p>
              </div>
              {order.carrier ? (
                <div>
                  <p className="text-xs text-ink-subtle">Carrier</p>
                  <p className="mt-0.5 text-ink">{order.carrier}</p>
                </div>
              ) : null}
            </div>
          </section>

          {order.notes ? (
            <section className="rounded-md border border-warning/30 bg-warning/5 p-5">
              <h2 className="mb-1 text-xs font-medium text-warning">Notes</h2>
              <p className="text-sm text-ink-muted">{order.notes}</p>
            </section>
          ) : null}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Customer</h2>
            <div className="text-sm">
              <p className="font-medium text-ink">{order.customer.name}</p>
              <p className="text-ink-muted">{order.customer.email}</p>
              <p className="text-ink-muted">{order.customer.phone}</p>
            </div>
            <a href={`/admin/customers/${order.customer.id}/`} className="text-sm text-brand hover:underline">
              View customer →
            </a>
          </section>

          {/* Shipping address */}
          <section className="rounded-md border border-line bg-surface p-5 space-y-2">
            <h2 className="text-sm font-medium text-ink">Shipping address</h2>
            <address className="not-italic text-sm text-ink-muted">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
              <p>{order.shippingAddress.pincode}</p>
              <p>{order.shippingAddress.phone}</p>
            </address>
          </section>

          {/* Payment */}
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Payment</h2>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-subtle">Method</span>
                <span className="text-ink">{order.paymentMethod}</span>
              </div>
              {order.razorpayOrderId ? (
                <div className="flex justify-between">
                  <span className="text-ink-subtle">Razorpay ID</span>
                  <span className="font-mono text-xs text-ink-muted">{order.razorpayOrderId}</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Actions */}
          {(canWrite || canRefund) ? (
            <section className="rounded-md border border-line bg-surface p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">Actions</h2>
              {canWrite && nextStatus ? (
                <form action={updateOrderStatus.bind(null, order.id, nextStatus)}>
                  <button className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted">
                    Mark as {nextStatus}
                  </button>
                </form>
              ) : null}
              {canRefund && order.paymentStatus === "paid" ? (
                <a href="#" className="block w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger hover:bg-danger/10">
                  Issue refund
                </a>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
