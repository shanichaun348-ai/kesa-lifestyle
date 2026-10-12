"use client";

import { useActionState } from "react";

import type { OrderStatus, PaymentMethod } from "@/modules/orders/types";
import { COURIERS } from "@/modules/shipping/couriers";

import { advanceOrder, cancelOrder, markRefunded, resendConfirmationEmail, resendConfirmationWhatsApp, shipOrder, type OrderActionState } from "./_actions";

const INPUT = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "mb-1 block text-xs font-medium text-ink-subtle";

type Props = {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  canWrite: boolean;
  canRefund: boolean;
};

/** One-click steps. PROCESSING → SHIPPED is the ship form below instead. */
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAID: { to: "PROCESSING", label: "Start processing" },
  SHIPPED: { to: "DELIVERED", label: "Mark as delivered" },
};

/** Online orders: cancel only before payment; refund/resend once paid. */
const ONLINE = {
  cancellable: new Set<OrderStatus>(["CREATED", "PAYMENT_PENDING"]),
  refundable: new Set<OrderStatus>(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]),
  confirmed: new Set<OrderStatus>(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]),
};

/** COD: nothing is charged until delivery, so cancel while processing; refund only after cash was collected. */
const COD = {
  cancellable: new Set<OrderStatus>(["CREATED", "PROCESSING"]),
  refundable: new Set<OrderStatus>(["DELIVERED"]),
  confirmed: new Set<OrderStatus>(["PROCESSING", "SHIPPED", "DELIVERED"]),
};

function Message({ state }: { state: OrderActionState }) {
  if (!state) return null;
  if ("error" in state) return <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{state.error}</p>;
  return <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">{state.success}</p>;
}

export function OrderActions({ orderId, status, paymentMethod, canWrite, canRefund }: Props) {
  const cod = paymentMethod === "cod";
  const rules = cod ? COD : ONLINE;
  const next = NEXT_STEP[status];
  const nextLabel = next && cod && next.to === "DELIVERED" ? "Mark as delivered — cash collected" : next?.label;

  const [advState, advAction, advPending] = useActionState<OrderActionState, FormData>(
    (prev) => (next ? advanceOrder(orderId, next.to) : Promise.resolve(prev)),
    null,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<OrderActionState, FormData>(
    () => cancelOrder(orderId),
    null,
  );
  const [refundState, refundAction, refundPending] = useActionState<OrderActionState, FormData>(
    () => markRefunded(orderId),
    null,
  );
  const [emailState, emailAction, emailPending] = useActionState<OrderActionState, FormData>(
    () => resendConfirmationEmail(orderId),
    null,
  );
  const [waState, waAction, waPending] = useActionState<OrderActionState, FormData>(
    () => resendConfirmationWhatsApp(orderId),
    null,
  );
  const [shipState, shipAction, shipPending] = useActionState<OrderActionState, FormData>(shipOrder.bind(null, orderId), null);

  const showShip = canWrite && status === "PROCESSING";
  const showAdvance = canWrite && !!next;
  const showCancel = canWrite && rules.cancellable.has(status);
  const showRefund = canRefund && rules.refundable.has(status);
  const showResend = canWrite && rules.confirmed.has(status);
  if (!showShip && !showAdvance && !showCancel && !showRefund && !showResend) return null;

  return (
    <section className="rounded-md border border-line bg-surface p-5 space-y-3">
      <h2 className="text-sm font-medium text-ink">Actions</h2>
      <Message state={shipState ?? advState ?? cancelState ?? refundState ?? emailState ?? waState} />

      {showShip ? (
        <form action={shipAction} className="space-y-3 rounded-md border border-line p-3">
          <p className="text-sm font-medium text-ink">Mark as shipped</p>
          <div>
            <label htmlFor="ship-courier" className={LABEL}>Courier</label>
            <select id="ship-courier" name="courier" required defaultValue="delhivery" disabled={shipPending} className={INPUT}>
              {COURIERS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ship-tracking" className={LABEL}>Tracking / AWB number</label>
            <input id="ship-tracking" name="trackingNumber" required disabled={shipPending} placeholder="e.g. 1234567890123" className={INPUT + " font-mono"} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="ship-url" className={LABEL}>Tracking link (optional)</label>
            <input id="ship-url" name="trackingUrl" type="url" disabled={shipPending} placeholder="Filled in automatically for known couriers" className={INPUT} />
          </div>
          <button disabled={shipPending} className="w-full rounded-md border border-ink bg-ink px-3 py-2 text-left text-sm font-medium text-bg hover:bg-brand-hover disabled:opacity-50">
            {shipPending ? "Saving…" : "Save & notify customer"}
          </button>
          <p className="text-xs text-ink-subtle">Sends the shipped email and WhatsApp (where configured) with the tracking details.</p>
        </form>
      ) : null}

      {showAdvance ? (
        <form action={advAction}>
          <button disabled={advPending} className="w-full rounded-md border border-ink bg-ink px-3 py-2 text-left text-sm font-medium text-bg hover:bg-brand-hover disabled:opacity-50">
            {advPending ? "Saving…" : nextLabel}
          </button>
        </form>
      ) : null}

      {showResend ? (
        <form action={emailAction}>
          <button disabled={emailPending} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-50">
            {emailPending ? "Sending…" : "Resend confirmation email"}
          </button>
        </form>
      ) : null}

      {showResend ? (
        <form action={waAction}>
          <button disabled={waPending} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-50">
            {waPending ? "Sending…" : "Resend WhatsApp confirmation"}
          </button>
        </form>
      ) : null}

      {showCancel ? (
        <form
          action={cancelAction}
          onSubmit={(e) => { if (!confirm(cod ? "Cancel this cash-on-delivery order and release its stock? Let the customer know." : "Cancel this order and release its reserved stock?")) e.preventDefault(); }}
        >
          <button disabled={cancelPending} className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
            {cancelPending ? "Cancelling…" : "Cancel order"}
          </button>
        </form>
      ) : null}

      {showRefund ? (
        <form
          action={refundAction}
          onSubmit={(e) => { if (!confirm(cod ? "Return the cash to the customer first. Mark this order as refunded?" : "Refund the payment in the Razorpay dashboard first. Mark this order as refunded?")) e.preventDefault(); }}
          className="space-y-1.5"
        >
          <button disabled={refundPending} className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
            {refundPending ? "Saving…" : "Mark as refunded"}
          </button>
          <p className="text-xs text-ink-subtle">{cod ? "Refund the cash (UPI/bank transfer) first, then record it here." : "Issue the actual refund from the Razorpay dashboard, then record it here."}</p>
        </form>
      ) : null}
    </section>
  );
}
