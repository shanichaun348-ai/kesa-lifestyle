import { CheckIcon, PackageIcon, PackageCheckIcon, TruckIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimelineStatus = "pending_payment" | "failed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type TimelineOrder = {
  status: TimelineStatus;
  paymentMethod: "razorpay" | "cod";
  placedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  /** Display name, e.g. "Delhivery". */
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const STEP_INDEX: Record<TimelineStatus, number> = {
  pending_payment: 0,
  failed: 0,
  paid: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
  refunded: -1,
};

/**
 * Confirmed → Packed → Shipped → Delivered, with dates where known and the
 * courier link on the shipped step. Cancelled and refunded orders show a
 * single terminal row instead of a half-finished track.
 */
export function OrderTimeline({ order, className }: { order: TimelineOrder; className?: string }) {
  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <div className={cn("flex items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm", className)}>
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
          <XIcon className="size-3.5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium text-ink">{order.status === "cancelled" ? "Order cancelled" : "Order refunded"}</p>
          <p className="type-small text-ink-muted">
            {order.cancelledAt ? dateTime.format(new Date(order.cancelledAt)) : null}
            {order.status === "refunded" ? " · the amount has been returned to your original payment method" : order.paymentMethod === "cod" ? " · nothing was charged" : " · any payment taken will be refunded"}
          </p>
        </div>
      </div>
    );
  }

  const current = STEP_INDEX[order.status];
  const confirmedAt = order.paymentMethod === "cod" ? order.placedAt : (order.paidAt ?? order.placedAt);
  const steps = [
    { key: "confirmed", label: order.status === "pending_payment" ? "Awaiting payment" : order.status === "failed" ? "Payment failed" : "Order confirmed", at: current >= 1 ? confirmedAt : null, icon: CheckIcon, done: current >= 1 },
    { key: "packed", label: "Being packed", at: null, icon: PackageIcon, done: current >= 2 },
    { key: "shipped", label: "Shipped", at: order.shippedAt ?? null, icon: TruckIcon, done: current >= 3 },
    { key: "delivered", label: "Delivered", at: order.deliveredAt ?? null, icon: PackageCheckIcon, done: current >= 4 },
  ];

  return (
    <ol className={cn("relative flex flex-col gap-0 text-sm", className)} aria-label="Order progress">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const active = step.done && (i === steps.length - 1 || !steps[i + 1]!.done);
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 ? <span aria-hidden="true" className={cn("absolute top-6 left-3 h-[calc(100%-0.75rem)] w-px", step.done && steps[i + 1]!.done ? "bg-success" : "bg-line")} /> : null}
            <span
              className={cn(
                "relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                step.done ? "border-success bg-success text-bg" : "border-line bg-surface text-ink-subtle",
                active && "ring-4 ring-success/15",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", step.done ? "text-ink" : "text-ink-subtle")}>{step.label}</p>
              {step.at ? <p className="type-small text-ink-muted">{dateTime.format(new Date(step.at))}</p> : null}
              {step.key === "shipped" && step.done && order.trackingNumber ? (
                <p className="type-small mt-0.5 text-ink-muted">
                  {order.courier ? `${order.courier} · ` : ""}
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-brand underline-offset-4 hover:underline">
                      {order.trackingNumber} ↗
                    </a>
                  ) : (
                    <span className="font-mono">{order.trackingNumber}</span>
                  )}
                </p>
              ) : null}
              {step.key === "shipped" && step.done && !order.deliveredAt && order.status === "shipped" ? (
                <p className="type-small text-ink-subtle">Usually delivered within 3–7 days of dispatch.</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
