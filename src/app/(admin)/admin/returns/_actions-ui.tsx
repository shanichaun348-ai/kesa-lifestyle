"use client";

import * as React from "react";
import { useActionState } from "react";

import type { ReturnKind, ReturnStatus } from "@/modules/returns/types";

import { approveReturn, exchangeReturn, receiveReturn, refundReturn, rejectReturn, saveInternalNote, type ReturnActionState } from "./_actions";

type Props = {
  id: string;
  orderId: string;
  status: ReturnStatus;
  kind: ReturnKind;
  canRefund: boolean;
  internalNote: string | null;
  /** Suggested refund in rupees (line totals of the requested items). */
  suggestedRefundRupees: string;
};

const BTN = "inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium disabled:opacity-50";
const FIELD = "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand";

function Msg({ state }: { state: ReturnActionState }) {
  if (!state) return null;
  if ("error" in state) return <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{state.error}</p>;
  return <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">{state.success}</p>;
}

/** Stage-appropriate actions for one return request, each emailing the customer. */
export function ReturnActions({ id, orderId, status, kind, canRefund, internalNote, suggestedRefundRupees }: Props) {
  const [note, setNote] = React.useState("");
  const [rupees, setRupees] = React.useState(suggestedRefundRupees);
  const [internal, setInternal] = React.useState(internalNote ?? "");

  const [approveState, approve, approving] = useActionState<ReturnActionState, FormData>(() => approveReturn(id, note), null);
  const [rejectState, reject, rejecting] = useActionState<ReturnActionState, FormData>(() => rejectReturn(id, note), null);
  const [receiveState, receive, receiving] = useActionState<ReturnActionState, FormData>(() => receiveReturn(id), null);
  const [refundState, refund, refunding] = useActionState<ReturnActionState, FormData>(() => refundReturn(id, rupees, note), null);
  const [exchangeState, exchange, exchanging] = useActionState<ReturnActionState, FormData>(() => exchangeReturn(id, note), null);
  const [noteState, saveNote, savingNote] = useActionState<ReturnActionState, FormData>(() => saveInternalNote(id, orderId, internal), null);
  const busy = approving || rejecting || receiving || refunding || exchanging;
  const state = approveState ?? rejectState ?? receiveState ?? refundState ?? exchangeState;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Actions</h2>
        <Msg state={state} />

        {status === "requested" || status === "approved" ? (
          <div className="space-y-1">
            <label htmlFor="ret-note" className="block text-xs font-medium text-ink-subtle">
              Message to the customer (emailed)
            </label>
            <textarea id="ret-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === "requested" ? "Pickup / return instructions, or the reason if rejecting…" : "Reason if rejecting…"} className={FIELD} />
          </div>
        ) : null}

        {status === "requested" ? (
          <div className="flex flex-wrap gap-2">
            <form action={approve}>
              <button disabled={busy} className={`${BTN} border-success bg-success/10 text-success hover:bg-success hover:text-bg`}>{approving ? "Approving…" : "Approve"}</button>
            </form>
            <form action={reject}>
              <button disabled={busy} className={`${BTN} border-danger/30 bg-danger/5 text-danger hover:bg-danger/10`}>{rejecting ? "Rejecting…" : "Reject"}</button>
            </form>
          </div>
        ) : null}

        {status === "approved" ? (
          <div className="flex flex-wrap gap-2">
            <form action={receive}>
              <button disabled={busy} className={`${BTN} border-ink bg-ink text-bg hover:bg-brand-hover`}>{receiving ? "Saving…" : "Mark as received"}</button>
            </form>
            <form action={reject}>
              <button disabled={busy} className={`${BTN} border-danger/30 bg-danger/5 text-danger hover:bg-danger/10`}>{rejecting ? "Rejecting…" : "Reject"}</button>
            </form>
          </div>
        ) : null}

        {status === "received" ? (
          <div className="space-y-3">
            {kind === "return" ? (
              canRefund ? (
                <form action={refund} className="space-y-2">
                  <label htmlFor="ret-refund" className="block text-xs font-medium text-ink-subtle">
                    Refund amount (₹) — issue it in Razorpay / by bank transfer first, then record it here
                  </label>
                  <input id="ret-refund" type="number" min="1" step="0.01" value={rupees} onChange={(e) => setRupees(e.target.value)} className={FIELD} />
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the customer" className={FIELD} />
                  <button disabled={busy} className={`${BTN} border-ink bg-ink text-bg hover:bg-brand-hover`}>{refunding ? "Saving…" : "Mark as refunded"}</button>
                </form>
              ) : (
                <p className="text-xs text-ink-subtle">Only roles with refund permission can record the refund.</p>
              )
            ) : (
              <form action={exchange} className="space-y-2">
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was sent, courier and tracking (emailed to the customer)" className={FIELD} />
                <button disabled={busy} className={`${BTN} border-ink bg-ink text-bg hover:bg-brand-hover`}>{exchanging ? "Saving…" : "Mark as exchanged"}</button>
              </form>
            )}
          </div>
        ) : null}

        {status === "rejected" || status === "refunded" || status === "exchanged" || status === "cancelled" ? <p className="text-xs text-ink-subtle">This request is closed.</p> : null}
      </section>

      <section className="space-y-2 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Internal note</h2>
        <p className="text-xs text-ink-subtle">Staff only — never shown to the customer.</p>
        <form action={saveNote} className="space-y-2">
          <textarea rows={3} value={internal} onChange={(e) => setInternal(e.target.value)} className={FIELD} />
          <button disabled={savingNote} className={`${BTN} border-line text-ink hover:bg-surface-muted`}>{savingNote ? "Saving…" : "Save note"}</button>
          <Msg state={noteState} />
        </form>
      </section>
    </div>
  );
}
