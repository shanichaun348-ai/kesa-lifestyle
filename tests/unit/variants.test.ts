import { describe, expect, it } from "vitest";

import { seedProducts } from "@/lib/demo/seed-catalog";
import { availabilityOf, maxQuantity, productAvailability, resolveVariant } from "@/modules/catalog/variants";

const single = seedProducts.find((p) => p.slug === "pearl-drop-earrings-gold-tone");
const multi = seedProducts.find((p) => p.slug === "fine-box-chain-stainless-steel");
const soldOut = seedProducts.find((p) => p.slug === "oxidised-jhumka-earrings");

describe("resolveVariant", () => {
  it("single-variant products resolve regardless of the parameter", () => {
    if (!single) throw new Error("seed missing");
    expect(resolveVariant(single, undefined).status).toBe("ok");
    expect(resolveVariant(single, "garbage").status).toBe("ok");
  });

  it("multi-variant products require a choice and reject unknown SKUs", () => {
    if (!multi) throw new Error("seed missing");
    expect(resolveVariant(multi, undefined)).toEqual({ status: "none", variant: null });
    const valid = multi.variants[1]?.sku ?? "";
    const r = resolveVariant(multi, valid);
    expect(r.status).toBe("ok");
    expect(r.variant?.sku).toBe(valid);
    expect(resolveVariant(multi, "KL-NOPE")).toEqual({ status: "invalid", variant: null });
  });
});

describe("availability", () => {
  it("classifies stock against the threshold", () => {
    expect(availabilityOf(0, 3)).toBe("out_of_stock");
    expect(availabilityOf(2, 3)).toBe("low_stock");
    expect(availabilityOf(3, 3)).toBe("low_stock");
    expect(availabilityOf(4, 3)).toBe("in_stock");
  });

  it("product-level availability rolls up variants", () => {
    if (!multi || !soldOut) throw new Error("seed missing");
    expect(productAvailability(multi)).toBe("in_stock");
    expect(productAvailability(soldOut)).toBe("out_of_stock");
  });

  it("caps quantity by stock and the per-line maximum", () => {
    expect(maxQuantity(null)).toBe(0);
    expect(maxQuantity({ sku: "x", pricePaise: 1, stock: 2 })).toBe(2);
    expect(maxQuantity({ sku: "x", pricePaise: 1, stock: 50 })).toBe(10);
  });
});
