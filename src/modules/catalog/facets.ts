/**
 * Faceted navigation strategy (docs/06 §1.2, §1.7; ADR-22).
 *
 * 1. Only categories and collections are paths. Facets are query parameters
 *    and never become path segments, so no filter combination can turn into a
 *    new "page" by accident.
 * 2. Every facet key and value is whitelisted. Anything else returns 404
 *    rather than an empty 200, so crawlers do not collect junk URLs.
 * 3. URLs are canonicalised: keys in a fixed order, values sorted, comma
 *    joined, `page=1` dropped, default sort dropped. One selection, one URL.
 * 4. A listing URL is indexable only when it carries no filter and no sort.
 *    Filtered or sorted pages get `noindex, follow` with a self-canonical and
 *    the links that create them are `rel="nofollow"`.
 * 5. Intent-worthy combinations become collections with real copy, never
 *    indexed facet URLs.
 */
import {
  ATTRIBUTE_KEYS,
  FACET_KEYS,
  PRICE_BUCKETS,
  SORT_KEYS,
  type AttributeDefinition,
  type AttributeKey,
  type FacetKey,
  type ListingFilters,
  type ListingParams,
  type SortKey,
} from "./types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type FacetVocabulary = Record<FacetKey, ReadonlySet<string>>;

export const AVAILABILITY_VALUES = [{ slug: "in-stock", label: "In stock" }] as const;

export const FACET_LABELS: Record<FacetKey, string> = {
  material: "Material",
  finish: "Finish",
  color: "Colour",
  occasion: "Occasion",
  style: "Style",
  price: "Price",
  availability: "Availability",
};

/** Build the whitelist of legal facet values from attribute definitions. */
export function buildFacetVocabulary(attributes: AttributeDefinition[]): FacetVocabulary {
  const vocab = {} as Record<FacetKey, Set<string>>;
  for (const key of ATTRIBUTE_KEYS) {
    const def = attributes.find((a) => a.key === key);
    vocab[key] = new Set(def ? def.values.map((v) => v.slug) : []);
  }
  vocab.price = new Set(PRICE_BUCKETS.map((b) => b.slug));
  vocab.availability = new Set(AVAILABILITY_VALUES.map((v) => v.slug));
  return vocab;
}

/** Marketing/analytics parameters that must never 404 a landing page. */
const IGNORED_PARAM = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|mc_cid|mc_eid|ref|igshid)$/;

export type ParseResult =
  | { ok: true; params: ListingParams; canonicalHref: string }
  | { ok: false; reason: "unknown-param" | "unknown-value" | "bad-page" | "bad-sort" };

function splitValues(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  return list.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

/**
 * Parse `searchParams` into ListingParams. Unknown keys or values are
 * rejected (the route should 404). Accepts both `?color=a,b` and
 * `?color=a&color=b` so plain HTML form submission works without JS.
 */
export function parseListingSearchParams(
  raw: RawSearchParams,
  vocab: FacetVocabulary,
  basePath: string,
  defaultSort: SortKey,
): ParseResult {
  const filters: ListingFilters = {};
  let sort: SortKey | null = null;
  let page = 1;

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    // Tracking parameters are tolerated and ignored; the canonical href drops
    // them, so `?utm_source=` variants consolidate onto the clean URL.
    if (IGNORED_PARAM.test(key)) continue;
    if (key === "page") {
      const n = Number(Array.isArray(value) ? value[0] : value);
      if (!Number.isInteger(n) || n < 1 || n > 500) return { ok: false, reason: "bad-page" };
      page = n;
      continue;
    }
    if (key === "sort") {
      const s = Array.isArray(value) ? value[0] : value;
      if (!s || !(SORT_KEYS as readonly string[]).includes(s)) return { ok: false, reason: "bad-sort" };
      sort = s === defaultSort ? null : (s as SortKey);
      continue;
    }
    if (!(FACET_KEYS as readonly string[]).includes(key)) return { ok: false, reason: "unknown-param" };
    const facet = key as FacetKey;
    const values = [...new Set(splitValues(value))];
    if (values.length === 0) continue;
    if (values.some((v) => !vocab[facet].has(v))) return { ok: false, reason: "unknown-value" };
    filters[facet] = values.sort();
  }

  const params: ListingParams = { filters, sort, page };
  return { ok: true, params, canonicalHref: buildListingHref(basePath, params) };
}

/** Deterministic URL for a listing state. Page 1 and default sort are omitted. */
export function buildListingHref(basePath: string, params: ListingParams): string {
  // Values are whitelisted slugs (`[a-z0-9-]`), so the query is assembled by
  // hand to keep commas readable instead of `%2C`.
  const parts: string[] = [];
  for (const key of FACET_KEYS) {
    const values = params.filters[key];
    if (values && values.length > 0) parts.push(`${key}=${[...values].sort().join(",")}`);
  }
  if (params.sort) parts.push(`sort=${params.sort}`);
  if (params.page > 1) parts.push(`page=${params.page}`);
  return parts.length > 0 ? `${basePath}?${parts.join("&")}` : basePath;
}

export function hasActiveFilters(params: ListingParams): boolean {
  return Object.values(params.filters).some((v) => v && v.length > 0);
}

/** Only unfiltered, unsorted listings may be indexed. Pagination is fine. */
export function isIndexableListing(params: ListingParams): boolean {
  return !hasActiveFilters(params) && params.sort === null;
}

export function toggleFilterValue(params: ListingParams, key: FacetKey, value: string): ListingParams {
  const current = params.filters[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const filters: ListingFilters = { ...params.filters };
  if (next.length === 0) delete filters[key];
  else filters[key] = next.sort();
  return { filters, sort: params.sort, page: 1 };
}

export function clearFilters(params: ListingParams): ListingParams {
  return { filters: {}, sort: params.sort, page: 1 };
}

export function withSort(params: ListingParams, sort: SortKey | null): ListingParams {
  return { filters: params.filters, sort, page: 1 };
}

export function withPage(params: ListingParams, page: number): ListingParams {
  return { filters: params.filters, sort: params.sort, page };
}

export function isAttributeKey(key: FacetKey): key is AttributeKey {
  return (ATTRIBUTE_KEYS as readonly string[]).includes(key);
}
