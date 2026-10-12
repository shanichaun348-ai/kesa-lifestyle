import { describe, expect, it } from "vitest";

import { COD_FEE_PAISE, COD_FEE_WAIVER_PAISE, COD_MAX_TOTAL_PAISE, codAvailability, isPaymentMethod } from "@/modules/checkout/cod";

describe("codAvailability", () => {
  it("charges the fee below the waiver threshold", () => {
    expect(codAvailability(29900)).toEqual({ allowed: true, feePaise: COD_FEE_PAISE });
    expect(codAvailability(COD_FEE_WAIVER_PAISE - 1)).toEqual({ allowed: true, feePaise: COD_FEE_PAISE });
  });

  it("waives the fee from the threshold up to the cap", () => {
    expect(codAvailability(COD_FEE_WAIVER_PAISE)).toEqual({ allowed: true, feePaise: 0 });
    expect(codAvailability(COD_MAX_TOTAL_PAISE)).toEqual({ allowed: true, feePaise: 0 });
  });

  it("refuses orders above the cap with a reason", () => {
    const result = codAvailability(COD_MAX_TOTAL_PAISE + 1);
    expect(result.allowed).toBe(false);
    expect(result.feePaise).toBe(0);
    if (!result.allowed) expect(result.reason).toMatch(/up to/);
  });

  it("refuses empty or malformed values", () => {
    expect(codAvailability(0).allowed).toBe(false);
    expect(codAvailability(-100).allowed).toBe(false);
    expect(codAvailability(12.5).allowed).toBe(false);
    expect(codAvailability(Number.NaN).allowed).toBe(false);
  });
});

describe("isPaymentMethod", () => {
  it("accepts only the two known methods", () => {
    expect(isPaymentMethod("razorpay")).toBe(true);
    expect(isPaymentMethod("cod")).toBe(true);
    expect(isPaymentMethod("COD")).toBe(false);
    expect(isPaymentMethod(undefined)).toBe(false);
    expect(isPaymentMethod(1)).toBe(false);
  });
});
