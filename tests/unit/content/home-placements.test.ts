/**
 * Homepage placements chosen from the product form: rail pins stored as
 * product tags, and how a rail is assembled from pins, rule members and
 * the rest of the catalogue.
 */
import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/catalog/types";
import { toggleLookSlug } from "@/modules/content/home-look";
import { buildRail, HOME_RAILS, isPlacementTag, pinnedFor, railFlags, shopperTags, withRailTags } from "@/modules/content/home-placements";

const product = (slug: string, extra: Partial<Product> = {}) =>
  ({ slug, name: slug, status: "active", tags: [], publishedAt: "2026-10-01T00:00:00.000Z", ...extra }) as Product;

describe("rail tags", () => {
  it("reads and writes the pins without touching other tags", () => {
    expect(railFlags([])).toEqual({ newArrivals: false, bestsellers: false });
    expect(railFlags(["gift", HOME_RAILS.bestsellers.tag])).toEqual({ newArrivals: false, bestsellers: true });

    const tags = withRailTags(["gift", HOME_RAILS.bestsellers.tag], { newArrivals: true, bestsellers: false });
    expect(tags).toEqual(["gift", HOME_RAILS.newArrivals.tag]);
    expect(withRailTags(tags, { newArrivals: false, bestsellers: false })).toEqual(["gift"]);
  });

  it("keeps placement tags out of what shoppers can search", () => {
    expect(isPlacementTag("home:new-arrivals")).toBe(true);
    expect(isPlacementTag("homely")).toBe(false);
    expect(shopperTags(["pearl", "home:bestsellers"])).toEqual(["pearl"]);
  });
});

describe("pinnedFor", () => {
  it("returns only live pieces with the rail's tag, newest first", () => {
    const pool = [
      product("old", { tags: [HOME_RAILS.newArrivals.tag], publishedAt: "2026-09-01T00:00:00.000Z" }),
      product("draft", { status: "draft", tags: [HOME_RAILS.newArrivals.tag] }),
      product("other-rail", { tags: [HOME_RAILS.bestsellers.tag] }),
      product("new", { tags: [HOME_RAILS.newArrivals.tag], publishedAt: "2026-10-05T00:00:00.000Z" }),
    ];
    expect(pinnedFor(pool, "newArrivals").map((p) => p.slug)).toEqual(["new", "old"]);
    expect(pinnedFor(pool, "bestsellers").map((p) => p.slug)).toEqual(["other-rail"]);
  });
});

describe("buildRail", () => {
  const p = (s: string) => product(s);

  it("puts pins first, then rule members, then tops up from the pool without repeats", () => {
    const rail = buildRail([p("pin")], [p("rule-1"), p("pin"), p("rule-2")], [p("rule-1"), p("fill-1"), p("fill-2")], 4);
    expect(rail.map((x) => x.slug)).toEqual(["pin", "rule-1", "rule-2", "fill-1"]);
  });

  it("stays at the rail size unless the owner pinned more than that", () => {
    expect(buildRail([], [p("a"), p("b")], [p("c"), p("d"), p("e")], 4)).toHaveLength(4);
    const pins = [p("1"), p("2"), p("3"), p("4"), p("5")];
    expect(buildRail(pins, [p("rule")], [], 4).map((x) => x.slug)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("shows what there is while the catalogue is tiny", () => {
    expect(buildRail([], [], [p("only")], 4).map((x) => x.slug)).toEqual(["only"]);
  });
});

describe("toggleLookSlug", () => {
  const config = { productSlugs: ["a", "b"], href: "/x/" };

  it("appends a new piece and removes an existing one, keeping the others' order", () => {
    expect(toggleLookSlug(config, "c", true)).toEqual({ changed: true, config: { productSlugs: ["a", "b", "c"], href: "/x/" } });
    expect(toggleLookSlug(config, "a", false)).toEqual({ changed: true, config: { productSlugs: ["b"], href: "/x/" } });
  });

  it("reports when nothing changes or the look is full", () => {
    expect(toggleLookSlug(config, "a", true)).toMatchObject({ changed: false, reason: "unchanged" });
    expect(toggleLookSlug(config, "zzz", false)).toMatchObject({ changed: false, reason: "unchanged" });
    const full = { productSlugs: ["1", "2", "3", "4", "5", "6"], href: "/x/" };
    expect(toggleLookSlug(full, "7", true)).toMatchObject({ changed: false, reason: "full" });
    expect(toggleLookSlug(full, "3", false)).toMatchObject({ changed: true });
  });
});
