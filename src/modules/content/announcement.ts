/**
 * The offer strip at the top of every storefront page. Pure definitions
 * shared by the storefront, the admin editor and the tests; the database
 * access lives in `announcement-server.ts` (site_content key below).
 */
import { z } from "zod";

export const ANNOUNCEMENT_KEY = "site.announcement";

const SITE_PATH = /^\/(?:[a-z0-9-]+\/)*(?:\?[^\s#]*)?$/;
const CODE = /^[A-Z0-9_-]{2,20}$/;

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const announcementSchema = z.object({
  enabled: z.boolean().default(true),
  message: z.string().trim().min(1, "Enter the message.").max(140, "Keep the message under 140 characters."),
  /** Coupon code shown as a copyable chip, e.g. FIRST100. */
  code: z.string().trim().toUpperCase().regex(CODE, "Codes are 2–20 letters, numbers, hyphens or underscores.").optional().or(z.literal("").transform(() => undefined)),
  /** Same-site link, e.g. /collections/new-arrivals/ */
  href: optionalText(200).pipe(z.string().regex(SITE_PATH, "Enter a link on this site, starting and ending with /.").optional()),
  linkLabel: optionalText(30),
});

export type Announcement = z.infer<typeof announcementSchema>;

export const DEFAULT_ANNOUNCEMENT: Announcement = announcementSchema.parse({
  enabled: true,
  message: "Free shipping across India on orders over ₹999.",
  href: "/collections/new-arrivals/",
  linkLabel: "Shop new in",
});

/**
 * Stable id for the dismissal cookie: changes whenever the content does, so
 * a new offer shows again to people who dismissed the previous one.
 */
export function announcementId(a: Announcement): string {
  const s = [a.message, a.code ?? "", a.href ?? "", a.linkLabel ?? ""].join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `site-${h.toString(36)}`;
}
