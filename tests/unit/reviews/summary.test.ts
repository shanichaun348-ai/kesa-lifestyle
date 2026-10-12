import { describe, expect, it } from "vitest";

import { pickShowcase, ratingsBySlug, summarise, toReview, verifiedOrderId } from "@/modules/reviews/summary";

describe("summarise", () => {
  it("returns the empty summary when there are no ratings", () => {
    const s = summarise([], []);
    expect(s.count).toBe(0);
    expect(s.average).toBeNull();
    expect(s.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("averages to one decimal and counts the distribution", () => {
    const s = summarise([5, 4, 4, 3], []);
    expect(s.count).toBe(4);
    expect(s.average).toBe(4);
    expect(s.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 2, 5: 1 });
    expect(summarise([5, 4], []).average).toBe(4.5);
    expect(summarise([5, 5, 4], []).average).toBe(4.7);
  });

  it("ignores ratings outside 1–5", () => {
    const s = summarise([5, 0, 9, 3], []);
    expect(s.count).toBe(2);
    expect(s.average).toBe(4);
  });
});

describe("ratingsBySlug", () => {
  it("aggregates per product and omits products without ratings", () => {
    const map = ratingsBySlug([
      { product_slug: "a", rating: 5 },
      { product_slug: "a", rating: 4 },
      { product_slug: "b", rating: 3 },
    ]);
    expect(map.get("a")).toEqual({ value: 4.5, count: 2 });
    expect(map.get("b")).toEqual({ value: 3, count: 1 });
    expect(map.has("c")).toBe(false);
  });
});

describe("verifiedOrderId", () => {
  const paid = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
  const product = { id: "prod-1", skus: new Set(["KL-NCK-0001", "KL-NCK-0001-M"]) };

  it("matches a paid order by product id", () => {
    expect(verifiedOrderId({ paidStatuses: paid, product, orders: [{ id: "o1", status: "DELIVERED", items: [{ productId: "prod-1", sku: "X" }] }] })).toBe("o1");
  });

  it("matches a paid order by SKU", () => {
    expect(verifiedOrderId({ paidStatuses: paid, product, orders: [{ id: "o2", status: "PAID", items: [{ productId: "other", sku: "KL-NCK-0001-M" }] }] })).toBe("o2");
  });

  it("ignores unpaid, cancelled or unrelated orders", () => {
    expect(
      verifiedOrderId({
        paidStatuses: paid,
        product,
        orders: [
          { id: "o3", status: "CREATED", items: [{ productId: "prod-1", sku: "KL-NCK-0001" }] },
          { id: "o4", status: "CANCELLED", items: [{ productId: "prod-1", sku: "KL-NCK-0001" }] },
          { id: "o5", status: "PAID", items: [{ productId: "other", sku: "OTHER" }] },
        ],
      }),
    ).toBeNull();
  });
});

describe("toReview", () => {
  it("drops photos without a src and blanks a missing title", () => {
    const r = toReview({ id: "r1", rating: 4, title: null, body: "Lovely", customer_name: "Asha", created_at: "2026-10-01T00:00:00Z", verified_purchase: true, photos: [{ src: "", alt: "" }, { src: "https://x/y.jpg", alt: "" }] });
    expect(r.title).toBe("");
    expect(r.images).toEqual([{ src: "https://x/y.jpg", alt: "" }]);
    expect(r.verifiedPurchase).toBe(true);
  });
});

describe("pickShowcase", () => {
  it("prefers reviews with photos, then newest, capped", () => {
    const picked = pickShowcase(
      [
        { id: "a", createdAt: "2026-10-03", images: [] },
        { id: "b", createdAt: "2026-10-01", images: [{ src: "p", alt: "" }] },
        { id: "c", createdAt: "2026-10-02", images: [{ src: "p", alt: "" }] },
        { id: "d", createdAt: "2026-10-04" },
      ],
      3,
    );
    expect(picked.map((r) => r.id)).toEqual(["c", "b", "d"]);
  });
});
