"use client";

import * as React from "react";
import { useActionState } from "react";

import { approveReview, rejectReview, removeReview, type ReviewActionState } from "./_actions";

type Props = { id: string; status: "pending" | "approved" | "rejected" };

const BTN = "rounded-md border px-3 py-1.5 text-sm disabled:opacity-50";

/** Approve / reject (with optional note) / delete for one review row. */
export function ModerateReview({ id, status }: Props) {
  const [note, setNote] = React.useState("");
  const [approveState, approve, approving] = useActionState<ReviewActionState, FormData>(() => approveReview(id), null);
  const [rejectState, reject, rejecting] = useActionState<ReviewActionState, FormData>(() => rejectReview(id, note), null);
  const [removeState, remove, removing] = useActionState<ReviewActionState, FormData>(() => removeReview(id), null);
  const state = approveState ?? rejectState ?? removeState;
  const busy = approving || rejecting || removing;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== "approved" ? (
          <form action={approve}>
            <button disabled={busy} className={`${BTN} border-success bg-success/10 text-success hover:bg-success hover:text-bg`}>
              {approving ? "Publishing…" : "Approve"}
            </button>
          </form>
        ) : null}
        {status !== "rejected" ? (
          <form action={reject} className="flex items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" className="h-8 w-40 rounded-sm border border-line-strong bg-surface px-2 text-xs text-ink outline-none focus-visible:border-brand" />
            <button disabled={busy} className={`${BTN} border-warning/40 bg-warning/5 text-warning hover:bg-warning/10`}>
              {rejecting ? "Rejecting…" : "Reject"}
            </button>
          </form>
        ) : null}
        <form action={remove} onSubmit={(e) => { if (!confirm("Delete this review permanently?")) e.preventDefault(); }}>
          <button disabled={busy} className={`${BTN} border-danger/30 bg-danger/5 text-danger hover:bg-danger/10`}>
            {removing ? "Deleting…" : "Delete"}
          </button>
        </form>
      </div>
      {state && "error" in state ? <p role="alert" className="text-xs text-danger">{state.error}</p> : null}
      {state && "success" in state ? <p role="status" className="text-xs text-success">{state.success}</p> : null}
    </div>
  );
}
