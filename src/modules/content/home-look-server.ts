import "server-only";

import { DEFAULT_HOME_LOOK, HOME_LOOK_KEY, homeLookSchema, type HomeLook } from "./home-look";
import { readSiteContent, writeSiteContent, type SiteContentError } from "./site-content";

/** The saved configuration, or the defaults with the reason they are in use. */
export async function getHomeLook(): Promise<{ config: HomeLook; error: SiteContentError | null }> {
  const { value, error } = await readSiteContent(HOME_LOOK_KEY, homeLookSchema, DEFAULT_HOME_LOOK);
  return { config: value, error };
}

export async function saveHomeLook(config: HomeLook): Promise<{ ok: true } | { ok: false; error: SiteContentError }> {
  return writeSiteContent(HOME_LOOK_KEY, homeLookSchema.parse(config));
}
