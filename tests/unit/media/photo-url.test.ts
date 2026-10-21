import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isStoragePhotoUrl } from "@/modules/media/photo-url";

const ORIGINAL = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe("isStoragePhotoUrl", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcproject.supabase.co";
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL;
  });

  it("accepts a public object in the named bucket on this project", () => {
    expect(isStoragePhotoUrl("https://abcproject.supabase.co/storage/v1/object/public/review-photos/pearl-drops/1.jpg", "review-photos")).toBe(true);
  });

  it("rejects other buckets, hosts, schemes and script links", () => {
    const cases = [
      "https://abcproject.supabase.co/storage/v1/object/public/product-images/x.jpg",
      "https://otherproject.supabase.co/storage/v1/object/public/review-photos/x.jpg",
      "https://evil.example/storage/v1/object/public/review-photos/x.jpg",
      "http://abcproject.supabase.co/storage/v1/object/public/review-photos/x.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "https://abcproject.supabase.co/storage/v1/object/sign/review-photos/x.jpg",
      "https://abcproject.supabase.co/storage/v1/object/public/review-photos/",
      "https://abcproject.supabase.co/storage/v1/object/public/review-photos/../product-images/x.jpg",
      "https://user:pw@abcproject.supabase.co/storage/v1/object/public/review-photos/x.jpg",
      "not a url",
    ];
    for (const src of cases) expect(isStoragePhotoUrl(src, "review-photos"), src).toBe(false);
  });

  it("falls back to any supabase.co host when the project URL is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isStoragePhotoUrl("https://anything.supabase.co/storage/v1/object/public/return-photos/a/b.webp", "return-photos")).toBe(true);
    expect(isStoragePhotoUrl("https://supabase.co.evil.example/storage/v1/object/public/return-photos/a.webp", "return-photos")).toBe(false);
  });
});
