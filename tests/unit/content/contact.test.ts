/**
 * The Contact us page settings the admin edits: blank fields mean "not
 * shown", the WhatsApp number is stored as digits, and bad values are refused.
 */
import { describe, expect, it } from "vitest";

import { contactSchema, DEFAULT_CONTACT, telHref, whatsappDigits } from "@/modules/content/contact";

describe("contactSchema", () => {
  it("treats blank fields as not set", () => {
    const parsed = contactSchema.parse({ intro: "", phone: "  ", whatsapp: "", email: "", address: "", hours: "", mapUrl: "" });
    expect(parsed).toEqual({});
  });

  it("stores the WhatsApp number as digits only", () => {
    expect(contactSchema.parse({ whatsapp: "+91 94090 17177" }).whatsapp).toBe("919409017177");
  });

  it("lower-cases the email and keeps address line breaks", () => {
    const parsed = contactSchema.parse({ email: " Hello@Kesa.IN ", address: "Shop 4\nMG Road\nRajkot" });
    expect(parsed.email).toBe("hello@kesa.in");
    expect(parsed.address).toBe("Shop 4\nMG Road\nRajkot");
  });

  it("refuses bad values", () => {
    expect(contactSchema.safeParse({ phone: "call me" }).success).toBe(false);
    expect(contactSchema.safeParse({ whatsapp: "12345" }).success).toBe(false);
    expect(contactSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(contactSchema.safeParse({ mapUrl: "http://maps.example.com/x" }).success).toBe(false);
    expect(contactSchema.safeParse({ mapUrl: "https://maps.google.com/?q=rajkot" }).success).toBe(true);
  });
});

describe("contact helpers", () => {
  it("starts from the support details already on the legal pages", () => {
    expect(DEFAULT_CONTACT.phone).toBeDefined();
    expect(DEFAULT_CONTACT.whatsapp).toMatch(/^\d{10,15}$/);
    expect(DEFAULT_CONTACT.email).toContain("@");
  });

  it("builds tel links and picks the saved WhatsApp number over the built-in one", () => {
    expect(telHref("+91 94090 17177")).toBe("tel:+919409017177");
    expect(whatsappDigits({ whatsapp: "911111111111" }, "919409017177")).toBe("911111111111");
    expect(whatsappDigits({}, "919409017177")).toBe("919409017177");
  });
});
