import "server-only";

import { ANNOUNCEMENT_KEY, announcementSchema, DEFAULT_ANNOUNCEMENT, type Announcement } from "./announcement";
import { readSiteContent, writeSiteContent, type SiteContentError } from "./site-content";

/** The saved offer strip, or the default with the reason it is in use. */
export async function getAnnouncement(): Promise<{ value: Announcement; error: SiteContentError | null }> {
  return readSiteContent(ANNOUNCEMENT_KEY, announcementSchema, DEFAULT_ANNOUNCEMENT);
}

export async function saveAnnouncement(value: Announcement): Promise<{ ok: true } | { ok: false; error: SiteContentError }> {
  return writeSiteContent(ANNOUNCEMENT_KEY, announcementSchema.parse(value));
}

/** The coupon code to suggest at checkout, when the strip is on and carries one. */
export async function suggestedCouponCode(): Promise<string | undefined> {
  const { value } = await getAnnouncement();
  return value.enabled && value.code ? value.code : undefined;
}
