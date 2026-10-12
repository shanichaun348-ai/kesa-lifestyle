import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { requireUser } from "@/lib/auth/guard";
import { formatPaise } from "@/lib/money";
import { getAccountService } from "@/modules/account/server";

import { orderStatusLabel } from "../../page";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Ownership is enforced in the service: an order placed with another email returns null → 404. */
export default async function OrderDetailPage(props: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  if (!/^KL-\d+$/.test(orderNumber)) notFound();
  const user = await requireUser(`/account/orders/${orderNumber}/`);
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const order = await service.orders.get(user.id, orderNumber, user.emailConfirmed ? user.email : null);
  if (!order) notFound();
  const addr = order.shippingAddress;
  const cod = order.paymentMethod === "cod";

  return (
    <>
      <AccountHeading eyebrow="Order" title={order.orderNumber} intro={`Placed ${dateTime.format(new Date(order.placedAt))}`} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant={order.status === "cancelled" || order.status === "failed" ? "danger" : order.status === "delivered" ? "success" : "muted"}>{orderStatusLabel(order.status)}</Badge>
        {order.status === "pending_payment" ? <p className="type-small text-ink-muted">If you closed the payment window, place the order again from your bag.</p> : null}
      </div>

      <section aria-labelledby="progress-title" className="mb-8 rounded-md border border-line bg-surface p-4 sm:p-5">
        <h2 id="progress-title" className="type-eyebrow mb-4 text-ink-subtle">
          Progress
        </h2>
        <OrderTimeline order={order} />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="items-title">
          <h2 id="items-title" className="type-h3 mb-3">
            Items
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.sku} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="text-ink">{item.productName}</p>
                  <p className="type-small text-ink-muted">
                    {item.variantOptionValue ? `${item.variantOptionValue} · ` : ""}Qty {item.quantity} · {item.sku}
                  </p>
                </div>
                <span className="type-price shrink-0">{formatPaise(item.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="rounded-md border border-line bg-surface p-4 text-sm">
            <h2 className="type-eyebrow mb-3 text-ink-subtle">Summary</h2>
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="type-price">{formatPaise(order.subtotalPaise)}</dd>
              </div>
              {order.discountPaise > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd className="type-price text-success">−{formatPaise(order.discountPaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="type-price">{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</dd>
              </div>
              {cod ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Cash on delivery fee</dt>
                  <dd className="type-price">{order.codFeePaise === 0 ? "Waived" : formatPaise(order.codFeePaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-1.5 text-base">
                <dt className="text-ink">{cod && order.status !== "delivered" ? "To pay on delivery" : "Total"}</dt>
                <dd className="type-price">{formatPaise(order.totalPaise)}</dd>
              </div>
            </dl>
            <p className="type-small mt-2 text-ink-subtle">
              {cod
                ? order.status === "delivered"
                  ? "Paid in cash on delivery"
                  : order.status === "cancelled"
                    ? "Cash on delivery · nothing was charged"
                    : `Cash on delivery · keep ${formatPaise(order.totalPaise)} ready when it arrives`
                : "Paid online via Razorpay"}
              {" · "}includes {formatPaise(order.gstPaise)} GST
              {order.paidAt ? ` · ${dateTime.format(new Date(order.paidAt))}` : ""}
            </p>
            {order.razorpayPaymentId ? <p className="type-small mt-1 break-all font-mono text-ink-subtle">Payment ref {order.razorpayPaymentId}</p> : null}
          </section>
          <section className="rounded-md border border-line bg-surface p-4 text-sm">
            <h2 className="type-eyebrow mb-2 text-ink-subtle">Delivery address</h2>
            <p className="text-ink">{addr.name}</p>
            <p className="text-ink-muted">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ""}
            </p>
            <p className="text-ink-muted">
              {addr.city}, {addr.state} {addr.pincode}
            </p>
            <p className="text-ink-muted">{addr.phone}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
