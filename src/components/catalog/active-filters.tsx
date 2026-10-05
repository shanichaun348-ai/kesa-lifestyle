import Link from "next/link";
import { XIcon } from "lucide-react";

import { buildListingHref, clearFilters, toggleFilterValue } from "@/modules/catalog/facets";
import type { FacetResult, ListingParams } from "@/modules/catalog/types";

type ActiveFiltersProps = {
  basePath: string;
  params: ListingParams;
  facets: FacetResult[];
};

/**
 * Chips for applied filters. Links are `nofollow`: they create non-indexable
 * URLs and should not spend crawl budget (docs/06 §1.7).
 */
export function ActiveFilters({ basePath, params, facets }: ActiveFiltersProps) {
  const chips = facets.flatMap((facet) =>
    facet.values
      .filter((v) => v.selected)
      .map((v) => ({
        key: facet.key,
        label: `${facet.label}: ${v.label}`,
        href: buildListingHref(basePath, toggleFilterValue(params, facet.key, v.slug)),
      })),
  );

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2 py-3" aria-label="Applied filters">
      {chips.map((chip) => (
        <li key={`${chip.key}-${chip.label}`}>
          <Link
            href={chip.href}
            rel="nofollow"
            scroll={false}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 text-xs text-ink hover:border-ink"
          >
            {chip.label}
            <XIcon className="size-3.5 text-ink-muted" aria-hidden="true" />
            <span className="sr-only">(remove)</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={buildListingHref(basePath, clearFilters(params))} rel="nofollow" scroll={false} className="type-small text-brand underline underline-offset-4">
          Clear all
        </Link>
      </li>
    </ul>
  );
}
