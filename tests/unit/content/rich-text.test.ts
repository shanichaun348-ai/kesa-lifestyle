/**
 * The formatting owners type into product copy: **bold**, "- " bullets and
 * one paragraph per line. Anything else stays as typed, and nothing is
 * ever interpreted as HTML.
 */
import { describe, expect, it } from "vitest";

import { hasRichMarks, parseInline, parseRichText, plainText } from "@/modules/content/rich-text";

const SAMPLE = [
  "**Elegant Gold Look Crystal Pendant Necklace for Women**",
  "Add a touch of elegance to your everyday style. ✨",
  "",
  "**Product Highlights**",
  "- Elegant golden-tone finish",
  "- Beautiful three-stone crystal-style pendant",
  "**Style:** Modern, Elegant & Trendy",
].join("\n");

describe("parseInline", () => {
  it("turns **text** into bold runs and leaves the rest alone", () => {
    expect(parseInline("**Style:** Modern & Trendy")).toEqual([
      { text: "Style:", bold: true },
      { text: " Modern & Trendy", bold: false },
    ]);
    expect(parseInline("plain")).toEqual([{ text: "plain", bold: false }]);
    expect(parseInline("odd ** marks")).toEqual([{ text: "odd ** marks", bold: false }]);
  });

  it("never treats the text as HTML", () => {
    expect(parseInline("<b>x</b> & **y**")).toEqual([
      { text: "<b>x</b> & ", bold: false },
      { text: "y", bold: true },
    ]);
  });
});

describe("parseRichText", () => {
  it("makes a paragraph per line, groups bullet lines into one list and skips blanks", () => {
    const blocks = parseRichText(SAMPLE);
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph", "paragraph", "list", "paragraph"]);
    const list = blocks[3];
    if (list?.kind !== "list") throw new Error("expected a list");
    expect(list.items.map((i) => i.map((r) => r.text).join(""))).toEqual([
      "Elegant golden-tone finish",
      "Beautiful three-stone crystal-style pendant",
    ]);
  });

  it("accepts *, • and numbered bullets", () => {
    const blocks = parseRichText("* one\n• two\n1. three\n2) four");
    expect(blocks).toHaveLength(1);
    const only = blocks[0];
    if (only?.kind !== "list") throw new Error("expected a list");
    expect(only.items).toHaveLength(4);
  });
});

describe("plainText", () => {
  it("drops the marks and joins the lines for meta descriptions", () => {
    expect(plainText("**Style:** Modern\n- one\n- two")).toBe("Style: Modern one two");
    expect(plainText("  plain  text ")).toBe("plain text");
  });
});

describe("hasRichMarks", () => {
  it("spots bold or bullets", () => {
    expect(hasRichMarks("nothing here")).toBe(false);
    expect(hasRichMarks("**bold**")).toBe(true);
    expect(hasRichMarks("line\n- bullet")).toBe(true);
  });
});
