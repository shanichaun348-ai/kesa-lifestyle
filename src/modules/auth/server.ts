import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { getDb } from "@/db/client";
import { getServerEnv, publicEnv } from "@/lib/env";

import type { FlowDeps } from "./flows";
import { SupabaseAuthProvider } from "./supabase-provider";

/**
 * Flow dependencies for the real runtime: Supabase provider, the database
 * when configured, and a hashed client IP for limiter keys. Returns null when
 * Supabase is not configured so actions can answer "not available" cleanly.
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
  return { provider: new SupabaseAuthProvider(), db: getServerEnv().DATABASE_URL ? getDb() : null, siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL, ipHash };
}
