import { describe, expect, it } from "vitest";

import { announcementId, announcementSchema, DEFAULT_ANNOUNCEMENT } from "@/modules/content/announcement";
import { parseCouponForm } from "@/modules/coupons/form";

describe("announcementSchema", () => {
  it("upper-cases the code and drops blanks", () => {
    const a = announcementSchema.parse({ message: "Extra ₹100 off", code: "first100", href: "", linkLabel: "" });
    expect(a).toMatchObject({ enabled: true, message: "Extra ₹100 off", code: "FIRST100" });
    expect(a.href).toBeUndefined();
    expect(a.linkLabel).toBeUndefined();
  });

  it("rejects off-site links and bad codes", () => {
    expect(announcementSchema.safeParse({ message: "x", href: "https://evil.example/" }).success).toBe(false);
    expect(announcementSchema.safeParse({ message: "x", code: "bad code!" }).success).toBe(false);
    expect(announcementSchema.safeParse({ message: "x", href: "/collections/new-arrivals/" }).success).toBe(true);
  });

  it("changes the dismissal id when the content changes", () => {
    const base = announcementId(DEFAULT_ANNOUNCEMENT);
    expect(announcementId({ ...DEFAULT_ANNOUNCEMENT })).toBe(base);
    expect(announcementId({ ...DEFAULT_ANNOUNCEMENT, code: "FIRST100" })).not.toBe(base);
  });
});

describe("parseCouponForm", () => {
  it("converts rupees to paise and normalises the code", () => {
    const r = parseCouponForm({ code: " first100 ", type: "fixed", value: "100", minOrderRupees: "999", usageLimit: "", perCustomerLimit: "1", firstOrderOnly: "on", active: "on" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toMatchObject({ code: "FIRST100", type: "fixed", value: 10000, minOrderPaise: 99900, usageLimit: null, perCustomerLimit: 1, firstOrderOnly: true, active: true, maxDiscountPaise: null });
    }
  });

  it("rejects invalid percentages and reversed date windows", () => {
    expect(parseCouponForm({ code: "TEN", type: "percent", value: "150" }).ok).toBe(false);
    const r = parseCouponForm({ code: "TEN", type: "percent", value: "10", startsAt: "2026-10-20T10:00", endsAt: "2026-10-19T10:00" });
    expect(r.ok).toBe(false);
  });
});
