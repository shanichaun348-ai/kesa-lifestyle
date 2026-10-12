/**
 * "Shop the look" on the homepage: which pieces are listed beside the photo
 * and where "Shop the full look" goes. Pure definitions shared by the
 * storefront, the admin editor and the tests; the database access lives in
 * `home-look-server.ts`.
 */
import { z } from "zod";

import type { Product } from "@/modules/catalog/types";

export const HOME_LOOK_KEY = "home.look";
export const MAX_LOOK_PRODUCTS = 6;
/** How many pieces to show when the owner has not chosen any yet. */
export const FALLBACK_LOOK_COUNT = 3;

const SLUG = /^[a-z0-9-]{1,120}$/;
/** Same-site path with a trailing slash, e.g. "/collections/festive-edit/". */
const SITE_PATH = /^\/(?:[a-z0-9-]+\/)*$/;

export const homeLookSchema = z.object({
  /** Product slugs in display order. */
  productSlugs: z.array(z.string().regex(SLUG, "Not a product slug.")).max(MAX_LOOK_PRODUCTS, `Choose at most ${MAX_LOOK_PRODUCTS} pieces.`).default([]),
  /** Where "Shop the full look" goes. */
  href: z.string().regex(SITE_PATH, "Enter a link on this site, starting and ending with /, e.g. /collections/new-arrivals/").default("/collections/new-arrivals/"),
});

export type HomeLook = z.infer<typeof homeLookSchema>;

export const DEFAULT_HOME_LOOK: HomeLook = homeLookSchema.parse({});

/**
 * The pieces to list, in the owner's order. When nothing is configured (or
 * none of the chosen pieces is on sale any more) the newest live pieces
 * stand in, so the section never shows a product that cannot be opened.
 */
export function pickLookProducts(config: HomeLook, chosen: Product[], activeNewestFirst: Product[]): Product[] {
  const bySlug = new Map(chosen.filter((p) => p.status === "active").map((p) => [p.slug, p]));
  const picked = config.productSlugs.map((slug) => bySlug.get(slug)).filter((p): p is Product => p !== undefined);
  if (picked.length > 0) return picked;
  return activeNewestFirst.filter((p) => p.status === "active").slice(0, FALLBACK_LOOK_COUNT);
}

export type LookToggle =
  | { changed: true; config: HomeLook }
  | { changed: false; reason: "unchanged" | "full"; config: HomeLook };

/**
 * Adds a product to the end of the look, or removes it. Used by the product
 * form's "Show in Shop the look" box; the homepage editor sets the order.
 */
export function toggleLookSlug(config: HomeLook, slug: string, include: boolean): LookToggle {
  const present = config.productSlugs.includes(slug);
  if (include === present) return { changed: false, reason: "unchanged", config };
  if (!include) return { changed: true, config: { ...config, productSlugs: config.productSlugs.filter((s) => s !== slug) } };
  if (config.productSlugs.length >= MAX_LOOK_PRODUCTS) return { changed: false, reason: "full", config };
  return { changed: true, config: { ...config, productSlugs: [...config.productSlugs, slug] } };
}
