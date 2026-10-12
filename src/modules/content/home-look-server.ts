import "server-only";

import { DEFAULT_HOME_LOOK, HOME_LOOK_KEY, homeLookSchema, MAX_LOOK_PRODUCTS, toggleLookSlug, type HomeLook } from "./home-look";
import { readSiteContent, writeSiteContent, type SiteContentError } from "./site-content";

/** The saved configuration, or the defaults with the reason they are in use. */
export async function getHomeLook(): Promise<{ config: HomeLook; error: SiteContentError | null }> {
  const { value, error } = await readSiteContent(HOME_LOOK_KEY, homeLookSchema, DEFAULT_HOME_LOOK);
  return { config: value, error };
}

export async function saveHomeLook(config: HomeLook): Promise<{ ok: true } | { ok: false; error: SiteContentError }> {
  return writeSiteContent(HOME_LOOK_KEY, homeLookSchema.parse(config));
}

export type LookMembershipResult = { ok: true; changed: boolean } | { ok: false; error: SiteContentError } | { ok: false; error: { code: "full"; message: string } };

/** Adds or removes one product from the look without touching the order of the others. */
export async function setLookMembership(slug: string, include: boolean): Promise<LookMembershipResult> {
  const { config, error } = await getHomeLook();
  if (error) return { ok: false, error };
  const toggled = toggleLookSlug(config, slug, include);
  if (!toggled.changed) {
    if (toggled.reason === "full") return { ok: false, error: { code: "full", message: `Shop the look already has ${MAX_LOOK_PRODUCTS} pieces. Remove one under Content → Homepage first.` } };
    return { ok: true, changed: false };
  }
  const saved = await saveHomeLook(toggled.config);
  return saved.ok ? { ok: true, changed: true } : saved;
}
