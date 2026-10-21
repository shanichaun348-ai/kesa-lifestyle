import "server-only";

import type { CatalogRepository } from "@/modules/catalog/repository";
import type { CartInput, PricedLine, PricingOutcome, PricingResult } from "./types";
import { validateCoupon } from "./coupon";

// ── Shipping policy ───────────────────────────────────────────────────────────
// ₹59 flat shipping; free on orders ≥ ₹999 (after discount).
// Phase 2: replace with Shiprocket live rates.
const SHIPPING_PAISE = Number(process.env.SHIPPING_STANDARD_PAISE ?? 5900); // ₹59
const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999

/** Max quantity per line — prevents inventory exhaustion attacks. */
const MAX_QUANTITY_PER_LINE = 10;

/** Collapse repeated SKUs into one line each, summing quantities; first occurrence keeps its position. */
export function mergeDuplicateSkus<T extends { sku: string; quantity: number }>(lines: readonly T[]): T[] {
  const bySku = new Map<string, T>();
  for (const line of lines) {
    const existing = bySku.get(line.sku);
    if (existing) bySku.set(line.sku, { ...existing, quantity: existing.quantity + line.quantity });
    else bySku.set(line.sku, { ...line });
  }
  return [...bySku.values()];
}

/**
 * Authoritative server-side price calculation.
 *
 * Security contract:
 *   - The caller must supply ONLY trusted identifiers: sku + quantity.
 *   - Every monetary value (unit price, discount, shipping, tax, total) is
 *     computed here from server-read data. Nothing from the browser is trusted.
 *   - The returned `totalPaise` is the ONLY value that may be passed to Razorpay.
 *
 * @param input  Cart lines (sku + quantity) and optional coupon code.
 * @param repo   CatalogRepository — reads authoritative prices from the source.
 */
export async function computeOrderPricing(input: CartInput, repo: CatalogRepository): Promise<PricingOutcome> {
  const { couponCode, customerEmail } = input;

  if (!input.lines || input.lines.length === 0) {
    return { ok: false, error: { code: "EMPTY_CART", message: "Cart is empty." } };
  }

  // The same SKU on several lines is one line: otherwise 6 + 6 of a piece would slip past the
  // per-line cap and the reservation table, which has one row per (order, sku), would under-record it.
  const rawLines = mergeDuplicateSkus(input.lines);

  // ── 1. Validate all quantities before any DB work ─────────────────────────
  for (const line of rawLines) {
    const qty = line.quantity;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_LINE) {
      return {
        ok: false,
        error: {
          code: "INVALID_QUANTITY",
          message: `Quantity for SKU "${line.sku}" must be between 1 and ${MAX_QUANTITY_PER_LINE}.`,
          sku: line.sku,
        },
      };
    }
  }

  // ── 2. Bulk-fetch products by SKU (one query / in-memory scan) ────────────
  const skus = rawLines.map((l) => l.sku);
  const skuMap = await repo.getProductsBySku(skus);

  // ── 3. Build priced lines ─────────────────────────────────────────────────
  const pricedLines: PricedLine[] = [];

  for (const { sku, quantity } of rawLines) {
    const entry = skuMap.get(sku);
    if (!entry) {
      return { ok: false, error: { code: "PRODUCT_NOT_FOUND", message: `Product with SKU "${sku}" not found.`, sku } };
    }

    const { product, variant } = entry;

    // Status check — getProductsBySku already filters to active, but be explicit.
    if (product.status !== "active") {
      return { ok: false, error: { code: "PRODUCT_NOT_ACTIVE", message: `Product "${product.name}" is not available.`, sku } };
    }

    if (variant.stock < quantity) {
      return {
        ok: false,
        error: {
          code: "OUT_OF_STOCK",
          message: variant.stock === 0
            ? `"${product.name}" is out of stock.`
            : `Only ${variant.stock} of "${product.name}" available (requested ${quantity}).`,
          sku,
        },
      };
    }

    pricedLines.push({
      sku,
      productId: product.id,
      productName: product.name,
      ...(variant.optionValue !== undefined && { variantOptionValue: variant.optionValue }),
      quantity,
      unitPricePaise: variant.pricePaise,       // server-read, authoritative
      ...(variant.compareAtPaise !== undefined && { compareAtPaise: variant.compareAtPaise }),
      lineTotalPaise: variant.pricePaise * quantity,
      gstRateBp: product.gstRateBp,
      hsnCode: product.hsnCode,
    });
  }

  // ── 4. Subtotal ───────────────────────────────────────────────────────────
  const subtotalPaise = pricedLines.reduce((sum, l) => sum + l.lineTotalPaise, 0);

  // ── 5. GST component (inclusive — for invoice display, not an additional charge) ─
  const gstPaise = pricedLines.reduce((sum, l) => {
    const gstFraction = l.gstRateBp / (10000 + l.gstRateBp);
    return sum + Math.round(l.lineTotalPaise * gstFraction);
  }, 0);

  // ── 6. Coupon ─────────────────────────────────────────────────────────────
  let discountPaise = 0;
  let appliedCoupon: PricingResult["coupon"] = null;

  if (couponCode && couponCode.trim() !== "") {
    const productSlugs = pricedLines.map((l) => {
      const entry = skuMap.get(l.sku);
      return entry?.product.slug ?? "";
    });
    const couponResult = await validateCoupon(couponCode, subtotalPaise, productSlugs, customerEmail);
    if (!couponResult.ok) {
      return { ok: false, error: couponResult.error };
    }
    appliedCoupon = couponResult.coupon;
    discountPaise = couponResult.coupon.discountPaise;
  }

  // ── 7. Shipping (applied after discount) ─────────────────────────────────
  const payableBeforeShipping = subtotalPaise - discountPaise;
  const shippingPaise = payableBeforeShipping >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_PAISE;

  // ── 8. Final total ────────────────────────────────────────────────────────
  const totalPaise = payableBeforeShipping + shippingPaise;

  return {
    ok: true,
    result: {
      lines: pricedLines,
      subtotalPaise,
      coupon: appliedCoupon,
      discountPaise,
      shippingPaise,
      gstPaise,
      totalPaise,
    },
  };
}
