/**
 * Where a product is pinned on the homepage. The two product rails ("New
 * arrivals", "Bestsellers") fill themselves by rule; the owner can pin a
 * piece to the front of either from the product form. The pin is a tag on
 * the product (`home:new-arrivals`, `home:bestsellers`), so it needs no
 * extra table and travels with the product through export and bulk edits.
 * "Shop the look" is different: it is an ordered list kept in site content
 * (see `home-look.ts`).
 */
import type { Product } from "@/modules/catalog/types";
import { WARRANTY_TAG_PREFIX } from "@/modules/catalog/warranty";

export const PLACEMENT_TAG_PREFIX = "home:";

export const HOME_RAILS = {
  newArrivals: { tag: "home:new-arrivals", label: "New arrivals", hint: "Always shown first in the New arrivals row." },
  bestsellers: { tag: "home:bestsellers", label: "Bestsellers", hint: "Always shown first in the Bestsellers row." },
} as const;

export type HomeRail = keyof typeof HOME_RAILS;
export const HOME_RAIL_KEYS = Object.keys(HOME_RAILS) as HomeRail[];

export function isHomeRail(value: unknown): value is HomeRail {
  return typeof value === "string" && value in HOME_RAILS;
}

/** Placement tags are bookkeeping, never shown to shoppers or searched. */
export function isPlacementTag(tag: string): boolean {
  return tag.startsWith(PLACEMENT_TAG_PREFIX) || tag.startsWith(WARRANTY_TAG_PREFIX);
}

export function shopperTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !isPlacementTag(t));
}

export type RailFlags = Record<HomeRail, boolean>;

/** Which rails a product is pinned to, from its tags. */
export function railFlags(tags: readonly string[]): RailFlags {
  return { newArrivals: tags.includes(HOME_RAILS.newArrivals.tag), bestsellers: tags.includes(HOME_RAILS.bestsellers.tag) };
}

/** The product's tags with the rail pins replaced by `flags`; other tags are kept. */
export function withRailTags(tags: readonly string[], flags: RailFlags): string[] {
  const kept = tags.filter((t) => !HOME_RAIL_KEYS.some((rail) => HOME_RAILS[rail].tag === t));
  const pinned = HOME_RAIL_KEYS.filter((rail) => flags[rail]).map((rail) => HOME_RAILS[rail].tag);
  return [...new Set([...kept, ...pinned])];
}

/** Live pieces pinned to `rail`, newest first. */
export function pinnedFor(products: readonly Product[], rail: HomeRail): Product[] {
  const tag = HOME_RAILS[rail].tag;
  return products
    .filter((p) => p.status === "active" && p.tags.includes(tag))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.name.localeCompare(b.name));
}

/**
 * A homepage rail: the owner's chosen pieces first, then the rule's members,
 * topped up from `pool` while the catalogue is small. Always `size` long
 * when there is enough to show, and longer only if the owner chose more than
 * that.
 */
export function buildRail(pinned: readonly Product[], members: readonly Product[], pool: readonly Product[], size: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of [...pinned, ...members, ...pool]) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
  }
  return out.slice(0, Math.max(size, pinned.length));
}
