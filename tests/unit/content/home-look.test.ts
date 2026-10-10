/**
 * "Shop the look" configuration: what the owner may save and which pieces
 * the homepage lists when some picks are missing or none were made.
 */
import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/catalog/types";
import { DEFAULT_HOME_LOOK, homeLookSchema, MAX_LOOK_PRODUCTS, pickLookProducts } from "@/modules/content/home-look";

const product = (slug: string, status: Product["status"] = "active") => ({ slug, status, name: slug }) as Product;

describe("homeLookSchema", () => {
  it("defaults to no picks and the new-arrivals link", () => {
    expect(DEFAULT_HOME_LOOK).toEqual({ productSlugs: [], href: "/collections/new-arrivals/" });
  });

  it("caps the number of pieces and only accepts same-site links", () => {
    expect(homeLookSchema.safeParse({ productSlugs: Array.from({ length: MAX_LOOK_PRODUCTS + 1 }, (_, i) => `p-${i}`) }).success).toBe(false);
    expect(homeLookSchema.safeParse({ productSlugs: ["Bad Slug"] }).success).toBe(false);
    expect(homeLookSchema.safeParse({ href: "https://elsewhere.example/" }).success).toBe(false);
    expect(homeLookSchema.safeParse({ href: "/collections/festive" }).success).toBe(false);
    expect(homeLookSchema.safeParse({ productSlugs: ["ring-a", "ring-b"], href: "/women/necklaces/" }).success).toBe(true);
  });
});

describe("pickLookProducts", () => {
  const newest = [product("new-1"), product("new-2"), product("new-3"), product("new-4")];

  it("keeps the owner's order and drops pieces that are no longer live", () => {
    const config = { productSlugs: ["c", "a", "gone", "b"], href: "/x/" };
    const chosen = [product("a"), product("b"), product("c"), product("gone", "draft")];
    expect(pickLookProducts(config, chosen, newest).map((p) => p.slug)).toEqual(["c", "a", "b"]);
  });

  it("falls back to the newest live pieces when nothing usable is configured", () => {
    expect(pickLookProducts(DEFAULT_HOME_LOOK, [], newest).map((p) => p.slug)).toEqual(["new-1", "new-2", "new-3"]);
    expect(pickLookProducts({ productSlugs: ["gone"], href: "/x/" }, [], newest)).toHaveLength(3);
  });

  it("returns nothing when the catalogue has no live product at all", () => {
    expect(pickLookProducts(DEFAULT_HOME_LOOK, [], [product("d", "draft")])).toEqual([]);
  });
});
