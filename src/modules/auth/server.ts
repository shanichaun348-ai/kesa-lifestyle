import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { publicEnv } from "@/lib/env";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

import type { FlowDeps } from "./flows";
import type { AuthUser } from "./provider";
import { SupabaseAuthProvider } from "./supabase-provider";

/** Keep the profile row's email in step with auth (the trigger creates it on sign-up). */
async function syncProfile(user: AuthUser): Promise<void> {
  if (!isSupabaseConfigured() || !user.email) return;
  await getSupabaseServiceClient().from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });
}

/**
 * Flow dependencies for the real runtime: Supabase provider, a hashed client
 * IP for limiter keys, and profile sync when the database is configured.
 * Returns null when Supabase Auth is not configured so actions can answer
 * "not available" cleanly.
 */
export async function getAuthFlowDeps(): Promise<FlowDeps | null> {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  let ipHash: string | undefined;
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
    ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : undefined;
  } catch {
    ipHash = undefined;
  }
  return { provider: new SupabaseAuthProvider(), siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL, ipHash, syncProfile };
}
