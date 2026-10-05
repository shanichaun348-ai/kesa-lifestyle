import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Supabase client for the *current request's user* (anon key + session
 * cookies). Used only for auth flows on the server (ADR-32). It never
 * queries application tables: data access goes through Drizzle as the
 * `kesa_app` role with authorisation enforced in code (ADR-26).
 *
 * There is intentionally no browser client in this codebase.
 */
export async function createSupabaseServerClient() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
          }
        } catch {
          // Called from a Server Component: cookies are read-only there; the
          // proxy/middleware refreshes sessions instead.
        }
      },
    },
  });
}
