import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase";

import { createSupabaseAccountService, type SupabaseAccountService } from "./supabase-service";

let cached: SupabaseAccountService | null = null;

/** Account service on the live Supabase schema, or null when Supabase is not configured (local demo). */
export function getAccountService(): SupabaseAccountService | null {
  if (!isSupabaseConfigured()) return null;
  cached ??= createSupabaseAccountService();
  return cached;
}
