/**
 * The bag lives in the browser, so it can hold pieces that were unpublished,
 * deleted or sold out after they were added. `checkLines` is the shared
 * judgement the bag page and the checkout use before the payment step.
 */
import { describe, expect, it } from "vitest";

import { allPurchasable, checkLines, describeLineCheck, type AvailabilityItem } from "@/modules/cart/availability";

const live: AvailabilityItem[] = [
  { sku: "M-198", name: "Mangalsutra", productSlug: "mangalsutra", unitPricePaise: 29900, stock: 5 },
  { sku: "RING-7", name: "Ring", productSlug: "ring", unitPricePaise: 49900, stock: 0 },
  { sku: "EAR-2", name: "Earrings", productSlug: "earrings", unitPricePaise: 19900, stock: 2 },
];

describe("checkLines", () => {
  it("marks a line unavailable when the catalogue no longer lists its SKU", () => {
    const checks = checkLines([{ sku: "NECKLACE-76-77", quantity: 1 }, { sku: "M-198", quantity: 1 }], live);
    expect(checks.get("NECKLACE-76-77")).toEqual({ kind: "unavailable" });
    expect(checks.get("M-198")).toEqual({ kind: "ok", unitPricePaise: 29900 });
    expect(allPurchasable(checks)).toBe(false);
  });

  it("distinguishes sold out from short stock", () => {
    const checks = checkLines([{ sku: "RING-7", quantity: 1 }, { sku: "EAR-2", quantity: 3 }, { sku: "EAR-2", quantity: 2 }], live);
    expect(checks.get("RING-7")).toEqual({ kind: "sold_out" });
    // the later line for the same SKU wins; both are judged against the live stock
    expect(checks.get("EAR-2")).toEqual({ kind: "ok", unitPricePaise: 19900 });
    expect(checkLines([{ sku: "EAR-2", quantity: 3 }], live).get("EAR-2")).toEqual({ kind: "limited", stock: 2 });
  });

  it("reports the current price so the bag never shows a stale one", () => {
    const checks = checkLines([{ sku: "M-198", quantity: 2 }], [{ ...live[0]!, unitPricePaise: 34900 }]);
    expect(checks.get("M-198")).toEqual({ kind: "ok", unitPricePaise: 34900 });
    expect(allPurchasable(checks)).toBe(true);
  });

  it("has shopper wording for every problem and none for a good line", () => {
    expect(describeLineCheck({ kind: "ok", unitPricePaise: 1 })).toBeNull();
    expect(describeLineCheck({ kind: "unavailable" })).toMatch(/no longer available/);
    expect(describeLineCheck({ kind: "sold_out" })).toMatch(/sold out/i);
    expect(describeLineCheck({ kind: "limited", stock: 2 })).toMatch(/only 2 left/i);
  });
});
