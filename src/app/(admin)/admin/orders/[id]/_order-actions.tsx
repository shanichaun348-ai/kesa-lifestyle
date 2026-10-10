"use client";

import { useActionState } from "react";

import type { OrderStatus } from "@/modules/orders/types";

import { advanceOrder, cancelOrder, markRefunded, resendConfirmationEmail, resendConfirmationWhatsApp, type OrderActionState } from "./_actions";

type Props = {
  orderId: string;
  status: OrderStatus;
  canWrite: boolean;
  canRefund: boolean;
};

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAID: { to: "PROCESSING", label: "Start processing" },
  PROCESSING: { to: "SHIPPED", label: "Mark as shipped" },
  SHIPPED: { to: "DELIVERED", label: "Mark as delivered" },
};

const CANCELLABLE: ReadonlySet<OrderStatus> = new Set(["CREATED", "PAYMENT_PENDING"]);
const REFUNDABLE: ReadonlySet<OrderStatus> = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);

function Message({ state }: { state: OrderActionState }) {
  if (!state) return null;
  if ("error" in state) return <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{state.error}</p>;
  return <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">{state.success}</p>;
}

export function OrderActions({ orderId, status, canWrite, canRefund }: Props) {
  const next = NEXT_STEP[status];
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

  const showAdvance = canWrite && !!next;
  const showCancel = canWrite && CANCELLABLE.has(status);
  const showRefund = canRefund && REFUNDABLE.has(status);
  const showEmail = canWrite && REFUNDABLE.has(status);
  if (!showAdvance && !showCancel && !showRefund && !showEmail) return null;

  return (
    <section className="rounded-md border border-line bg-surface p-5 space-y-3">
      <h2 className="text-sm font-medium text-ink">Actions</h2>
      <Message state={advState ?? cancelState ?? refundState ?? emailState ?? waState} />

      {showAdvance ? (
        <form action={advAction}>
          <button disabled={advPending} className="w-full rounded-md border border-ink bg-ink px-3 py-2 text-left text-sm font-medium text-bg hover:bg-brand-hover disabled:opacity-50">
            {advPending ? "Saving…" : next!.label}
          </button>
        </form>
      ) : null}

      {showEmail ? (
        <form action={emailAction}>
          <button disabled={emailPending} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-50">
            {emailPending ? "Sending…" : "Resend confirmation email"}
          </button>
        </form>
      ) : null}

      {showEmail ? (
        <form action={waAction}>
          <button disabled={waPending} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-50">
            {waPending ? "Sending…" : "Resend WhatsApp confirmation"}
          </button>
        </form>
      ) : null}

      {showCancel ? (
        <form
          action={cancelAction}
          onSubmit={(e) => { if (!confirm("Cancel this order and release its reserved stock?")) e.preventDefault(); }}
        >
          <button disabled={cancelPending} className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
            {cancelPending ? "Cancelling…" : "Cancel order"}
          </button>
        </form>
      ) : null}

      {showRefund ? (
        <form
          action={refundAction}
          onSubmit={(e) => { if (!confirm("Refund the payment in the Razorpay dashboard first. Mark this order as refunded?")) e.preventDefault(); }}
          className="space-y-1.5"
        >
          <button disabled={refundPending} className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
            {refundPending ? "Saving…" : "Mark as refunded"}
          </button>
          <p className="text-xs text-ink-subtle">Issue the actual refund from the Razorpay dashboard, then record it here.</p>
        </form>
      ) : null}
    </section>
  );
}
