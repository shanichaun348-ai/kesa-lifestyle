import { describe, expect, it } from "vitest";

import { allowedKindsFor, returnEligibility } from "@/modules/returns/eligibility";

const now = new Date("2026-10-13T10:00:00.000Z");
const delivered = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

const order = (over: Partial<Parameters<typeof returnEligibility>[0]> = {}) => ({
  delivered: true,
  deliveredAt: delivered(2),
  updatedAt: delivered(2),
  items: [
    { sku: "NCK-1", productName: "Necklace", quantity: 1 },
    { sku: "EAR-1", productName: "Earrings", quantity: 2 },
    { sku: "SALE-1", productName: "Clearance ring", quantity: 1 },
  ],
  ...over,
});

const policies = new Map([
  ["NCK-1", "returnable" as const],
  ["EAR-1", "exchange_only" as const],
  ["SALE-1", "final_sale" as const],
]);

describe("returnEligibility", () => {
  it("allows a delivered order inside the window and applies per-item policy", () => {
    const e = returnEligibility(order(), policies, false, now);
    expect(e.eligible).toBe(true);
    expect(e.items.find((i) => i.sku === "NCK-1")?.allowedKinds).toEqual(["return", "exchange"]);
    expect(e.items.find((i) => i.sku === "EAR-1")?.allowedKinds).toEqual(["exchange"]);
    expect(e.items.find((i) => i.sku === "SALE-1")).toMatchObject({ eligible: false, allowedKinds: [] });
  });

  it("blocks orders that are not delivered", () => {
    const e = returnEligibility(order({ delivered: false, deliveredAt: null }), policies, false, now);
    expect(e.eligible).toBe(false);
    expect(e.reason).toMatch(/delivered/);
    expect(e.items.every((i) => !i.eligible)).toBe(true);
  });

  it("blocks after the 7-day window and names the closing date", () => {
    const e = returnEligibility(order({ deliveredAt: delivered(8) }), policies, false, now);
    expect(e.eligible).toBe(false);
    expect(e.reason).toMatch(/window closed/);
  });

  it("still allows on the last day of the window", () => {
    const e = returnEligibility(order({ deliveredAt: delivered(6.9) }), policies, false, now);
    expect(e.eligible).toBe(true);
  });

  it("falls back to updatedAt when deliveredAt is missing", () => {
    const e = returnEligibility(order({ deliveredAt: null, updatedAt: delivered(9) }), policies, false, now);
    expect(e.eligible).toBe(false);
  });

  it("blocks when a request is already open", () => {
    const e = returnEligibility(order(), policies, true, now);
    expect(e.reason).toMatch(/already open/);
  });

  it("blocks when every item is final sale", () => {
    const e = returnEligibility(order({ items: [{ sku: "SALE-1", productName: "Clearance ring", quantity: 1 }] }), policies, false, now);
    expect(e.eligible).toBe(false);
    expect(e.reason).toMatch(/final sale/);
  });

  it("treats unknown SKUs as returnable", () => {
    const e = returnEligibility(order({ items: [{ sku: "NEW-1", productName: "New", quantity: 1 }] }), new Map(), false, now);
    expect(e.items[0]?.allowedKinds).toEqual(["return", "exchange"]);
  });
});

describe("allowedKindsFor", () => {
  const items = returnEligibility(order(), policies, false, now).items;
  it("intersects the kinds of the picked items", () => {
    expect(allowedKindsFor(items, ["NCK-1"])).toEqual(["return", "exchange"]);
    expect(allowedKindsFor(items, ["NCK-1", "EAR-1"])).toEqual(["exchange"]);
    expect(allowedKindsFor(items, ["SALE-1"])).toEqual([]);
    expect(allowedKindsFor(items, [])).toEqual([]);
  });
});
