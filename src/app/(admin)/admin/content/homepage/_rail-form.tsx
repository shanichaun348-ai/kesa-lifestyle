"use client";

import * as React from "react";
import { useActionState } from "react";

import type { HomeRail } from "@/modules/content/home-placements";

import type { LookOption } from "./_look-form";
import { updateHomeRail, type HomeRailState } from "./_rail-actions";

type Props = {
  rail: HomeRail;
  options: LookOption[];
  initialSlugs: string[];
  canWrite: boolean;
};

const INPUT = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const SMALL_BUTTON = "inline-flex h-7 items-center rounded-sm border border-line px-2 text-xs text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

function Thumb({ src, name }: { src: string | null; name: string }) {
  return (
    <span className="size-10 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-[10px] text-warning" title={`${name} has no photo`}>No photo</span>}
    </span>
  );
}

/**
 * Choose which published products a homepage row shows. Nothing chosen: the
 * row fills itself. Anything chosen: the row shows exactly those pieces.
 */
export function RailForm({ rail, options, initialSlugs, canWrite }: Props) {
  const [state, action, pending] = useActionState<HomeRailState, FormData>(updateHomeRail, null);
  const [selected, setSelected] = React.useState<string[]>(() => initialSlugs.filter((s) => options.some((o) => o.slug === s)));
  const [query, setQuery] = React.useState("");

  const bySlug = React.useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const chosen = selected.map((s) => bySlug.get(s)).filter((o): o is LookOption => o !== undefined);
  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !selected.includes(o.slug) && (q === "" || o.name.toLowerCase().includes(q) || o.slug.includes(q)));
  const disabled = pending || !canWrite;

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      <input type="hidden" name="rail" value={rail} />
      {selected.map((slug) => (
        <input key={slug} type="hidden" name="slug" value={slug} />
      ))}

      <section className="rounded-md border border-line bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-ink">Shown in this row</h3>
          <span className="text-xs text-ink-subtle">{selected.length} chosen</span>
        </div>
        {chosen.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">Nothing chosen. The row fills itself automatically.</p>
        ) : (
          <ul className="divide-y divide-line">
            {chosen.map((o) => (
              <li key={o.slug} className="flex items-center gap-3 py-2">
                <Thumb src={o.thumb} name={o.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{o.name}</span>
                  <span className="block text-xs text-ink-subtle">{o.priceLabel}</span>
                </span>
                <button type="button" onClick={() => setSelected((p) => p.filter((s) => s !== o.slug))} disabled={disabled} className={`${SMALL_BUTTON} text-danger`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {state ? (
          "error" in state ? (
            <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>
          ) : (
            <p role="status" className="mt-3 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p>
          )
        ) : null}

        {canWrite ? (
          <button type="submit" disabled={pending} className="mt-3 inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Add a published product</h3>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className={INPUT} aria-label="Search published products" />
        {options.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">No published products yet. Publish some in Products first.</p>
        ) : available.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">No match.</p>
        ) : (
          <ul className="mt-2 max-h-80 divide-y divide-line overflow-y-auto">
            {available.map((o) => (
              <li key={o.slug} className="flex items-center gap-3 py-2">
                <Thumb src={o.thumb} name={o.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{o.name}</span>
                  <span className="block text-xs text-ink-subtle">{o.priceLabel}</span>
                </span>
                <button type="button" onClick={() => setSelected((p) => [...p, o.slug])} disabled={disabled} className={SMALL_BUTTON}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </form>
  );
}
