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

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}
