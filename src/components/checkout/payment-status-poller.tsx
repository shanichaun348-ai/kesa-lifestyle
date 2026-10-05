"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";

type PaymentStatusPollerProps = {
  orderNumber: string;
  /** Poll until one of these; then refresh the server-rendered page. */
  settledStatuses?: string[];
  timeoutMs?: number;
};

/** Polls the order status while a payment settles; the server page re-renders on change. */
export function PaymentStatusPoller({ orderNumber, settledStatuses = ["paid", "confirmed", "processing", "cancelled", "payment_failed"], timeoutMs = 90_000 }: PaymentStatusPollerProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const started = Date.now();
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/orders/${orderNumber}/status/`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status: string };
          if (settledStatuses.includes(data.status)) {
            stopped = true;
            router.refresh();
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() - started > timeoutMs) {
        stopped = true;
        setTimedOut(true);
        return;
      }
      window.setTimeout(() => void tick(), 2000);
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, [orderNumber, router, settledStatuses, timeoutMs]);

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-4" role="status" aria-live="polite">
      {!timedOut ? <Spinner className="size-5" aria-hidden="true" /> : null}
      <p className="text-sm text-ink-muted">
        {timedOut
          ? "We are still waiting for the payment confirmation. If money was deducted, this page will update automatically within a few minutes, and you will receive an email."
          : "Confirming your payment with the bank…"}
      </p>
    </div>
  );
}
