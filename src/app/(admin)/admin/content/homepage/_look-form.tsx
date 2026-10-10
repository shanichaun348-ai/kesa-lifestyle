"use client";

import * as React from "react";
import { useActionState } from "react";

import { MAX_LOOK_PRODUCTS } from "@/modules/content/home-look";

import { updateHomeLook, type HomeLookState } from "./_actions";

export type LookOption = { slug: string; name: string; thumb: string | null; priceLabel: string };

type Props = {
  options: LookOption[];
  initialSlugs: string[];
  initialHref: string;
  imageSrc: string;
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
 * Pick up to six live products to list beside the "Shop the look" photo,
 * in order, and set where "Shop the full look" goes.
 */
export function LookForm({ options, initialSlugs, initialHref, imageSrc, canWrite }: Props) {
  const [state, action, pending] = useActionState<HomeLookState, FormData>(updateHomeLook, null);
  const [selected, setSelected] = React.useState<string[]>(() => initialSlugs.filter((s) => options.some((o) => o.slug === s)));
  const [href, setHref] = React.useState(initialHref);
  const [query, setQuery] = React.useState("");

  const bySlug = React.useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const chosen = selected.map((s) => bySlug.get(s)).filter((o): o is LookOption => o !== undefined);
  const full = selected.length >= MAX_LOOK_PRODUCTS;
  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !selected.includes(o.slug) && (q === "" || o.name.toLowerCase().includes(q) || o.slug.includes(q)));

  function move(slug: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.indexOf(slug);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  const disabled = pending || !canWrite;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {selected.map((slug) => (
        <input key={slug} type="hidden" name="slug" value={slug} />
      ))}

      <div className="space-y-4">
        <div className="relative aspect-[4/5] max-w-xs overflow-hidden rounded-sm border border-line bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="size-full object-cover" />
        </div>
        <p className="text-xs text-ink-subtle">The photo is part of the site design for now. Ask the developer to swap it.</p>

        <div>
          <label htmlFor="look-href" className="mb-1 block text-xs font-medium text-ink-subtle">“Shop the full look” goes to</label>
          <input id="look-href" name="href" value={href} onChange={(e) => setHref(e.target.value)} className={INPUT} disabled={disabled} placeholder="/collections/new-arrivals/" />
          <p className="mt-1 text-xs text-ink-subtle">A page on this site, e.g. /collections/bestsellers/ or /women/necklaces/.</p>
        </div>

        {state ? (
          "error" in state ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>
          ) : (
            <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p>
          )
        ) : null}

        {canWrite ? (
          <button type="submit" disabled={pending} className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>

      <div className="space-y-5">
        <section className="rounded-md border border-line bg-surface p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-ink">Pieces in the look</h3>
            <span className="text-xs text-ink-subtle">{selected.length} of {MAX_LOOK_PRODUCTS}</span>
          </div>
          {chosen.length === 0 ? (
            <p className="py-3 text-sm text-ink-muted">Nothing chosen yet. The newest live pieces are shown until you add some.</p>
          ) : (
            <ol className="divide-y divide-line">
              {chosen.map((o, i) => (
                <li key={o.slug} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-xs text-ink-subtle">{i + 1}</span>
                  <Thumb src={o.thumb} name={o.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{o.name}</span>
                    <span className="block text-xs text-ink-subtle">{o.priceLabel}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => move(o.slug, -1)} disabled={disabled || i === 0} className={SMALL_BUTTON} aria-label={`Move ${o.name} up`}>↑</button>
                    <button type="button" onClick={() => move(o.slug, 1)} disabled={disabled || i === chosen.length - 1} className={SMALL_BUTTON} aria-label={`Move ${o.name} down`}>↓</button>
                    <button type="button" onClick={() => setSelected((p) => p.filter((s) => s !== o.slug))} disabled={disabled} className={`${SMALL_BUTTON} text-danger`}>Remove</button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-md border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-medium text-ink">Add a live product</h3>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className={INPUT} aria-label="Search live products" />
          {options.length === 0 ? (
            <p className="py-3 text-sm text-ink-muted">No published products yet. Publish some in Products first.</p>
          ) : available.length === 0 ? (
            <p className="py-3 text-sm text-ink-muted">No match.</p>
          ) : (
            <ul className="mt-2 max-h-96 divide-y divide-line overflow-y-auto">
              {available.map((o) => (
                <li key={o.slug} className="flex items-center gap-3 py-2">
                  <Thumb src={o.thumb} name={o.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{o.name}</span>
                    <span className="block text-xs text-ink-subtle">{o.priceLabel}</span>
                  </span>
                  <button type="button" onClick={() => setSelected((p) => (p.length < MAX_LOOK_PRODUCTS ? [...p, o.slug] : p))} disabled={disabled || full} className={SMALL_BUTTON} title={full ? `At most ${MAX_LOOK_PRODUCTS} pieces` : undefined}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </form>
  );
}
