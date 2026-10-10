import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Key/value store for owner-editable storefront content (`site_content`
 * table, migration 011). Reads fall back to the caller's default whenever
 * the database is not configured, the table has not been created yet, or
 * the stored document fails validation, so the storefront always renders.
 */

export type SiteContentError = { code: "unconfigured" | "missing_table" | "db"; message: string };

type DbError = { code?: string; message?: string } | null | undefined;

/** PostgREST reports an absent table as a schema-cache miss; Postgres as 42P01. */
export function isMissingTable(error: DbError): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /site_content/.test(error.message ?? "") && /could not find|does not exist|schema cache/i.test(error.message ?? "");
}

export const MISSING_TABLE_HELP = "The site_content table does not exist yet. Run supabase/migrations/011_site_content.sql in the Supabase SQL editor, then try again.";

function describe(error: DbError): SiteContentError {
  if (isMissingTable(error)) return { code: "missing_table", message: MISSING_TABLE_HELP };
  return { code: "db", message: error?.message ?? "Database error." };
}

type RawRead = { value: unknown; error: SiteContentError | null };

/** One database read per key per request (React `cache`). */
const readRaw = cache(async (key: string): Promise<RawRead> => {
  if (!isSupabaseConfigured()) return { value: undefined, error: { code: "unconfigured", message: "Database not configured." } };
  const { data, error } = await getSupabaseServiceClient().from("site_content").select("value").eq("key", key).maybeSingle();
  if (error) {
    console.warn(JSON.stringify({ level: "warn", event: "site_content", action: "read_failed", key, code: error.code, message: error.message, ts: new Date().toISOString() }));
    return { value: undefined, error: describe(error) };
  }
  return { value: (data as { value: unknown } | null)?.value, error: null };
});

/**
 * Reads one document and validates it. Returns `fallback` (and the reason)
 * when there is nothing usable, never throws.
 */
export async function readSiteContent<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<{ value: T; error: SiteContentError | null }> {
  const raw = await readRaw(key);
  if (raw.error) return { value: fallback, error: raw.error };
  if (raw.value === undefined || raw.value === null) return { value: fallback, error: null };
  const parsed = schema.safeParse(raw.value);
  if (!parsed.success) {
    console.warn(JSON.stringify({ level: "warn", event: "site_content", action: "invalid_value", key, issues: parsed.error.issues.length, ts: new Date().toISOString() }));
    return { value: fallback, error: { code: "db", message: `Stored ${key} is invalid; showing defaults.` } };
  }
  return { value: parsed.data, error: null };
}

/** Creates or replaces one document. */
export async function writeSiteContent(key: string, value: unknown): Promise<{ ok: true } | { ok: false; error: SiteContentError }> {
  if (!isSupabaseConfigured()) return { ok: false, error: { code: "unconfigured", message: "Database not configured." } };
  const { error } = await getSupabaseServiceClient()
    .from("site_content")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: describe(error) };
  return { ok: true };
}
