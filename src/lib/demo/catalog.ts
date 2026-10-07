/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO DATA — NOT REAL PRODUCTS
 *
 * View-model projections of the demo seed catalogue (`seed-catalog.ts`) for
 * the homepage and the design-system showcase. Everything is invented and
 * exists for layout review only. Replaced by repository queries in Phase 1.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { CartDrawerLine } from "@/components/storefront/cart-drawer";
import type { ProductCardData } from "@/components/storefront/product-card";
import { sortProducts } from "@/modules/catalog/listing";
import { toCardData } from "@/modules/catalog/presenters";

import { SEED_NOW, seedProducts } from "./seed-catalog";

export const DEMO_CONTENT_NOTICE =
  "Sample reviews, stories and social posts shown for layout review. Verified reviews and real stories appear here after launch.";

const siblingsOf = (slug: string) => {
  const me = seedProducts.find((p) => p.slug === slug);
  return me?.familyId ? seedProducts.filter((p) => p.familyId === me.familyId && p.slug !== slug) : [];
};

const card = (slug: string): ProductCardData | undefined => {
  const product = seedProducts.find((p) => p.slug === slug);
  return product ? toCardData(product, { now: SEED_NOW, siblings: siblingsOf(slug) }) : undefined;
};

const cards = (slugs: string[]) => slugs.map(card).filter((c): c is ProductCardData => c !== undefined);

/** Four representative cards for the design-system showcase. */
export const sampleProducts: ProductCardData[] = cards([
  "pearl-drop-earrings-gold-tone",
  "fine-box-chain-stainless-steel",
  "layered-coin-necklace",
  "oxidised-jhumka-earrings",
]);

export const demoProducts: ProductCardData[] = seedProducts.map((p) => toCardData(p, { now: SEED_NOW, siblings: siblingsOf(p.slug) }));

export const demoNewArrivals: ProductCardData[] = sortProducts(seedProducts, "newest")
  .slice(0, 4)
  .map((p) => toCardData(p, { now: SEED_NOW, siblings: siblingsOf(p.slug) }));

export const demoBestSellers: ProductCardData[] = sortProducts(seedProducts, "bestselling")
  .slice(0, 4)
  .map((p) => toCardData(p, { now: SEED_NOW, siblings: siblingsOf(p.slug) }));

export const sampleCartLines: CartDrawerLine[] = [
  {
    id: "demo-l1",
    name: "Pearl Drop Earrings in Gold Tone",
    quantity: 1,
    pricePaise: 129900,
    image: { src: "/placeholders/product-1.svg", alt: "Placeholder: pearl drop earrings", unoptimized: true },
  },
  {
    id: "demo-l2",
    name: "Fine Box Chain, Stainless Steel",
    variant: "Length: 20 inch",
    quantity: 2,
    pricePaise: 89900,
    image: { src: "/placeholders/product-3.svg", alt: "Placeholder: fine box chain", unoptimized: true },
  },
];
