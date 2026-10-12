/**
 * Map domain products onto the view models the UI components take.
 * Kept free of I/O so it can be used from route handlers and tests.
 */
import type { ProductCardData } from "@/components/storefront/product-card";

import { effectivePrice, isBestseller, isInStock, isNewArrival } from "./listing";
import type { ImageRef, Product } from "./types";

export type QuickViewProduct = {
  slug: string;
  name: string;
  href: string;
  shortDescription: string;
  pricePaise: number;
  compareAtPaise?: number | undefined;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  optionName?: "Size" | "Length" | undefined;
  options: Array<{ sku: string; label: string; inStock: boolean; stock: number; pricePaise: number }>;
  rating?: { value: number; count: number } | undefined;
  inStock: boolean;
};

export function productHref(product: Pick<Product, "slug">): string {
  return `/products/${product.slug}/`;
}

/** First product image, or a neutral placeholder so `<Image>` never receives an empty src. */
export function primaryImage(product: Pick<Product, "images" | "name">): ImageRef {
  return product.images[0] ?? { src: "/placeholders/product-1.svg", alt: `${product.name} — image coming soon`, unoptimized: true };
}

export function toQuickView(product: Product): QuickViewProduct {
  const { pricePaise, compareAtPaise } = effectivePrice(product);
  const image = primaryImage(product);
  return {
    slug: product.slug,
    name: product.name,
    href: productHref(product),
    shortDescription: product.shortDescription,
    pricePaise,
    compareAtPaise,
    image,
    optionName: product.optionName,
    options: product.variants.map((v) => ({
      sku: v.sku,
      label: v.optionValue ?? "",
      inStock: v.stock > 0,
      stock: v.stock,
      pricePaise: v.pricePaise,
    })),
    rating: product.rating,
    inStock: isInStock(product),
  };
}

export type ToCardOptions = {
  now: Date;
  siblings?: Product[] | undefined;
  /** Attach quick-view data (desktop listing pages). */
  quickView?: boolean | undefined;
};

const SWATCH_BY_FINISH: Record<string, string> = {
  "gold-tone": "#C9A66B",
  "rose-gold-tone": "#D4A69A",
  "silver-tone": "#C8C8C8",
  oxidised: "#6B6660",
  "rhodium-plated": "#D9DCDF",
};

export function toCardData(product: Product, opts: ToCardOptions): ProductCardData {
  const { pricePaise, compareAtPaise } = effectivePrice(product);
  const primary = primaryImage(product);
  const hover = product.images[1];
  const inStock = isInStock(product);

  const badge = isNewArrival(product, opts.now)
    ? { label: "New" as const }
    : isBestseller(product)
      ? { label: "Bestseller" as const, variant: "muted" as const }
      : undefined;

  const siblings = (opts.siblings ?? []).map((s) => ({
    label: s.familyOptionLabel ?? s.name,
    hex: SWATCH_BY_FINISH[s.attributes.finish?.[0] ?? ""] ?? "#D9D4CB",
    href: productHref(s),
  }));

  const card: ProductCardData = {
    slug: product.slug,
    name: product.name,
    pricePaise,
    compareAtPaise,
    image: primary,
    hoverImage: hover,
    badge,
    rating: product.rating,
    siblings: siblings.length > 0 ? siblings : undefined,
    quickAdd: product.variants.length === 1 && inStock
      ? { sku: product.variants[0]!.sku, unitPricePaise: product.variants[0]!.pricePaise }
      : undefined,
    soldOut: !inStock,
    hasVideo: (product.videos?.length ?? 0) > 0,
  };
  if (opts.quickView) card.quickView = toQuickView(product);
  return card;
}
