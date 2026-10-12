import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { orderStatusBadge, paymentStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { formatOrderNumber, getOrder, paymentStatusOf } from "@/modules/admin/orders-data";
import { hasPermission } from "@/modules/admin/rbac";
import { isCod } from "@/modules/orders/types";
import { courierName } from "@/modules/shipping/couriers";
import { formatPaise } from "@/lib/money";

import { OrderActions } from "./_order-actions";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdmin("orders:read");
  const order = await getOrder(id);
  if (!order) notFound();

  const canWrite = hasPermission(session.role, "orders:write");
  const canRefund = hasPermission(session.role, "orders:refund");
  const addr = order.shippingAddress;
  const cod = isCod(order);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${formatOrderNumber(order.orderNumber)}`}
        description={new Date(order.createdAt).toLocaleString("en-IN")}
        back={{ href: "/admin/orders/", label: "Orders" }}
        actions={
          <div className="flex gap-2">
            {orderStatusBadge(order.status)}
            {paymentStatusBadge(paymentStatusOf(order))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
                {order.items.map((item) => (
                  <tr key={item.sku}>
                    <td className="py-3">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="font-mono text-xs text-ink-subtle">{item.sku}</p>
                    </td>
                    <td className="py-3 text-ink-muted">{item.variantOptionValue ?? "—"}</td>
                    <td className="py-3 text-right text-ink-muted">{item.quantity}</td>
                    <td className="py-3 text-right font-medium text-ink">{formatPaise(item.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{formatPaise(order.subtotalPaise)}</span></div>
              <div className="flex justify-between text-ink-muted">
                <span>Shipping</span>
                {order.shippingPaise > 0 ? <span>{formatPaise(order.shippingPaise)}</span> : <span className="text-success">Free</span>}
              </div>
              {order.discountPaise > 0 ? (
                <div className="flex justify-between text-success">
                  <span>Discount {order.coupon ? `(${order.coupon.code})` : ""}</span>
                  <span>− {formatPaise(order.discountPaise)}</span>
                </div>
              ) : null}
              {cod ? (
                <div className="flex justify-between text-ink-muted">
                  <span>Cash on delivery fee</span>
                  {(order.codFeePaise ?? 0) > 0 ? <span>{formatPaise(order.codFeePaise ?? 0)}</span> : <span className="text-success">Waived</span>}
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
                <span>{cod && order.status !== "DELIVERED" ? "To collect on delivery" : "Total"}</span><span>{formatPaise(order.totalPaise)}</span>
              </div>
              <p className="text-xs text-ink-subtle">Includes {formatPaise(order.gstPaise)} GST.</p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Customer</h2>
            <div className="text-sm">
              <p className="font-medium text-ink">{order.customer.name}</p>
              <p className="text-ink-muted">{order.customer.email}</p>
              <p className="text-ink-muted">{order.customer.phone}</p>
            </div>
            <a href={`/admin/customers/${encodeURIComponent(order.customer.email.toLowerCase())}/`} className="text-sm text-brand hover:underline">
              View customer →
            </a>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-2">
            <h2 className="text-sm font-medium text-ink">Shipping address</h2>
            <address className="not-italic text-sm text-ink-muted">
              <p>{addr.name}</p>
              <p>{addr.line1}</p>
              {addr.line2 ? <p>{addr.line2}</p> : null}
              <p>{addr.city}, {addr.state}</p>
              <p>{addr.pincode}</p>
              <p>{addr.phone}</p>
            </address>
          </section>

          {order.shippedAt || order.deliveredAt || order.cancelledAt || order.trackingNumber ? (
            <section className="rounded-md border border-line bg-surface p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">Shipment</h2>
              <div className="space-y-1.5 text-sm">
                {order.courier ? (
                  <div className="flex justify-between"><span className="text-ink-subtle">Courier</span><span className="text-ink">{courierName(order.courier)}</span></div>
                ) : null}
                {order.trackingNumber ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-subtle">Tracking</span>
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs text-brand hover:underline">{order.trackingNumber} ↗</a>
                    ) : (
                      <span className="break-all font-mono text-xs text-ink-muted">{order.trackingNumber}</span>
                    )}
                  </div>
                ) : null}
                {order.shippedAt ? (
                  <div className="flex justify-between"><span className="text-ink-subtle">Shipped</span><span className="text-ink">{new Date(order.shippedAt).toLocaleString("en-IN")}</span></div>
                ) : null}
                {order.deliveredAt ? (
                  <div className="flex justify-between"><span className="text-ink-subtle">Delivered</span><span className="text-ink">{new Date(order.deliveredAt).toLocaleString("en-IN")}</span></div>
                ) : null}
                {order.cancelledAt ? (
                  <div className="flex justify-between"><span className="text-ink-subtle">Cancelled</span><span className="text-ink">{new Date(order.cancelledAt).toLocaleString("en-IN")}</span></div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Payment</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-ink-subtle">Method</span><span className="text-ink">{cod ? "Cash on delivery" : "Razorpay"}</span></div>
              {cod ? (
                <div className="flex justify-between"><span className="text-ink-subtle">Cash status</span><span className="text-ink">{order.status === "DELIVERED" ? "Collected by courier" : order.status === "CANCELLED" ? "Not collected" : "Collect on delivery"}</span></div>
              ) : null}
              {order.razorpayOrderId ? (
                <div className="flex justify-between gap-3"><span className="text-ink-subtle">Order ID</span><span className="break-all font-mono text-xs text-ink-muted">{order.razorpayOrderId}</span></div>
              ) : null}
              {order.razorpayPaymentId ? (
                <div className="flex justify-between gap-3"><span className="text-ink-subtle">Payment ID</span><span className="break-all font-mono text-xs text-ink-muted">{order.razorpayPaymentId}</span></div>
              ) : null}
              {order.paidAt ? (
                <div className="flex justify-between"><span className="text-ink-subtle">{cod ? "Cash collected" : "Paid at"}</span><span className="text-ink">{new Date(order.paidAt).toLocaleString("en-IN")}</span></div>
              ) : null}
            </div>
          </section>

          <OrderActions orderId={order.id} status={order.status} paymentMethod={cod ? "cod" : "razorpay"} canWrite={canWrite} canRefund={canRefund} />
        </div>
      </div>
    </div>
  );
}
