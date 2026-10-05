/**
 * Pure listing engine: filter, facet-count, sort and paginate an array of
 * products. No I/O, so it is unit-tested directly. The Postgres repository
 * will push the same semantics into SQL (docs/05 §11); this module remains
 * the reference implementation those queries are tested against.
 */
import { AVAILABILITY_VALUES, FACET_LABELS, isAttributeKey } from "./facets";
import {
  ATTRIBUTE_KEYS,
  FACET_KEYS,
  PAGE_SIZE,
  PRICE_BUCKETS,
  type AttributeDefinition,
  type FacetKey,
  type FacetResult,
  type ListingFilters,
  type ListingParams,
  type ListingResult,
  type Product,
  type SortKey,
} from "./types";

export const NEW_ARRIVAL_DAYS = 30;
export const BESTSELLER_MIN_SALES = 40;

export function effectivePrice(product: Product): { pricePaise: number; compareAtPaise: number | undefined } {
  const cheapest = [...product.variants].sort((a, b) => a.pricePaise - b.pricePaise)[0];
  if (!cheapest) return { pricePaise: 0, compareAtPaise: undefined };
  const compare = cheapest.compareAtPaise;
  return {
    pricePaise: cheapest.pricePaise,
    compareAtPaise: compare !== undefined && compare > cheapest.pricePaise ? compare : undefined,
  };
}

export function isInStock(product: Product): boolean {
  return product.variants.some((v) => v.stock > 0);
}

export function isNewArrival(product: Product, now: Date): boolean {
  const published = new Date(product.publishedAt).getTime();
  return now.getTime() - published <= NEW_ARRIVAL_DAYS * 86_400_000;
}

export function isBestseller(product: Product): boolean {
  return product.sales30d >= BESTSELLER_MIN_SALES;
}

function priceBucketOf(product: Product): string | undefined {
  const { pricePaise } = effectivePrice(product);
  return PRICE_BUCKETS.find((b) => pricePaise >= b.minPaise && pricePaise <= b.maxPaise)?.slug;
}

/** Values a product exposes for a facet key. */
export function facetValuesOf(product: Product, key: FacetKey): string[] {
  if (isAttributeKey(key)) return product.attributes[key] ?? [];
  if (key === "price") {
    const bucket = priceBucketOf(product);
    return bucket ? [bucket] : [];
  }
  return isInStock(product) ? ["in-stock"] : [];
}

function matchesFacet(product: Product, key: FacetKey, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const own = facetValuesOf(product, key);
  return selected.some((v) => own.includes(v));
}

/** AND across facets, OR within a facet. */
export function matchesFilters(product: Product, filters: ListingFilters, except?: FacetKey): boolean {
  for (const key of FACET_KEYS) {
    if (key === except) continue;
    const selected = filters[key];
    if (selected && !matchesFacet(product, key, selected)) return false;
  }
  return true;
}

const comparators: Record<SortKey, (a: Product, b: Product) => number> = {
  featured: (a, b) => b.sortWeight - a.sortWeight || b.sales30d - a.sales30d || a.name.localeCompare(b.name),
  newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.name.localeCompare(b.name),
  "price-asc": (a, b) => effectivePrice(a).pricePaise - effectivePrice(b).pricePaise || a.name.localeCompare(b.name),
  "price-desc": (a, b) => effectivePrice(b).pricePaise - effectivePrice(a).pricePaise || a.name.localeCompare(b.name),
  bestselling: (a, b) => b.sales30d - a.sales30d || a.name.localeCompare(b.name),
  rating: (a, b) =>
    (b.rating?.value ?? 0) - (a.rating?.value ?? 0) || (b.rating?.count ?? 0) - (a.rating?.count ?? 0) || a.name.localeCompare(b.name),
};

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products].sort(comparators[sort]);
  // Out-of-stock items sink to the end regardless of sort so the first screen is shoppable.
  return [...sorted.filter(isInStock), ...sorted.filter((p) => !isInStock(p))];
}

/**
 * Disjunctive facet counts: for each facet, count candidates that match all
 * *other* active filters, so selecting a value never zeroes its siblings.
 */
export function computeFacets(candidates: Product[], filters: ListingFilters, attributes: AttributeDefinition[]): FacetResult[] {
  const results: FacetResult[] = [];

  for (const key of FACET_KEYS) {
    const pool = candidates.filter((p) => matchesFilters(p, filters, key));
    const counts = new Map<string, number>();
    for (const p of pool) for (const v of facetValuesOf(p, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
    const selected = new Set(filters[key] ?? []);

    let definitions: Array<{ slug: string; label: string; swatchHex?: string | undefined }>;
    if (isAttributeKey(key)) {
      definitions = attributes.find((a) => a.key === key)?.values ?? [];
    } else if (key === "price") {
      definitions = PRICE_BUCKETS.map((b) => ({ slug: b.slug, label: b.label }));
    } else {
      definitions = AVAILABILITY_VALUES.map((v) => ({ slug: v.slug, label: v.label }));
    }

    const values = definitions
      .map((d) => ({
        slug: d.slug,
        label: d.label,
        count: counts.get(d.slug) ?? 0,
        selected: selected.has(d.slug),
        swatchHex: d.swatchHex,
      }))
      .filter((v) => v.count > 0 || v.selected);

    if (values.length > 0) results.push({ key, label: FACET_LABELS[key], values });
  }

  return results;
}

export function runListing(
  candidates: Product[],
  params: ListingParams,
  defaultSort: SortKey,
  attributes: AttributeDefinition[],
  pageSize = PAGE_SIZE,
): ListingResult {
  const sort = params.sort ?? defaultSort;
  const filtered = candidates.filter((p) => matchesFilters(p, params.filters));
  const sorted = sortProducts(filtered, sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = params.page;
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    sort,
    facets: computeFacets(candidates, params.filters, attributes),
  };
}

export { ATTRIBUTE_KEYS };
