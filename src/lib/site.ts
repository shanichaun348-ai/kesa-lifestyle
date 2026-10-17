/**
 * Site-wide constants. Only facts that are true today belong here; anything
 * pending an owner decision (D1 domain, D2 tagline, D7 policies) is marked.
 */
export const site = {
  name: "Kesa Lifestyle",
  /** Positioning line proposed in docs/07 §2; owner decision D2 pending. */
  tagline: "Jewellery That Completes Your Look",
  description:
    "Premium fashion jewellery for modern Indian wardrobes. Earrings, necklaces, rings, bracelets and chains for women and men.",
  /** Falls back to localhost until the domain (D1) is set in the environment. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
} as const;

/**
 * Legal disclosures required by the Consumer Protection (E-Commerce) Rules, 2020.
 * Fill in the bracketed values before launch — they render verbatim on /grievance-officer/.
 */
export const legal = {
  entityName: "[Registered business name]",
  registeredAddress: "[Registered office address, city, state, PIN]",
  supportEmail: "hello@kesalifestyle.com",
  supportPhone: "+91 94090 17177",
  supportHours: "Monday to Saturday, 10:00 am to 6:00 pm IST",
  grievanceOfficer: {
    name: "[Grievance officer full name]",
    designation: "Grievance Officer",
    email: "hello@kesalifestyle.com",
    phone: "+91 94090 17177",
  },
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/** The business WhatsApp number in international digits-only form for wa.me links. */
export const WHATSAPP_NUMBER = legal.supportPhone.replace(/\D/g, "");

/** A wa.me link that opens a chat with the store, with the message pre-filled. */
export function whatsappHref(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
