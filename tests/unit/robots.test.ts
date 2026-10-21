import { describe, expect, it } from "vitest";

import { isIndexableSite } from "@/app/robots";

describe("isIndexableSite", () => {
  it("allows the live store on our own server", () => {
    expect(isIndexableSite({ NEXT_PUBLIC_SITE_URL: "https://kesalifestyle.com" })).toBe(true);
    expect(isIndexableSite({ NEXT_PUBLIC_SITE_URL: "https://www.kesalifestyle.com" })).toBe(true);
  });

  it("blocks staging, preview and local hosts", () => {
    for (const url of ["https://kesa-lifestyle.dev-build.in", "https://kesa-lifestyle.vercel.app", "http://localhost:3000", "http://127.0.0.1:3100"]) {
      expect(isIndexableSite({ NEXT_PUBLIC_SITE_URL: url }), url).toBe(false);
    }
  });

  it("follows VERCEL_ENV when present", () => {
    expect(isIndexableSite({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://kesalifestyle.com" })).toBe(true);
    expect(isIndexableSite({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: "https://kesalifestyle.com" })).toBe(false);
  });

  it("blocks when the site URL is missing or malformed, or when forced off", () => {
    expect(isIndexableSite({})).toBe(false);
    expect(isIndexableSite({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBe(false);
    expect(isIndexableSite({ ROBOTS_DISALLOW_ALL: "1", NEXT_PUBLIC_SITE_URL: "https://kesalifestyle.com" })).toBe(false);
  });
});
