import "server-only";

import { CONTACT_KEY, contactSchema, DEFAULT_CONTACT, type ContactDetails } from "./contact";
import { readSiteContent, writeSiteContent, type SiteContentError } from "./site-content";

/** The saved contact details, or the defaults with the reason they are in use. */
export async function getContact(): Promise<{ value: ContactDetails; error: SiteContentError | null }> {
  return readSiteContent(CONTACT_KEY, contactSchema, DEFAULT_CONTACT);
}

export async function saveContact(value: ContactDetails): Promise<{ ok: true } | { ok: false; error: SiteContentError }> {
  return writeSiteContent(CONTACT_KEY, contactSchema.parse(value));
}
