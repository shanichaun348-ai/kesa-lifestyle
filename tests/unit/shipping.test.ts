import { describe, expect, it } from "vitest";

import { DemoShippingProvider } from "@/modules/shipping/demo-provider";
import { PINCODE_RE } from "@/modules/shipping/types";

const provider = new DemoShippingProvider();

describe("pincode validation", () => {
  it("accepts six digits not starting with zero", () => {
    expect(PINCODE_RE.test("400001")).toBe(true);
    expect(PINCODE_RE.test("040001")).toBe(false);
    expect(PINCODE_RE.test("40001")).toBe(false);
    expect(PINCODE_RE.test("4000011")).toBe(false);
  });
});

describe("demo shipping provider", () => {
  it("estimates a serviceable pincode with ETA and COD", async () => {
    const e = await provider.estimate("400001");
    expect(e.serviceable).toBe(true);
    expect(e.etaMinDays).toBeLessThanOrEqual(e.etaMaxDays);
    expect(e.codAvailable).toBe(true);
  });

  it("marks remote regions prepaid-only and bad input unserviceable", async () => {
    expect((await provider.estimate("790001")).codAvailable).toBe(false);
    const bad = await provider.estimate("abc");
    expect(bad.serviceable).toBe(false);
    expect(bad.message).toBeTruthy();
  });
});
