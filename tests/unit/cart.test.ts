import { describe, expect, it } from "vitest";

import { addLine, cartTotals, ensureLine, removeLine, setLineQuantity, type CartLine } from "@/modules/cart/store";

const base: Omit<CartLine, "quantity"> = {
  sku: "KL-EAR-0001",
  productSlug: "pearl-drop-earrings-gold-tone",
  name: "Pearl Drop Earrings",
  unitPricePaise: 129900,
  image: { src: "/x.svg", alt: "x" },
};

describe("cart reducers", () => {
  it("adds a new line and merges repeats, capped at the maximum", () => {
    let lines = addLine([], base, 2, 10);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
    lines = addLine(lines, base, 9, 10);
    expect(lines[0]?.quantity).toBe(10);
  });

  it("ensureLine (Buy now) never stacks a second copy of a line that is already in the bag", () => {
    // Add to bag, then Buy now: still one item at checkout.
    let lines = ensureLine(addLine([], base, 1, 10), base, 1, 10);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(1);
    // Buy now with a larger chosen quantity raises the line to it.
    lines = ensureLine(lines, base, 3, 10);
    expect(lines[0]?.quantity).toBe(3);
    // Buy now with a smaller quantity keeps what the shopper already had.
    lines = ensureLine(lines, base, 1, 10);
    expect(lines[0]?.quantity).toBe(3);
    // Never above the cap; and a line not yet in the bag is added normally.
    expect(ensureLine(lines, base, 50, 10)[0]?.quantity).toBe(10);
    expect(ensureLine([], base, 2, 10)[0]?.quantity).toBe(2);
  });

  it("sets quantity and removes at zero", () => {
    let lines = addLine([], base, 1, 10);
    lines = setLineQuantity(lines, base.sku, 4, 10);
    expect(lines[0]?.quantity).toBe(4);
    lines = setLineQuantity(lines, base.sku, 0, 10);
    expect(lines).toHaveLength(0);
  });

  it("computes totals in paise", () => {
    const lines = addLine(addLine([], base, 2, 10), { ...base, sku: "KL-CHA-0002", unitPricePaise: 89900 }, 1, 10);
    expect(cartTotals(lines)).toEqual({ count: 3, subtotalPaise: 2 * 129900 + 89900 });
    expect(cartTotals(removeLine(lines, base.sku)).count).toBe(1);
  });
});
