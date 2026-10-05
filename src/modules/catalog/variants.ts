/**
 * Variant resolution and availability. Pure functions, unit-tested.
 */
import type { Product, ProductVariant } from "./types";

export type Availability = "in_stock" | "low_stock" | "out_of_stock";

export const MAX_QUANTITY_PER_LINE = 10;

export function availabilityOf(stock: number, lowStockThreshold: number): Availability {
  if (stock <= 0) return "out_of_stock";
  if (stock <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

/** Availability for the product as a whole (any variant in stock). */
export function productAvailability(product: Product): Availability {
  const total = product.variants.reduce((n, v) => n + Math.max(0, v.stock), 0);
  if (total <= 0) return "out_of_stock";
  const anyComfortable = product.variants.some((v) => v.stock > product.lowStockThreshold);
  return anyComfortable ? "in_stock" : "low_stock";
}

export type VariantResolution =
  | { status: "none"; variant: null }
  | { status: "ok"; variant: ProductVariant }
  | { status: "invalid"; variant: null };

/**
 * Resolve `?variant=SKU`. Single-variant products ignore the parameter.
 * An unknown SKU is `invalid`, which the route turns into a redirect to the
 * canonical product URL rather than a page showing the wrong thing.
 */
export function resolveVariant(product: Product, requestedSku: string | undefined): VariantResolution {
  if (product.variants.length === 1) {
    const only = product.variants[0];
    return only ? { status: "ok", variant: only } : { status: "none", variant: null };
  }
  if (requestedSku === undefined || requestedSku === "") return { status: "none", variant: null };
  const match = product.variants.find((v) => v.sku === requestedSku);
  return match ? { status: "ok", variant: match } : { status: "invalid", variant: null };
}

export function maxQuantity(variant: ProductVariant | null): number {
  if (!variant) return 0;
  return Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, variant.stock));
}
