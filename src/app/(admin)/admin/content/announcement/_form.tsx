"use client";

import * as React from "react";
import { useActionState } from "react";

import type { Announcement } from "@/modules/content/announcement";

import { updateAnnouncement, type AnnouncementState } from "./_actions";

const INPUT = "h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "block text-sm font-medium text-ink";
const HINT = "text-xs text-ink-subtle";

type Props = { initial: Announcement; codes: string[]; canWrite: boolean };

/** Edits the offer strip; the preview updates as you type. */
export function AnnouncementForm({ initial, codes, canWrite }: Props) {
  const [state, action, pending] = useActionState<AnnouncementState, FormData>(updateAnnouncement, null);
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [message, setMessage] = React.useState(initial.message);
  const [code, setCode] = React.useState(initial.code ?? "");
  const [href, setHref] = React.useState(initial.href ?? "");
  const [linkLabel, setLinkLabel] = React.useState(initial.linkLabel ?? "");
  const disabled = pending || !canWrite;

  return (
    <form action={action} className="max-w-xl space-y-6">
      {state && "error" in state ? <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      {state && "success" in state ? <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p> : null}

      <div className="rounded-md border border-line bg-ink px-4 py-2 text-center text-xs tracking-wide text-bg sm:text-sm" aria-label="Preview">
        {enabled ? (
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>{message || "Your message"}</span>
            {code ? <span className="rounded-sm border border-bg/40 px-2 py-0.5 font-mono text-[0.8em] font-semibold tracking-wider">{code}</span> : null}
            {href ? <span className="underline underline-offset-4">{linkLabel || "Shop now"}</span> : null}
          </span>
        ) : (
          <span className="opacity-60">Hidden</span>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="enabled" disabled={disabled} checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 size-4 accent-ink" />
        <span>Show the strip<span className="block text-xs text-ink-subtle">Customers can dismiss it; a changed message shows again.</span></span>
      </label>

      <div className="space-y-1.5">
        <label htmlFor="message" className={LABEL}>Message <span className="text-danger">*</span></label>
        <input id="message" name="message" required maxLength={140} disabled={disabled} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Extra ₹100 off above ₹999" className={INPUT} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="code" className={LABEL}>Coupon code</label>
        <input id="code" name="code" list="coupon-codes" disabled={disabled} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))} placeholder="Optional, e.g. FIRST100" className={INPUT + " font-mono"} />
        <datalist id="coupon-codes">
          {codes.map((c) => <option key={c} value={c} />)}
        </datalist>
        <p className={HINT}>
          Shown as a tap-to-copy chip and suggested at checkout. {codes.length > 0 ? `Live codes: ${codes.join(", ")}.` : "No live coupons yet — create one under Coupons."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="href" className={LABEL}>Link</label>
          <input id="href" name="href" disabled={disabled} value={href} onChange={(e) => setHref(e.target.value)} placeholder="/collections/new-arrivals/" className={INPUT} />
          <p className={HINT}>A page on this site, starting and ending with /. Blank = no link.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="linkLabel" className={LABEL}>Link label</label>
          <input id="linkLabel" name="linkLabel" maxLength={30} disabled={disabled} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Shop now" className={INPUT} />
        </div>
      </div>

      {canWrite ? (
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      ) : null}
    </form>
  );
}
