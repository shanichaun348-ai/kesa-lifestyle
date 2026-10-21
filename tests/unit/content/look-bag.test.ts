import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/catalog/types";
import { defaultVariant, lookTotals, toLookPiece } from "@/modules/content/look-bag";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "test-piece",
    name: "Test Piece",
    gender: "women",
    status: "active",
    primaryCategoryPath: "women/necklaces",
    categoryPaths: ["women/necklaces"],
    tags: [],
    attributes: {},
    variants: [{ sku: "T-1", pricePaise: 29900, compareAtPaise: 49900, stock: 10 }],
    images: [{ src: "/media/products/test-piece/1.jpg", alt: "Test piece" }],
    shortDescription: "",
    description: [],
    highlights: [],
    stylingTips: [],
    care: "",
    hsnCode: "7117",
    gstRateBp: 300,
    returnPolicy: "returnable",
    lowStockThreshold: 3,
    completeTheLookSlugs: [],
    publishedAt: "2026-01-01T00:00:00.000Z",
    sales30d: 0,
    sortWeight: 0,
    ...overrides,
  };
}

describe("defaultVariant", () => {
  it("is the only variant for single-option pieces, even when out of stock", () => {
    expect(defaultVariant(product())?.sku).toBe("T-1");
    expect(defaultVariant(product({ variants: [{ sku: "T-1", pricePaise: 29900, stock: 0 }] }))?.sku).toBe("T-1");
  });

  it("is the cheapest in-stock option for multi-option pieces", () => {
    const p = product({
      optionName: "Length",
      variants: [
        { sku: "L-18", optionValue: "18 in", pricePaise: 19900, stock: 0 },
        { sku: "L-20", optionValue: "20 in", pricePaise: 25900, stock: 4 },
        { sku: "L-16", optionValue: "16 in", pricePaise: 21900, stock: 2 },
      ],
    });
    expect(defaultVariant(p)?.sku).toBe("L-16");
  });

  it("is null when every option is sold out", () => {
    const p = product({ variants: [{ sku: "A", pricePaise: 100, stock: 0 }, { sku: "B", pricePaise: 200, stock: 0 }] });
    expect(defaultVariant(p)).toBeNull();
  });
});

describe("toLookPiece", () => {
  it("builds a bag line for an available piece", () => {
    const piece = toLookPiece(product());
    expect(piece.href).toBe("/products/test-piece/");
    expect(piece.pricePaise).toBe(29900);
    expect(piece.compareAtPaise).toBe(49900);
    expect(piece.line).toEqual({
      sku: "T-1",
      productSlug: "test-piece",
      name: "Test Piece",
      optionLabel: undefined,
      unitPricePaise: 29900,
      image: { src: "/media/products/test-piece/1.jpg", alt: "Test piece", unoptimized: undefined },
      maxQuantity: 10,
    });
  });

  it("labels the chosen option and caps the quantity at stock", () => {
    const piece = toLookPiece(
      product({
        optionName: "Length",
        variants: [{ sku: "L-18", optionValue: "18 in", pricePaise: 19900, stock: 2 }, { sku: "L-20", optionValue: "20 in", pricePaise: 25900, stock: 9 }],
      }),
    );
    expect(piece.line?.sku).toBe("L-18");
    expect(piece.line?.optionLabel).toBe("Length: 18 in");
    expect(piece.line?.maxQuantity).toBe(2);
  });

  it("has no line when the piece is sold out but still shows a price", () => {
    const piece = toLookPiece(product({ variants: [{ sku: "T-1", pricePaise: 29900, stock: 0 }] }));
    expect(piece.line).toBeNull();
    expect(piece.pricePaise).toBe(29900);
  });

  it("falls back to a placeholder image", () => {
    const piece = toLookPiece(product({ images: [] }));
    expect(piece.image.src).toMatch(/placeholders/);
    expect(piece.image.unoptimized).toBe(true);
  });
});

describe("lookTotals", () => {
  it("sums only the available pieces and reports savings", () => {
    const pieces = [
      toLookPiece(product({ slug: "a" })),
      toLookPiece(product({ slug: "b", variants: [{ sku: "B", pricePaise: 79900, stock: 1 }] })),
      toLookPiece(product({ slug: "c", variants: [{ sku: "C", pricePaise: 50000, compareAtPaise: 60000, stock: 0 }] })),
    ];
    expect(lookTotals(pieces)).toEqual({
      available: 2,
      soldOut: 1,
      totalPaise: 29900 + 79900,
      compareTotalPaise: 49900 + 79900,
      savingsPaise: 20000,
    });
  });

  it("is all zeros for an empty look", () => {
    expect(lookTotals([])).toEqual({ available: 0, soldOut: 0, totalPaise: 0, compareTotalPaise: 0, savingsPaise: 0 });
  });
});
