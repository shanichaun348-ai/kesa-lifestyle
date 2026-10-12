import { describe, expect, it } from "vitest";

import { contactMatches, maskEmail, normalisePhone, parseOrderReference } from "@/modules/orders/track-match";

const order = { customerEmail: "Priya.Sharma@Gmail.com", customerPhone: "+91 98765 43210", shippingPhone: "09123456789" };

describe("parseOrderReference", () => {
  it("accepts the public forms of an order number", () => {
    expect(parseOrderReference("KL-1024")).toBe(1024);
    expect(parseOrderReference("kl1024")).toBe(1024);
    expect(parseOrderReference(" 1024 ")).toBe(1024);
  });

  it("rejects anything that is not a positive number", () => {
    expect(parseOrderReference("KL-")).toBeNull();
    expect(parseOrderReference("0")).toBeNull();
    expect(parseOrderReference("ord_abc")).toBeNull();
    expect(parseOrderReference("1024; drop")).toBeNull();
  });
});

describe("contactMatches", () => {
  it("matches the email case-insensitively", () => {
    expect(contactMatches(order, "priya.sharma@gmail.com")).toBe(true);
    expect(contactMatches(order, "  PRIYA.SHARMA@GMAIL.COM ")).toBe(true);
    expect(contactMatches(order, "priya@gmail.com")).toBe(false);
  });

  it("matches the phone on digits only, ignoring +91 / 0 prefixes and spacing", () => {
    expect(contactMatches(order, "9876543210")).toBe(true);
    expect(contactMatches(order, "+91-98765-43210")).toBe(true);
    expect(contactMatches(order, "09876543210")).toBe(true);
    expect(contactMatches(order, "9876543211")).toBe(false);
  });

  it("also accepts the delivery phone", () => {
    expect(contactMatches(order, "9123456789")).toBe(true);
  });

  it("never matches on partial or empty input", () => {
    expect(contactMatches(order, "")).toBe(false);
    expect(contactMatches(order, "43210")).toBe(false);
    expect(contactMatches({ ...order, shippingPhone: null }, "9123456789")).toBe(false);
  });
});

describe("normalisePhone / maskEmail", () => {
  it("keeps the last ten digits", () => {
    expect(normalisePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalisePhone("98765")).toBe("98765");
  });

  it("masks the local part but keeps the domain", () => {
    expect(maskEmail("priya.sharma@gmail.com")).toBe("p•••••a@gmail.com");
    expect(maskEmail("ab@x.in")).toBe("a•@x.in");
    expect(maskEmail("nodomain")).toBe("•••");
  });
});
