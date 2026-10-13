/**
 * Product slugs are capped at 120 characters because the storefront
 * refuses longer ones (a pasted description once produced an 889-character
 * slug whose product page could never open).
 */
import { describe, expect, it } from "vitest";

import { MAX_SLUG_LENGTH, slugify, slugProblem } from "@/modules/catalog/slug";

describe("slugify", () => {
  it("lowercases, hyphenates and trims", () => {
    expect(slugify("  Gold & Pearl Drop Earrings! ")).toBe("gold-and-pearl-drop-earrings");
  });

  it("cuts a long name at a word boundary within the limit", () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const slug = slugify(long);
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(long.replace(/ /g, "-").startsWith(slug)).toBe(true);
  });

  it("hard-cuts a single word that is too long", () => {
    expect(slugify("a".repeat(300)).length).toBe(MAX_SLUG_LENGTH);
  });
});

describe("slugProblem", () => {
  it("accepts a normal slug and explains each failure", () => {
    expect(slugProblem("gold-hoop-earrings")).toBeNull();
    expect(slugProblem("")).toMatch(/enter a url slug/i);
    expect(slugProblem("Gold Hoops")).toMatch(/lowercase/i);
    expect(slugProblem("x".repeat(MAX_SLUG_LENGTH + 1))).toMatch(/121 characters/);
  });
});
