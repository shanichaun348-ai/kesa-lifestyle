import "server-only";

import { publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Current signed-in user id from the Supabase session cookie, or null for
 * guests and when Supabase is not configured. Accounts UI arrives in a later
 * phase; the cart and checkout already honour a session when one exists.
 */
export async function getSessionUserId(): Promise<string | null> {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
