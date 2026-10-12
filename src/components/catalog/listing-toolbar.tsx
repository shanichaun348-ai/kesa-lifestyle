"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterForm } from "@/components/catalog/filter-form";
import { buildListingHref, hasActiveFilters, withSort } from "@/modules/catalog/facets";
import { SORT_KEYS, type FacetResult, type ListingParams, type SortKey } from "@/modules/catalog/types";

const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  bestselling: "Bestselling",
  rating: "Top rated",
};

type ListingToolbarProps = {
  basePath: string;
  params: ListingParams;
  facets: FacetResult[];
  total: number;
  defaultSort: SortKey;
  currentSort: SortKey;
};

/** Result count, mobile filter sheet and sort select. */
export function ListingToolbar({ basePath, params, facets, total, defaultSort, currentSort }: ListingToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const activeCount = Object.values(params.filters).reduce((n, v) => n + (v?.length ?? 0), 0);

  function onSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as SortKey;
    router.replace(buildListingHref(basePath, withSort(params, value === defaultSort ? null : value)), { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <p className="type-small text-ink-muted" aria-live="polite">
        {total} {total === 1 ? "product" : "products"}
      </p>

      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm" className="lg:hidden">
              <SlidersHorizontalIcon aria-hidden="true" />
              Filter{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-0 p-0">
            <SheetHeader>
              <SheetTitle>Filter</SheetTitle>
              <SheetDescription>{hasActiveFilters(params) ? `${activeCount} applied` : "Narrow the selection"}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-5 pt-2">
              <FilterForm
                key={buildListingHref(basePath, params)}
                basePath={basePath}
                params={params}
                facets={facets}
                total={total}
                idPrefix="m"
                mode="apply"
                onApplied={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <label className="flex min-w-0 items-center gap-2 text-sm">
          <span className="sr-only sm:not-sr-only sm:text-ink-muted">Sort</span>
          <select
            name="sort"
            value={currentSort}
            onChange={onSortChange}
            aria-label="Sort products"
            className="h-9 min-w-0 rounded-sm border border-line-strong bg-surface px-2.5 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
