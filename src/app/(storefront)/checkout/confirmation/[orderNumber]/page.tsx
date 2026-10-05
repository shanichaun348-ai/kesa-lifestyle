import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheckIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PaymentStatusPoller } from "@/components/checkout/payment-status-poller";
import { Container } from "@/components/storefront/container";
import { getSessionUserId } from "@/lib/auth/session";
import { formatPaise } from "@/lib/money";
import { getAccessibleOrderNumbers } from "@/modules/cart/cookies";
import { getCheckoutService } from "@/modules/checkout/server";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SUCCESS = new Set(["paid", "confirmed", "processing", "shipped", "delivered", "completed"]);
const WAITING = new Set(["pending_payment"]);

export default async function ConfirmationPage(props: PageProps<"/checkout/confirmation/[orderNumber]">) {
  const { orderNumber } = await props.params;
  if (!/^KL-\d+$/.test(orderNumber)) notFound();
  const service = getCheckoutService();
  if (!service) notFound();

  const [found, profileId, accessible] = await Promise.all([service.getOrderByNumber(orderNumber), getSessionUserId(), getAccessibleOrderNumbers()]);
  if (!found) notFound();
  const allowed = (profileId !== null && found.order.profileId === profileId) || accessible.includes(orderNumber);
  if (!allowed) notFound();

  const { order, items, addresses } = found;
  const shipping = addresses.find((a) => a.kind === "shipping");
  const success = SUCCESS.has(order.status);
  const waiting = WAITING.has(order.status);

  return (
    <Container className="pt-10 pb-24">
      <div className="mx-auto max-w-2xl">
        {success ? (
          <div className="flex flex-col gap-3">
            <CircleCheckIcon className="size-10 text-success" strokeWidth={1.5} aria-hidden="true" />
            <p className="type-eyebrow text-ink-subtle">Order {order.orderNumber}</p>
            <h1 className="type-h1">{order.paymentMethod === "cod" ? "Order confirmed" : "Payment received"}</h1>
            <p className="type-body text-ink-muted">
              Thank you. A confirmation is on its way to {order.guestEmail}. We will email you again when it ships.
            </p>
          </div>
        ) : waiting ? (
          <div className="flex flex-col gap-4">
            <p className="type-eyebrow text-ink-subtle">Order {order.orderNumber}</p>
            <h1 className="type-h1">Confirming your payment</h1>
            <PaymentStatusPoller orderNumber={order.orderNumber} />
            <Button variant="secondary" className="self-start" asChild>
              <Link href={`/checkout/?retry=${order.orderNumber}`}>Payment did not go through? Try again</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="type-eyebrow text-ink-subtle">Order {order.orderNumber}</p>
            <h1 className="type-h1">{order.status === "cancelled" ? "Order cancelled" : "Payment not completed"}</h1>
            <Alert variant="warning">
              <AlertTitle>{order.status === "cancelled" ? "This order was cancelled" : "We did not receive the payment"}</AlertTitle>
              <AlertDescription>
                {order.status === "cancelled"
                  ? order.cancelReason === "payment_timeout"
                    ? "The payment was not completed in time, so the items were released. Nothing has been charged; if a deduction shows on your statement it will be reversed automatically."
                    : "Nothing has been charged."
                  : "You can try the payment again. Your items are held for a few minutes."}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              {order.status !== "cancelled" ? (
                <Button asChild>
                  <Link href={`/checkout/?retry=${order.orderNumber}`}>Try again</Link>
                </Button>
              ) : null}
              <Button variant="secondary" asChild>
                <Link href="/cart/">Back to bag</Link>
              </Button>
            </div>
          </div>
        )}

        <section aria-labelledby="summary-title" className="mt-10 rounded-md border border-line bg-surface p-5">
          <h2 id="summary-title" className="type-h3">
            Order summary
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-ink">{item.productName}</p>
                  <p className="type-small text-ink-muted">
                    {item.variantTitle ? `${item.variantTitle} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
                <span className="type-price shrink-0">{formatPaise(item.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
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
                <dt className="text-ink-muted">Cash on delivery fee</dt>
                <dd className="type-price">{formatPaise(order.codFeePaise)}</dd>
              </div>
            ) : null}
            {order.giftWrapPaise > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Gift wrap</dt>
                <dd className="type-price">{formatPaise(order.giftWrapPaise)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="text-ink">Total {order.paymentMethod === "cod" ? "(pay on delivery)" : ""}</dt>
              <dd className="type-price">{formatPaise(order.totalPaise)}</dd>
            </div>
            <p className="type-small text-ink-subtle">Includes {formatPaise(order.taxPaise)} GST.</p>
          </dl>
          {shipping ? (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <p className="type-eyebrow mb-1 text-ink-subtle">Delivering to</p>
              <p className="text-ink">{shipping.fullName}</p>
              <p className="text-ink-muted">
                {shipping.line1}
                {shipping.line2 ? `, ${shipping.line2}` : ""}
                {shipping.landmark ? `, ${shipping.landmark}` : ""}
              </p>
              <p className="text-ink-muted">
                {shipping.city}, {shipping.state} {shipping.pincode}
              </p>
            </div>
          ) : null}
        </section>

        <div className="mt-8 flex gap-3">
          <Button variant="secondary" asChild>
            <Link href="/collections/new-arrivals/">Continue shopping</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/track-order/">Track order</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
