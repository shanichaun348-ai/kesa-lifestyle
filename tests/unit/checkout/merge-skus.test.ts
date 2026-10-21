import { describe, expect, it } from "vitest";

import { mergeDuplicateSkus } from "@/modules/checkout/pricing";

describe("mergeDuplicateSkus", () => {
  it("adds up repeated SKUs into one line, keeping first-seen order", () => {
    const merged = mergeDuplicateSkus([
      { sku: "A", quantity: 6 },
      { sku: "B", quantity: 1 },
      { sku: "A", quantity: 6 },
    ]);
    expect(merged).toEqual([
      { sku: "A", quantity: 12 },
      { sku: "B", quantity: 1 },
    ]);
  });

  it("leaves a cart without duplicates alone", () => {
    const lines = [{ sku: "A", quantity: 1 }, { sku: "B", quantity: 2 }];
    expect(mergeDuplicateSkus(lines)).toEqual(lines);
  });

  it("keeps extra fields from the first occurrence", () => {
    const merged = mergeDuplicateSkus([
      { sku: "A", quantity: 1, note: "first" },
      { sku: "A", quantity: 2, note: "second" },
    ]);
    expect(merged).toEqual([{ sku: "A", quantity: 3, note: "first" }]);
  });
});
