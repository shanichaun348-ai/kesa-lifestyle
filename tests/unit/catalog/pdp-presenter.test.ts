import { describe, expect, it } from "vitest";

import { benefitLines, discountPercent, highlightIcons, pdpBadges, splitLabel, totalStock } from "@/modules/catalog/pdp";
import type { Product } from "@/modules/catalog/types";

const NOW = new Date("2026-10-13T00:00:00.000Z");

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
    variants: [{ sku: "T-1", pricePaise: 99900, stock: 10 }],
    images: [],
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

describe("pdpBadges", () => {
  it("shows New for a recent publish", () => {
    const p = product({ publishedAt: "2026-10-10T00:00:00.000Z" });
    expect(pdpBadges(p, NOW).map((b) => b.label)).toContain("New");
  });

  it("shows Bestseller and Only N left together", () => {
    const p = product({ sales30d: 500, variants: [{ sku: "T-1", pricePaise: 99900, stock: 2 }] });
    expect(pdpBadges(p, NOW).map((b) => b.label)).toEqual(["Bestseller", "Only 2 left"]);
  });

  it("sums stock across variants before judging low stock", () => {
    const p = product({ variants: [{ sku: "A", pricePaise: 1, stock: 2 }, { sku: "B", pricePaise: 1, stock: 2 }] });
    expect(totalStock(p)).toBe(4);
    expect(pdpBadges(p, NOW).some((b) => b.label.startsWith("Only"))).toBe(false);
  });

  it("shows only Sold out when nothing is in stock, even if new", () => {
    const p = product({ publishedAt: "2026-10-12T00:00:00.000Z", sales30d: 999, variants: [{ sku: "T-1", pricePaise: 99900, stock: 0 }] });
    expect(pdpBadges(p, NOW)).toEqual([{ label: "Sold out", tone: "danger" }]);
  });

  it("shows nothing for an ordinary in-stock product", () => {
    expect(pdpBadges(product(), NOW)).toEqual([]);
  });
});

describe("discountPercent", () => {
  it("is null without a compare-at price or when it is not higher", () => {
    expect(discountPercent(99900, undefined)).toBeNull();
    expect(discountPercent(99900, 99900)).toBeNull();
    expect(discountPercent(99900, 50000)).toBeNull();
  });

  it("rounds the saving", () => {
    expect(discountPercent(79900, 99900)).toBe(20);
    expect(discountPercent(66600, 99900)).toBe(33);
  });
});

describe("benefitLines", () => {
  it("adapts the returns line to the policy", () => {
    expect(benefitLines("returnable")[2]).toEqual({ key: "returns", title: "Easy returns", detail: "7-day policy" });
    expect(benefitLines("exchange_only")[2]!.title).toBe("Exchange only");
    expect(benefitLines("final_sale")[2]!.title).toBe("Final sale");
  });

  it("always lists shipping, payment and returns in that order", () => {
    expect(benefitLines("returnable").map((b) => b.key)).toEqual(["shipping", "payment", "returns"]);
  });
});

describe("splitLabel", () => {
  it("splits at the word nearest the midpoint", () => {
    expect(splitLabel("Premium Gold Plated")).toEqual(["Premium", "Gold Plated"]);
    expect(splitLabel("Lightweight & Comfortable")).toEqual(["Lightweight", "& Comfortable"]);
    expect(splitLabel("Perfect for Gifting")).toEqual(["Perfect", "for Gifting"]);
  });

  it("keeps a single word on one line", () => {
    expect(splitLabel("Handcrafted")).toEqual(["Handcrafted", ""]);
  });
});

describe("highlightIcons", () => {
  it("picks icons from keywords and falls back to a star", () => {
    const icons = highlightIcons([
      "Premium gold plated",
      "Vibrant multicolor charms",
      "Lightweight & comfortable",
      "Perfect for gifting",
      "Anti-tarnish finish",
      "Skin friendly, nickel-free",
      "Handcrafted in Jaipur",
      "Comes in a box",
    ], 8);
    expect(icons.map((i) => i.icon)).toEqual(["gem", "sparkles", "feather", "gift", "shield", "leaf", "hand", "star"]);
  });

  it("caps at four by default and ignores blank lines", () => {
    const icons = highlightIcons(["a b", " ", "c d", "e f", "g h", "i j"]);
    expect(icons).toHaveLength(4);
    expect(icons[0]!.lines).toEqual(["a", "b"]);
  });
});
