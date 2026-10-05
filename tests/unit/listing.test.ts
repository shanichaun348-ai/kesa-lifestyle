import { describe, expect, it } from "vitest";

import { seedAttributes, seedProducts } from "@/lib/demo/seed-catalog";
import { computeFacets, effectivePrice, isInStock, runListing, sortProducts } from "@/modules/catalog/listing";
import { PAGE_SIZE } from "@/modules/catalog/types";

const earrings = seedProducts.filter((p) => p.primaryCategoryPath === "women/earrings");
const women = seedProducts.filter((p) => p.gender === "women");

describe("runListing", () => {
  it("returns everything with no filters and paginates at 24", () => {
    const r = runListing(women, { filters: {}, sort: null, page: 1 }, "featured", seedAttributes);
    expect(r.total).toBe(women.length);
    expect(r.items.length).toBe(Math.min(PAGE_SIZE, women.length));
    expect(r.totalPages).toBe(Math.ceil(women.length / PAGE_SIZE));
    const page2 = runListing(women, { filters: {}, sort: null, page: 2 }, "featured", seedAttributes);
    expect(page2.items.length).toBe(women.length - PAGE_SIZE);
  });

  it("ANDs across facets and ORs within a facet", () => {
    const r = runListing(earrings, { filters: { finish: ["gold-tone"], occasion: ["wedding", "party-wear"] }, sort: null, page: 1 }, "featured", seedAttributes);
    for (const p of r.items) {
      expect(p.attributes.finish).toContain("gold-tone");
      expect(p.attributes.occasion?.some((o) => o === "wedding" || o === "party-wear")).toBe(true);
    }
    expect(r.total).toBeGreaterThan(0);
  });

  it("filters by price bucket and availability", () => {
    const cheap = runListing(earrings, { filters: { price: ["under-500"] }, sort: null, page: 1 }, "featured", seedAttributes);
    expect(cheap.items.every((p) => effectivePrice(p).pricePaise < 50000)).toBe(true);
    const inStock = runListing(earrings, { filters: { availability: ["in-stock"] }, sort: null, page: 1 }, "featured", seedAttributes);
    expect(inStock.items.every(isInStock)).toBe(true);
    expect(inStock.total).toBeLessThan(earrings.length);
  });

  it("uses the default sort when none is given and sinks sold-out items", () => {
    const r = runListing(earrings, { filters: {}, sort: null, page: 1 }, "featured", seedAttributes);
    expect(r.sort).toBe("featured");
    const firstSoldOut = r.items.findIndex((p) => !isInStock(p));
    const lastInStock = r.items.map(isInStock).lastIndexOf(true);
    expect(firstSoldOut === -1 || firstSoldOut > lastInStock).toBe(true);
  });
});

describe("sortProducts", () => {
  it("sorts by price ascending and descending", () => {
    const asc = sortProducts(earrings, "price-asc").filter(isInStock).map((p) => effectivePrice(p).pricePaise);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortProducts(earrings, "price-desc").filter(isInStock).map((p) => effectivePrice(p).pricePaise);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it("sorts newest first", () => {
    const dates = sortProducts(earrings, "newest").filter(isInStock).map((p) => p.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("computeFacets", () => {
  it("counts disjunctively: selecting a value does not zero its siblings", () => {
    const none = computeFacets(earrings, {}, seedAttributes);
    const finishNone = none.find((f) => f.key === "finish");
    const withGold = computeFacets(earrings, { finish: ["gold-tone"] }, seedAttributes);
    const finishGold = withGold.find((f) => f.key === "finish");
    expect(finishGold?.values.map((v) => [v.slug, v.count])).toEqual(finishNone?.values.map((v) => [v.slug, v.count]));
    expect(finishGold?.values.find((v) => v.slug === "gold-tone")?.selected).toBe(true);
  });

  it("narrows other facets by the active selection", () => {
    const none = computeFacets(earrings, {}, seedAttributes);
    const withOxidised = computeFacets(earrings, { finish: ["oxidised"] }, seedAttributes);
    const colourNone = none.find((f) => f.key === "color")?.values.reduce((n, v) => n + v.count, 0) ?? 0;
    const colourOx = withOxidised.find((f) => f.key === "color")?.values.reduce((n, v) => n + v.count, 0) ?? 0;
    expect(colourOx).toBeLessThan(colourNone);
  });

  it("omits values with zero count unless selected", () => {
    const facets = computeFacets(earrings, {}, seedAttributes);
    for (const f of facets) for (const v of f.values) expect(v.count > 0 || v.selected).toBe(true);
  });
});
