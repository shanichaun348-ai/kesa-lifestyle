/**
 * The homepage films: every clip and poster the page references must ship
 * in /public, link somewhere on this site and describe itself for screen
 * readers.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { homeReel } from "@/lib/home-reel";

const PUBLIC = join(process.cwd(), "public");

describe("homeReel", () => {
  it("has six films whose video and poster files exist", () => {
    expect(homeReel).toHaveLength(6);
    for (const item of homeReel) {
      expect(item.src, item.id).toMatch(/^\/videos\/(?:home|hero)\/[a-z0-9-]+\.mp4$/);
      expect(item.poster, item.id).toMatch(/^\/videos\/(?:home|hero)\/[a-z0-9-]+\.jpg$/);
      expect(existsSync(join(PUBLIC, item.src)), `${item.src} missing`).toBe(true);
      expect(existsSync(join(PUBLIC, item.poster)), `${item.poster} missing`).toBe(true);
    }
  });

  it("links within the site and is described", () => {
    const ids = new Set(homeReel.map((i) => i.id));
    expect(ids.size).toBe(homeReel.length);
    for (const item of homeReel) {
      expect(item.href).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/);
      expect(item.title.length).toBeGreaterThan(5);
      expect(item.caption.length).toBeGreaterThan(20);
      expect(item.cta).toMatch(/^Shop /);
    }
  });
});
