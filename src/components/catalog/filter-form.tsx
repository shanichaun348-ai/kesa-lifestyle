"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildListingHref, clearFilters, hasActiveFilters, toggleFilterValue } from "@/modules/catalog/facets";
import type { FacetResult, ListingParams } from "@/modules/catalog/types";
import { cn } from "@/lib/utils";

type FilterFormProps = {
  basePath: string;
  params: ListingParams;
  facets: FacetResult[];
  total: number;
  /** Unique prefix so desktop and mobile instances do not share input ids. */
  idPrefix: string;
  /** Called after navigation (mobile sheet closes itself). */
  onApplied?: (() => void) | undefined;
  /** `instant` navigates on every change; `apply` waits for the button (mobile). */
  mode: "instant" | "apply";
};

/**
 * Filter facets as a plain GET form so the listing works without JavaScript
 * (the server accepts repeated keys). With JavaScript, changes navigate
 * through the deterministic href builder so every state has exactly one URL.
 */
export function FilterForm({ basePath, params, facets, total, idPrefix, onApplied, mode }: FilterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  // Parents pass `key={buildListingHref(...)}` so the draft resets whenever the
  // server params change (navigation, back button) without effects or refs.
  const [draft, setDraft] = React.useState<ListingParams>(params);

  function navigate(next: ListingParams) {
    startTransition(() => {
      router.replace(buildListingHref(basePath, next), { scroll: false });
      onApplied?.();
    });
  }

  function onToggle(key: FacetResult["key"], value: string) {
    const next = toggleFilterValue(draft, key, value);
    setDraft(next);
    if (mode === "instant") navigate(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(draft);
  }

  function onClear() {
    const next = clearFilters(draft);
    setDraft(next);
    navigate(next);
  }

  return (
    <form method="get" action={basePath} onSubmit={onSubmit} aria-busy={pending} className="flex flex-col gap-1">
      {draft.sort ? <input type="hidden" name="sort" value={draft.sort} /> : null}

      <div className="flex items-center justify-between pb-3">
        <p className="text-sm font-medium text-ink">Filter</p>
        {hasActiveFilters(draft) ? (
          <button type="button" onClick={onClear} className="type-small text-brand underline underline-offset-4">
            Clear all
          </button>
        ) : null}
      </div>

      {facets.map((facet) => {
        const selectedCount = draft.filters[facet.key]?.length ?? 0;
        return (
          <details key={facet.key} open={facet.key !== "style" && facet.key !== "availability"} className="group border-t border-line">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>
                {facet.label}
                {selectedCount > 0 ? <span className="ml-1.5 text-ink-subtle">({selectedCount})</span> : null}
              </span>
              <ChevronDownIcon className="size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <fieldset className="pb-4">
              <legend className="sr-only">{facet.label}</legend>
              <ul className="flex flex-col">
                {facet.values.map((v) => {
                  const id = `${idPrefix}-${facet.key}-${v.slug}`;
                  const checked = draft.filters[facet.key]?.includes(v.slug) ?? false;
                  return (
                    <li key={v.slug}>
                      <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-muted hover:text-ink">
                        <input
                          id={id}
                          type="checkbox"
                          name={facet.key}
                          value={v.slug}
                          checked={checked}
                          onChange={() => onToggle(facet.key, v.slug)}
                          className="size-4 shrink-0 accent-ink"
                        />
                        {v.swatchHex ? (
                          <span
                            aria-hidden="true"
                            className="inline-block size-3.5 shrink-0 rounded-full border border-line-strong"
                            style={{ backgroundColor: v.swatchHex }}
                          />
                        ) : null}
                        <span className={cn("flex-1", checked && "text-ink")}>{v.label}</span>
                        <span className="tabular-nums text-ink-subtle">{v.count}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </details>
        );
      })}

      {mode === "apply" ? (
        <div className="sticky bottom-0 mt-2 border-t border-line bg-surface py-3">
          <Button type="submit" size="lg" fullWidth loading={pending}>
            Show results
          </Button>
        </div>
      ) : (
        <noscript>
          <Button type="submit" size="md" fullWidth className="mt-3">
            Apply filters
          </Button>
        </noscript>
      )}
      <p className="sr-only" aria-live="polite">
        {total} products
      </p>
    </form>
  );
}
