"use client";

import { useActionState } from "react";

import type { ContactDetails } from "@/modules/content/contact";

import { updateContact, type ContactState } from "./_actions";

const INPUT = "h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50";
const TEXTAREA = "w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "block text-sm font-medium text-ink";
const HINT = "text-xs text-ink-subtle";

type Props = { initial: ContactDetails; canWrite: boolean };

/** Edits what the Contact us page shows. A blank field is simply left off the page. */
export function ContactForm({ initial, canWrite }: Props) {
  const [state, action, pending] = useActionState<ContactState, FormData>(updateContact, null);
  const disabled = pending || !canWrite;

  return (
    <form action={action} className="max-w-xl space-y-6">
      {state && "error" in state ? <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      {state && "success" in state ? <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p> : null}

      <div className="space-y-1.5">
        <label htmlFor="intro" className={LABEL}>Introduction</label>
        <textarea id="intro" name="intro" rows={3} maxLength={400} disabled={disabled} defaultValue={initial.intro ?? ""} className={TEXTAREA} />
        <p className={HINT}>A friendly line under the page title.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className={LABEL}>Phone</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" disabled={disabled} defaultValue={initial.phone ?? ""} placeholder="+91 94090 17177" className={INPUT} />
          <p className={HINT}>Shown as a tap-to-call number.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className={LABEL}>WhatsApp number</label>
          <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" disabled={disabled} defaultValue={initial.whatsapp ? `+${initial.whatsapp}` : ""} placeholder="+91 94090 17177" className={INPUT} />
          <p className={HINT}>With country code. Also used by the green WhatsApp button on every page.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={LABEL}>Email</label>
        <input id="email" name="email" type="email" disabled={disabled} defaultValue={initial.email ?? ""} placeholder="hello@yourshop.com" className={INPUT} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className={LABEL}>Address</label>
        <textarea id="address" name="address" rows={4} maxLength={300} disabled={disabled} defaultValue={initial.address ?? ""} className={TEXTAREA} placeholder={"Shop name\nStreet, area\nCity, State, PIN"} />
        <p className={HINT}>Line breaks are kept. Leave blank if you have no shop or office to show.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hours" className={LABEL}>Opening hours</label>
        <input id="hours" name="hours" maxLength={120} disabled={disabled} defaultValue={initial.hours ?? ""} placeholder="Monday to Saturday, 10:00 am to 6:00 pm IST" className={INPUT} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="mapUrl" className={LABEL}>Map link</label>
        <input id="mapUrl" name="mapUrl" type="url" disabled={disabled} defaultValue={initial.mapUrl ?? ""} placeholder="https://maps.google.com/..." className={INPUT} />
        <p className={HINT}>Adds a &ldquo;Get directions&rdquo; button. In Google Maps choose Share, then copy the link.</p>
      </div>

      {canWrite ? (
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      ) : null}
    </form>
  );
}
