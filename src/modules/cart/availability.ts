/**
 * Bag lines live in the browser, so a piece can be unpublished, deleted or
 * sold out after it was added. These helpers compare the saved lines with
 * what the catalogue says today. Pure, so the bag page, the checkout and the
 * tests share one definition of "can this line be bought".
 */

/** What `/api/catalog/availability/` reports for one SKU that is on sale. */
export type AvailabilityItem = {
  sku: string;
  name: string;
  productSlug: string;
  unitPricePaise: number;
  stock: number;
};

export type LineCheck =
  | { kind: "ok"; unitPricePaise: number }
  /** Not in the catalogue any more: deleted, unpublished, archived or renamed. */
  | { kind: "unavailable" }
  | { kind: "sold_out" }
  /** In stock, but fewer than the bag asks for. */
  | { kind: "limited"; stock: number };

export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
export const MAX_SKUS_PER_CHECK = 50;

/**
 * Judges each bag line against the catalogue answer. A SKU missing from
 * `items` is unavailable; the catalogue only returns live products.
 */
export function checkLines(
  lines: ReadonlyArray<{ sku: string; quantity: number }>,
  items: ReadonlyArray<AvailabilityItem>,
): Map<string, LineCheck> {
  const bySku = new Map(items.map((i) => [i.sku, i]));
  const result = new Map<string, LineCheck>();
  for (const line of lines) {
    const item = bySku.get(line.sku);
    if (!item) result.set(line.sku, { kind: "unavailable" });
    else if (item.stock <= 0) result.set(line.sku, { kind: "sold_out" });
    else if (item.stock < line.quantity) result.set(line.sku, { kind: "limited", stock: item.stock });
    else result.set(line.sku, { kind: "ok", unitPricePaise: item.unitPricePaise });
  }
  return result;
}

/** True when every line can be bought at its quantity. */
export function allPurchasable(checks: ReadonlyMap<string, LineCheck>): boolean {
  for (const check of checks.values()) if (check.kind !== "ok") return false;
  return true;
}

/** Shopper-facing wording for a line that cannot be bought as-is. */
export function describeLineCheck(check: LineCheck): string | null {
  switch (check.kind) {
    case "ok":
      return null;
    case "unavailable":
      return "This piece is no longer available.";
    case "sold_out":
      return "Sold out.";
    case "limited":
      return `Only ${check.stock} left.`;
  }
}
