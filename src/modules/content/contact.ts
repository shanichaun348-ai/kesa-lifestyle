/**
 * The Contact us page: how customers reach the shop. Pure definitions shared
 * by the storefront, the admin editor and the tests; the database access
 * lives in `contact-server.ts` (site_content key below). Every field is
 * optional: a blank one is simply not shown on the page.
 */
import { z } from "zod";

import { legal } from "@/lib/site";

export const CONTACT_KEY = "site.contact";

/** Digits, spaces, brackets, dashes and a leading +, e.g. "+91 94090 17177". */
const PHONE = /^\+?[\d\s()-]{6,24}$/;

/** A blank form field means "not set". */
const blankToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

export const contactSchema = z.object({
  /** A friendly line under the page title. */
  intro: optional(z.string().trim().max(400, "Keep the introduction under 400 characters.")),
  /** Shown as a tap-to-call number. */
  phone: optional(z.string().trim().regex(PHONE, "Enter a phone number, e.g. +91 94090 17177.")),
  /** The WhatsApp number, with country code. Stored as digits only, used for wa.me links. */
  whatsapp: optional(
    z
      .string()
      .trim()
      .regex(PHONE, "Enter the WhatsApp number with country code, e.g. +91 94090 17177.")
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,15}$/, "A WhatsApp number has 10 to 15 digits including the country code.")),
  ),
  email: optional(z.string().trim().toLowerCase().max(120).pipe(z.email("Enter a valid email address."))),
  /** Postal or shop address; line breaks are kept. */
  address: optional(z.string().trim().max(300, "Keep the address under 300 characters.")),
  /** e.g. "Monday to Saturday, 10:00 am to 6:00 pm IST". */
  hours: optional(z.string().trim().max(120, "Keep the opening hours under 120 characters.")),
  /** A Google Maps (or similar) link for a "Get directions" button. */
  mapUrl: optional(z.string().trim().max(500).pipe(z.url("Enter a full link, e.g. https://maps.google.com/...")).refine((u) => u.startsWith("https://"), "The map link must start with https://")),
});

export type ContactDetails = z.infer<typeof contactSchema>;

/** What shows until the owner saves their own: the support details already on the legal pages. */
export const DEFAULT_CONTACT: ContactDetails = contactSchema.parse({
  intro: "Questions about an order, sizing, gifting or a piece you love? We reply quickly. Reach us whichever way suits you.",
  phone: legal.supportPhone,
  whatsapp: legal.supportPhone,
  email: legal.supportEmail,
  hours: legal.supportHours,
});

/** The digits to use for wa.me links: the owner's WhatsApp number, else the built-in one. */
export function whatsappDigits(contact: ContactDetails, fallback: string): string {
  return contact.whatsapp ?? fallback;
}

/** `tel:` link for a display number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
