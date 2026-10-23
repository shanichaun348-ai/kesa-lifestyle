import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pixelCommerceParams, pixelConsent, pixelTrack } from "@/modules/analytics/pixel";

const ORIGINAL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const g = globalThis as { window?: unknown };

describe("pixelCommerceParams", () => {
  it("builds Meta's content shape with SKUs, quantities and INR totals", () => {
    expect(
      pixelCommerceParams(
        [
          { id: "KL-PEARL-01", quantity: 2, itemPrice: 1299 },
          { id: "KL-RING-07", quantity: 1, itemPrice: 899.5 },
        ],
        3497.5,
      ),
    ).toEqual({
      content_type: "product",
      content_ids: ["KL-PEARL-01", "KL-RING-07"],
      contents: [
        { id: "KL-PEARL-01", quantity: 2, item_price: 1299 },
        { id: "KL-RING-07", quantity: 1, item_price: 899.5 },
      ],
      num_items: 3,
      value: 3497.5,
      currency: "INR",
    });
  });

  it("rounds the value to paise precision", () => {
    expect(pixelCommerceParams([], 10.004).value).toBe(10);
  });
});

describe("pixelTrack / pixelConsent", () => {
  const fbq = vi.fn();

  beforeEach(() => {
    fbq.mockReset();
    g.window = { fbq };
  });
  afterEach(() => {
    delete g.window;
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = ORIGINAL;
  });

  it("does nothing when no pixel id is configured", () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    pixelTrack("PageView");
    pixelConsent(true);
    expect(fbq).not.toHaveBeenCalled();
  });

  it("forwards events, with eventID only when given", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789012345";
    pixelTrack("PageView");
    pixelTrack("Purchase", { value: 10, currency: "INR" }, "KL-1042");
    expect(fbq).toHaveBeenNthCalledWith(1, "track", "PageView", {});
    expect(fbq).toHaveBeenNthCalledWith(2, "track", "Purchase", { value: 10, currency: "INR" }, { eventID: "KL-1042" });
  });

  it("maps consent to grant / revoke", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789012345";
    pixelConsent(true);
    pixelConsent(false);
    expect(fbq).toHaveBeenNthCalledWith(1, "consent", "grant");
    expect(fbq).toHaveBeenNthCalledWith(2, "consent", "revoke");
  });

  it("survives a page where the script has not loaded", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789012345";
    g.window = {};
    expect(() => pixelTrack("ViewContent")).not.toThrow();
  });
});
