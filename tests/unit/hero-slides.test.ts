/**
 * Hero slides: each needs both artwork files on disk, including the 4:5
 * phone version, so the carousel box is uniform on phones.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HERO_SLIDES } from "@/lib/hero-slides";

const PUBLIC = join(process.cwd(), "public");

describe("HERO_SLIDES", () => {
  it("ships a desktop and a phone file for every slide", () => {
    expect(HERO_SLIDES.length).toBeGreaterThan(0);
    for (const slide of HERO_SLIDES) {
      expect(slide.mobileSrc, `${slide.src} has no phone version`).toBeDefined();
      expect(existsSync(join(PUBLIC, slide.src)), `${slide.src} missing`).toBe(true);
      expect(existsSync(join(PUBLIC, slide.mobileSrc!)), `${slide.mobileSrc} missing`).toBe(true);
      expect(slide.href).toMatch(/^\/.*\/$/);
      expect(slide.alt.length).toBeGreaterThan(20);
    }
  });
});
