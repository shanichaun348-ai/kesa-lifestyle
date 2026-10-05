import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { requireUser } from "@/lib/auth/guard";
import { formatPaise } from "@/lib/money";
import { getAccountService } from "@/modules/account/server";

import { orderStatusLabel } from "../../page";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const EVENT_LABEL: Record<string, string> = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_paid: "Payment received",
  order_reinstated_and_paid: "Payment received",
  payment_failed: "Payment attempt failed",
  order_cancelled: "Order cancelled",
};

/** Ownership is enforced in the service: another customer's order number returns null → 404. */
export default async function OrderDetailPage(props: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  if (!/^KL-\d+$/.test(orderNumber)) notFound();
  const user = await requireUser(`/account/orders/${orderNumber}/`);
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const found = await service.orders.get(user.id, orderNumber);
  if (!found) notFound();
  const { order, items, addresses, events, payments } = found;
  const shipping = addresses.find((a) => a.kind === "shipping");
  const payment = payments[0];

  return (
    <>
      <AccountHeading eyebrow="Order" title={order.orderNumber} intro={`Placed ${dateTime.format(new Date(order.placedAt))}`} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant={order.status === "cancelled" ? "danger" : ["delivered", "completed"].includes(order.status) ? "success" : "muted"}>{orderStatusLabel(order.status)}</Badge>
        {order.status === "pending_payment" || order.status === "payment_failed" ? (
          <Button size="sm" asChild>
            <Link href={`/checkout/?retry=${order.orderNumber}`}>Complete payment</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="items-title">
          <h2 id="items-title" className="type-h3 mb-3">
            Items
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="text-ink">{item.productName}</p>
                  <p className="type-small text-ink-muted">
                    {item.variantTitle ? `${item.variantTitle} · ` : ""}Qty {item.quantity} · {item.sku}
                  </p>
                </div>
                <span className="type-price shrink-0">{formatPaise(item.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>

          <h2 className="type-h3 mt-8 mb-3">Timeline</h2>
          <ol className="flex flex-col gap-2 border-l border-line pl-4 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-ink">{EVENT_LABEL[e.type] ?? e.type.replace(/_/g, " ")}</span>
                <time dateTime={e.createdAt} className="type-small shrink-0 text-ink-subtle">
                  {dateTime.format(new Date(e.createdAt))}
                </time>
              </li>
            ))}
          </ol>
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
                  <dt className="text-ink-muted">Discount</dt>
                  <dd className="type-price text-success">−{formatPaise(order.discountPaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="type-price">{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</dd>
              </div>
              {order.codFeePaise > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">COD fee</dt>
                  <dd className="type-price">{formatPaise(order.codFeePaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-1.5 text-base">
                <dt className="text-ink">Total</dt>
                <dd className="type-price">{formatPaise(order.totalPaise)}</dd>
              </div>
            </dl>
            <p className="type-small mt-2 text-ink-subtle">
              {order.paymentMethod === "cod" ? "Cash on delivery" : payment ? `Paid online${payment.method ? ` via ${payment.method.toUpperCase()}` : ""}` : "Online payment"} · includes {formatPaise(order.taxPaise)} GST
            </p>
          </section>
          {shipping ? (
            <section className="rounded-md border border-line bg-surface p-4 text-sm">
              <h2 className="type-eyebrow mb-2 text-ink-subtle">Delivery address</h2>
              <p className="text-ink">{shipping.fullName}</p>
              <p className="text-ink-muted">
                {shipping.line1}
                {shipping.line2 ? `, ${shipping.line2}` : ""}
              </p>
              <p className="text-ink-muted">
                {shipping.city}, {shipping.state} {shipping.pincode}
              </p>
              <p className="text-ink-muted">{shipping.phone}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
