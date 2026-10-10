/**
 * site_content reads must never break a page: an unconfigured database, a
 * table that has not been migrated yet, or an invalid document all yield
 * the caller's fallback with a reason attached.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/supabase", () => ({ getSupabaseServiceClient: vi.fn(), isSupabaseConfigured: vi.fn(() => true) }));

import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { isMissingTable, readSiteContent, writeSiteContent } from "@/modules/content/site-content";

const schema = z.object({ n: z.number() });
const fallback = { n: 0 };

function fakeDb(read: { data: unknown; error: unknown }, write: { error: unknown } = { error: null }) {
  const upsert = vi.fn(async () => write);
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => read }) }),
      upsert,
    }),
  };
  return { client, upsert };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
});

describe("readSiteContent", () => {
  it("returns the stored document when it validates", async () => {
    vi.mocked(getSupabaseServiceClient).mockReturnValue(fakeDb({ data: { value: { n: 4 } }, error: null }).client as never);
    expect(await readSiteContent("k1", schema, fallback)).toEqual({ value: { n: 4 }, error: null });
  });

  it("falls back when the row is missing, invalid, or the database is not configured", async () => {
    vi.mocked(getSupabaseServiceClient).mockReturnValue(fakeDb({ data: null, error: null }).client as never);
    expect(await readSiteContent("k2", schema, fallback)).toEqual({ value: fallback, error: null });

    vi.mocked(getSupabaseServiceClient).mockReturnValue(fakeDb({ data: { value: { n: "four" } }, error: null }).client as never);
    expect((await readSiteContent("k3", schema, fallback)).value).toEqual(fallback);

    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    expect(await readSiteContent("k4", schema, fallback)).toMatchObject({ value: fallback, error: { code: "unconfigured" } });
  });

  it("explains that the migration has not been run when the table is absent", async () => {
    vi.mocked(getSupabaseServiceClient).mockReturnValue(fakeDb({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.site_content' in the schema cache" } }).client as never);
    const result = await readSiteContent("k5", schema, fallback);
    expect(result.value).toEqual(fallback);
    expect(result.error).toMatchObject({ code: "missing_table", message: expect.stringContaining("011_site_content.sql") });
  });
});

describe("writeSiteContent", () => {
  it("upserts by key with a timestamp", async () => {
    const db = fakeDb({ data: null, error: null });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(db.client as never);
    expect(await writeSiteContent("home.look", { a: 1 })).toEqual({ ok: true });
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ key: "home.look", value: { a: 1 }, updated_at: expect.any(String) }), { onConflict: "key" });
  });

  it("reports a missing table the same way", async () => {
    vi.mocked(getSupabaseServiceClient).mockReturnValue(fakeDb({ data: null, error: null }, { error: { code: "42P01", message: 'relation "site_content" does not exist' } }).client as never);
    expect(await writeSiteContent("home.look", {})).toMatchObject({ ok: false, error: { code: "missing_table" } });
  });
});

describe("isMissingTable", () => {
  it("recognises Postgres and PostgREST spellings only", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205", message: "x" })).toBe(true);
    expect(isMissingTable({ message: "Could not find the table 'public.site_content' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
