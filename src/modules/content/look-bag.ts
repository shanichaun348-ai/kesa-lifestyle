/**
 * "Shop the look" as a purchase: turns the look's products into bag lines
 * so every piece can be added in one go. Pure functions; the page gathers
 * the products and the client button adds the lines.
 */
import type { CartLine } from "@/modules/cart/store";
import { effectivePrice } from "@/modules/catalog/listing";
import { primaryImage, productHref } from "@/modules/catalog/presenters";
import type { Product, ProductVariant } from "@/modules/catalog/types";
import { maxQuantity } from "@/modules/catalog/variants";

export const SHOP_THE_LOOK_PATH = "/shop-the-look/";

export type LookPiece = {
  slug: string;
  name: string;
  href: string;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  pricePaise: number;
  compareAtPaise: number | undefined;
  categoryPath: string;
  /** What "add the look" puts in the bag, or null when the piece is sold out. */
  line: (Omit<CartLine, "quantity"> & { maxQuantity: number }) | null;
};

/**
 * The variant that goes in the bag: the only one for single-option pieces,
 * otherwise the first in-stock option (the cheapest way to complete the
 * look; the piece's own page lets the shopper change it).
 */
export function defaultVariant(product: Product): ProductVariant | null {
  if (product.variants.length === 1) return product.variants[0] ?? null;
  const inStock = [...product.variants].filter((v) => v.stock > 0).sort((a, b) => a.pricePaise - b.pricePaise);
  return inStock[0] ?? null;
}

export function toLookPiece(product: Product): LookPiece {
  const variant = defaultVariant(product);
  const { pricePaise, compareAtPaise } = effectivePrice(product);
  const image = primaryImage(product);
  const available = variant !== null && variant.stock > 0;
  return {
    slug: product.slug,
    name: product.name,
    href: productHref(product),
    image: { src: image.src, alt: image.alt, unoptimized: image.unoptimized },
    pricePaise: available && variant ? variant.pricePaise : pricePaise,
    compareAtPaise: available && variant ? variant.compareAtPaise : compareAtPaise,
    categoryPath: product.primaryCategoryPath,
    line:
      available && variant
        ? {
            sku: variant.sku,
            productSlug: product.slug,
            name: product.name,
            optionLabel: product.optionName && variant.optionValue ? `${product.optionName}: ${variant.optionValue}` : undefined,
            unitPricePaise: variant.pricePaise,
            image: { src: image.src, alt: image.alt, unoptimized: image.unoptimized },
            maxQuantity: maxQuantity(variant),
          }
        : null,
  };
}

export type LookTotals = {
  /** Pieces that can be bought right now. */
  available: number;
  soldOut: number;
  /** Sum of the available pieces at today's prices. */
  totalPaise: number;
  /** Sum of their compare-at prices (only where one is set), for the "you save" line. */
  compareTotalPaise: number;
  savingsPaise: number;
};

export function lookTotals(pieces: readonly LookPiece[]): LookTotals {
  let available = 0;
  let soldOut = 0;
  let totalPaise = 0;
  let compareTotalPaise = 0;
  for (const piece of pieces) {
    if (!piece.line) {
      soldOut += 1;
      continue;
    }
    available += 1;
    totalPaise += piece.pricePaise;
    compareTotalPaise += piece.compareAtPaise ?? piece.pricePaise;
  }
  return { available, soldOut, totalPaise, compareTotalPaise, savingsPaise: Math.max(0, compareTotalPaise - totalPaise) };
}
