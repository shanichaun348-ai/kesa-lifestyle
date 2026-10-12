/**
 * readPlacements — the "Where this product shows" fields of the product
 * forms: extra categories must be real and match the gender; homepage rail
 * pins come through as flags.
 */
import { describe, expect, it } from "vitest";

import { readPlacements, type CategoryOption } from "../../../src/app/(admin)/admin/products/_category-options";

const categories: CategoryOption[] = [
  { path: "women/necklaces", label: "Women › Necklaces", gender: "women" },
  { path: "women/pendants", label: "Women › Pendants", gender: "women" },
  { path: "women/mangalsutras", label: "Women › Mangalsutras", gender: "women" },
  { path: "men/chains", label: "Men › Chains", gender: "men" },
];
const primary = categories[0]!;

function form(paths: string[], rails: string[] = []): FormData {
  const fd = new FormData();
  for (const p of paths) fd.append("categoryPaths", p);
  for (const r of rails) fd.append("homeRail", r);
  return fd;
}

describe("readPlacements", () => {
  it("keeps the main category first and adds the ticked ones once each", () => {
    const result = readPlacements(form(["women/pendants", "women/necklaces", "women/pendants", "women/mangalsutras"], ["bestsellers"]), categories, primary, "women");
    expect(result).toEqual({
      categoryPaths: ["women/necklaces", "women/pendants", "women/mangalsutras"],
      rails: { newArrivals: false, bestsellers: true },
    });
  });

  it("refuses unknown categories and ones for another gender, and ignores unknown rails", () => {
    expect(readPlacements(form(["women/rings"]), categories, primary, "women")).toEqual({ error: expect.stringContaining("women/rings") });
    expect(readPlacements(form(["men/chains"]), categories, primary, "women")).toEqual({ error: expect.stringMatching(/not a women's category/) });
    expect(readPlacements(form(["men/chains"], ["sidebar"]), categories, primary, "unisex")).toEqual({
      categoryPaths: ["women/necklaces", "men/chains"],
      rails: { newArrivals: false, bestsellers: false },
    });
  });
});
