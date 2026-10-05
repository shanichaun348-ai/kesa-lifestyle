import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("accepts same-origin paths and rejects open redirects", () => {
    expect(safeNextPath("/account/orders/")).toBe("/account/orders/");
    expect(safeNextPath("/checkout/?retry=KL-1")).toBe("/checkout/?retry=KL-1");
    expect(safeNextPath("https://evil.example/")).toBe("/account/");
    expect(safeNextPath("//evil.example")).toBe("/account/");
    expect(safeNextPath("/\\evil.example")).toBe("/account/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/account/");
    expect(safeNextPath("/login/")).toBe("/account/");
    expect(safeNextPath(null, "/cart/")).toBe("/cart/");
  });
});
