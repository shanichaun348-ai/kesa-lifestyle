import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv, requireServerEnv } from "@/lib/env";

/**
 * Privileged Supabase client using the SERVICE ROLE key.
 *
 * Rules (docs/11 §6):
 * - Server only. The `server-only` import makes any client import a build error.
 * - Used solely for Storage administration (signed upload URLs, object
 *   management) and Auth admin calls (invite, delete user). Never for
 *   querying application tables; those go through Drizzle as `kesa_app`.
 * - The key comes from the environment at call time, so it is never bundled.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
