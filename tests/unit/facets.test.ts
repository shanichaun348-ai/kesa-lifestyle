import { describe, expect, it } from "vitest";

import { seedAttributes } from "@/lib/demo/seed-catalog";
import {
  buildFacetVocabulary,
  buildListingHref,
  isIndexableListing,
  parseListingSearchParams,
  toggleFilterValue,
} from "@/modules/catalog/facets";

const vocab = buildFacetVocabulary(seedAttributes);
const base = "/women/earrings/";

describe("parseListingSearchParams", () => {
  it("accepts no params as page 1, default sort, no filters", () => {
    const r = parseListingSearchParams({}, vocab, base, "featured");
    expect(r.ok && r.params).toEqual({ filters: {}, sort: null, page: 1 });
    expect(r.ok && r.canonicalHref).toBe(base);
  });

  it("accepts comma lists and repeated keys, sorts values, dedupes", () => {
    const a = parseListingSearchParams({ color: "silver,gold,gold" }, vocab, base, "featured");
    const b = parseListingSearchParams({ color: ["silver", "gold"] }, vocab, base, "featured");
    expect(a.ok && a.params.filters.color).toEqual(["gold", "silver"]);
    expect(b.ok && b.canonicalHref).toBe("/women/earrings/?color=gold,silver");
  });

  it("ignores tracking parameters and drops them from the canonical", () => {
    const r = parseListingSearchParams({ utm_source: "newsletter", gclid: "abc", color: "gold" }, vocab, base, "featured");
    expect(r.ok && r.canonicalHref).toBe("/women/earrings/?color=gold");
  });

  it("rejects unknown facet keys and values (route 404s)", () => {
    expect(parseListingSearchParams({ size: "12" }, vocab, base, "featured")).toEqual({ ok: false, reason: "unknown-param" });
    expect(parseListingSearchParams({ color: "neon" }, vocab, base, "featured")).toEqual({ ok: false, reason: "unknown-value" });
    expect(parseListingSearchParams({ page: "0" }, vocab, base, "featured")).toEqual({ ok: false, reason: "bad-page" });
    expect(parseListingSearchParams({ page: "abc" }, vocab, base, "featured")).toEqual({ ok: false, reason: "bad-page" });
    expect(parseListingSearchParams({ sort: "cheapest" }, vocab, base, "featured")).toEqual({ ok: false, reason: "bad-sort" });
  });

  it("drops the default sort and page 1 from the canonical href", () => {
    const r = parseListingSearchParams({ sort: "featured", page: "1" }, vocab, base, "featured");
    expect(r.ok && r.params.sort).toBeNull();
    expect(r.ok && r.canonicalHref).toBe(base);
  });

  it("keeps a non-default sort", () => {
    const r = parseListingSearchParams({ sort: "price-asc" }, vocab, base, "featured");
    expect(r.ok && r.canonicalHref).toBe("/women/earrings/?sort=price-asc");
  });
});

describe("buildListingHref", () => {
  it("is deterministic regardless of insertion order", () => {
    const a = buildListingHref(base, { filters: { price: ["500-999"], color: ["silver", "gold"] }, sort: "newest", page: 3 });
    const b = buildListingHref(base, { filters: { color: ["gold", "silver"], price: ["500-999"] }, sort: "newest", page: 3 });
    expect(a).toBe(b);
    expect(a).toBe("/women/earrings/?color=gold,silver&price=500-999&sort=newest&page=3");
  });
});

describe("indexability", () => {
  it("indexes only unfiltered, unsorted listings (pagination allowed)", () => {
    expect(isIndexableListing({ filters: {}, sort: null, page: 1 })).toBe(true);
    expect(isIndexableListing({ filters: {}, sort: null, page: 4 })).toBe(true);
    expect(isIndexableListing({ filters: { color: ["gold"] }, sort: null, page: 1 })).toBe(false);
    expect(isIndexableListing({ filters: {}, sort: "newest", page: 1 })).toBe(false);
  });
});

describe("toggleFilterValue", () => {
  it("adds, removes and resets page", () => {
    const start = { filters: {}, sort: null, page: 3 } as const;
    const on = toggleFilterValue(start, "color", "gold");
    expect(on).toEqual({ filters: { color: ["gold"] }, sort: null, page: 1 });
    const off = toggleFilterValue(on, "color", "gold");
    expect(off.filters).toEqual({});
  });
});
