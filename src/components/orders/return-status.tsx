"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckIcon, ClockIcon, PackageCheckIcon, XIcon } from "lucide-react";

import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { cancelReturnAction, type CancelReturnState } from "@/modules/returns/actions";
import { kindLabel, RETURN_REASONS, RETURN_STATUS_LABEL, type ReturnRequest, type ReturnStatus as Status } from "@/modules/returns/types";

export type ReturnAuth = { mode: "session" } | { mode: "lookup"; reference: string; contact: string };

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const STEPS: Array<{ key: Status; label: string }> = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received by us" },
];

const STEP_INDEX: Partial<Record<Status, number>> = { requested: 0, approved: 1, received: 2, refunded: 3, exchanged: 3 };

function CancelReturn({ id, reference, auth }: { id: string; reference: string; auth: ReturnAuth }) {
  const [state, action, pending] = useActionState<CancelReturnState, FormData>(() => cancelReturnAction(id, reference, JSON.stringify(auth)), null);
  if (state && "success" in state) return <p className="type-small text-ink-muted">{state.success}</p>;
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Cancel this request?")) e.preventDefault(); }} className="flex items-center gap-3">
      <button type="submit" disabled={pending} className="type-small text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-50">
        {pending ? "Cancelling…" : "Cancel request"}
      </button>
      {state && "error" in state ? <span className="type-small text-danger">{state.error}</span> : null}
    </form>
  );
}

/** One return/exchange request as a short timeline, with the customer's cancel option while it is still only requested. */
export function ReturnStatus({ request, reference, auth, className }: { request: ReturnRequest; reference: string; auth: ReturnAuth; className?: string }) {
  const terminal = request.status === "rejected" || request.status === "cancelled";
  const done = request.status === "refunded" || request.status === "exchanged";
  const current = STEP_INDEX[request.status] ?? -1;

  return (
    <article className={cn("rounded-md border border-line bg-surface p-4 text-sm sm:p-5", className)} aria-label={`${kindLabel(request.kind)} request`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium text-ink">
          {kindLabel(request.kind)} request · {RETURN_STATUS_LABEL[request.status]}
        </h3>
        <span className="type-small text-ink-subtle">Raised {dateTime.format(new Date(request.createdAt))}</span>
      </div>

      <ul className="mb-3 divide-y divide-line border-y border-line">
        {request.items.map((i) => (
          <li key={i.sku} className="flex justify-between gap-3 py-2">
            <span className="text-ink">
              {i.productName} × {i.quantity}
            </span>
            <span className="type-small text-ink-muted">{RETURN_REASONS[i.reason]}</span>
          </li>
        ))}
      </ul>

      {terminal ? (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <XIcon className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-ink">{request.status === "rejected" ? "We couldn't approve this request" : "Request cancelled"}</p>
            {request.adminNote ? <p className="type-small text-ink-muted">{request.adminNote}</p> : null}
            {request.status === "rejected" ? <p className="type-small text-ink-subtle">Think we got it wrong? Email hello@kesalifestyle.com with your order number.</p> : null}
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-0" aria-label="Request progress">
          {[...STEPS, { key: (request.kind === "exchange" ? "exchanged" : "refunded") as Status, label: request.kind === "exchange" ? "Exchange dispatched" : "Refunded" }].map((step, i, all) => {
            const stepDone = i <= current || (i === 3 && done);
            const Icon = i === 3 ? PackageCheckIcon : stepDone ? CheckIcon : ClockIcon;
            return (
              <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                {i < all.length - 1 ? <span aria-hidden="true" className={cn("absolute top-6 left-3 h-[calc(100%-0.75rem)] w-px", stepDone && (i + 1 <= current || (i + 1 === 3 && done)) ? "bg-success" : "bg-line")} /> : null}
                <span className={cn("relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full border", stepDone ? "border-success bg-success text-bg" : "border-line bg-surface text-ink-subtle")}>
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", stepDone ? "text-ink" : "text-ink-subtle")}>{step.label}</p>
                  {step.key === "approved" && request.status !== "requested" && request.adminNote ? <p className="type-small whitespace-pre-line text-ink-muted">{request.adminNote}</p> : null}
                  {step.key === "requested" && request.status === "requested" ? <p className="type-small text-ink-subtle">We review requests within 2 business days.</p> : null}
                  {i === 3 && done && request.status === "refunded" && request.refundPaise !== null ? (
                    <p className="type-small text-ink-muted">{formatPaise(request.refundPaise)} · usually in your account within 5–7 business days</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {request.status === "requested" ? (
        <div className="mt-3 border-t border-line pt-3">
          <CancelReturn id={request.id} reference={reference} auth={auth} />
        </div>
      ) : null}
    </article>
  );
}
