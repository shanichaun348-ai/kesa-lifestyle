"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderTimeline } from "@/components/orders/order-timeline";

import { TRACK_IDLE, trackOrderAction, type TrackState } from "./_actions";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrderAction, TRACK_IDLE);

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-4 rounded-md border border-line bg-surface p-5">
        <div className="space-y-1.5">
          <Label htmlFor="track-ref">Order number</Label>
          <Input id="track-ref" name="reference" required placeholder="e.g. KL-1024" autoComplete="off" inputMode="text" disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="track-contact">Email or mobile number used on the order</Label>
          <Input id="track-contact" name="contact" required placeholder="you@example.com or 98765 43210" autoComplete="email" disabled={pending} />
        </div>
        {state.status === "error" ? (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth disabled={pending} loading={pending}>
          Track order
        </Button>
        <p className="type-small text-center text-ink-subtle">
          Have an account?{" "}
          <Link href="/account/orders/" className="text-brand underline-offset-4 hover:underline">
            See all your orders
          </Link>
        </p>
      </form>

      {state.status === "found" ? (
        <section aria-live="polite" className="rounded-md border border-line bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="type-h3">Order {state.order.orderNumber}</h2>
            <p className="type-small text-ink-subtle">
              {state.order.itemCount} {state.order.itemCount === 1 ? "item" : "items"} · updates go to {state.order.maskedEmail}
            </p>
          </div>
          <OrderTimeline order={state.order} />
        </section>
      ) : null}
    </div>
  );
}
