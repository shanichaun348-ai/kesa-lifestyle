import { describe, expect, it } from "vitest";

import { warrantyLabel, warrantyMonths, withWarrantyTag } from "@/modules/catalog/warranty";
import { shopperTags } from "@/modules/content/home-placements";

describe("warranty", () => {
  it("reads only the allowed durations", () => {
    expect(warrantyMonths(["gold", "warranty:6"])).toBe(6);
    expect(warrantyMonths(["warranty:5"])).toBeUndefined();
    expect(warrantyMonths([])).toBeUndefined();
  });

  it("replaces or removes the tag and keeps the others", () => {
    expect(withWarrantyTag(["gold", "warranty:3"], 12)).toEqual(["gold", "warranty:12"]);
    expect(withWarrantyTag(["gold", "warranty:3"], undefined)).toEqual(["gold"]);
  });

  it("is hidden from shoppers' tags and labelled for display", () => {
    expect(shopperTags(["gold", "warranty:9"])).toEqual(["gold"]);
    expect(warrantyLabel(9)).toBe("9-month warranty");
  });
});
