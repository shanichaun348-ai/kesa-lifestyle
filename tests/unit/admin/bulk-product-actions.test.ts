/**
 * bulkProductAction — the rules applied to many products at once, with a
 * recorded fake Supabase client. The single-product actions share these rules
 * (publish needs a photo, archive keeps history, delete also clears stock).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/admin/audit", () => ({ auditLog: vi.fn() }));
vi.mock("@/modules/admin/guard", () => ({ requireAdmin: vi.fn(async () => ({ id: "admin-1", email: "owner@example.com", name: "Owner", role: "owner" })) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseServiceClient: vi.fn(), isSupabaseConfigured: vi.fn(() => true) }));

import { getSupabaseServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/modules/admin/guard";
import { auditLog } from "@/modules/admin/audit";

import { bulkProductAction } from "../../../src/app/(admin)/admin/products/_bulk-actions";

type Row = { id: string; slug: string; name: string; status: string; images: unknown[]; published_at: string | null };
type Call = { table: string; op: "select" | "update" | "delete"; patch?: Record<string, unknown>; filter?: { column: string; values: unknown[] } };

/** Minimal chainable stand-in for the parts of supabase-js the action uses. */
function fakeDb(products: Row[], variants: Array<{ product_id: string; sku: string }>) {
  const calls: Call[] = [];
  function from(table: string) {
    const call: Call = { table, op: "select" };
    const api = {
      select() { call.op = "select"; return api; },
      update(patch: Record<string, unknown>) { call.op = "update"; call.patch = patch; return api; },
      delete() { call.op = "delete"; return api; },
      in(column: string, values: unknown[]) {
        call.filter = { column, values };
        calls.push(call);
        if (call.op !== "select") return Promise.resolve({ data: null, error: null });
        if (table === "cat_products") return Promise.resolve({ data: products.filter((p) => values.includes(p.slug)), error: null });
        if (table === "cat_variants") return Promise.resolve({ data: variants.filter((v) => values.includes(v.product_id)), error: null });
        return Promise.resolve({ data: [], error: null });
      },
    };
    return api;
  }
  return { client: { from }, calls };
}

const rows: Row[] = [
  { id: "p1", slug: "with-photo", name: "With photo", status: "draft", images: [{ src: "/a.jpg" }], published_at: null },
  { id: "p2", slug: "no-photo", name: "No photo", status: "draft", images: [], published_at: null },
  { id: "p3", slug: "already-live", name: "Already live", status: "active", images: [{ src: "/b.jpg" }], published_at: "2026-10-01T00:00:00Z" },
  { id: "p4", slug: "old", name: "Old", status: "archived", images: [{ src: "/c.jpg" }], published_at: "2026-09-01T00:00:00Z" },
];
const variants = [
  { product_id: "p1", sku: "SKU-1" },
  { product_id: "p3", sku: "SKU-3A" },
  { product_id: "p3", sku: "SKU-3B" },
];

let db: ReturnType<typeof fakeDb>;

beforeEach(() => {
  vi.clearAllMocks();
  db = fakeDb(rows, variants);
  vi.mocked(getSupabaseServiceClient).mockReturnValue(db.client as never);
});

describe("bulkProductAction", () => {
  it("publishes only drafts that have a photo and reports the rest", async () => {
    const result = await bulkProductAction("publish", ["with-photo", "no-photo", "already-live", "missing"]);

    expect(result.error).toBeUndefined();
    expect(result.done).toEqual(["with-photo"]);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { slug: "missing", reason: "not found" },
        { slug: "no-photo", reason: "no photo" },
        { slug: "already-live", reason: "already published" },
      ]),
    );
    const update = db.calls.find((c) => c.op === "update" && c.table === "cat_products");
    expect(update?.patch).toMatchObject({ status: "active" });
    expect(update?.filter).toEqual({ column: "id", values: ["p1"] });
    // first publish stamps published_at
    const stamp = db.calls.filter((c) => c.op === "update").at(-1);
    expect(stamp?.patch).toHaveProperty("published_at");
    expect(vi.mocked(auditLog)).toHaveBeenCalledWith(expect.anything(), "product.publish", expect.objectContaining({ productId: "with-photo", bulk: true }));
  });

  it("archives active and draft products but not archived ones", async () => {
    const result = await bulkProductAction("archive", ["with-photo", "already-live", "old"]);
    expect(result.done).toEqual(["with-photo", "already-live"]);
    expect(result.skipped).toEqual([{ slug: "old", reason: "already archived" }]);
    const update = db.calls.find((c) => c.op === "update");
    expect(update?.patch).toMatchObject({ status: "archived" });
    expect(update?.patch?.archived_at).toEqual(expect.any(String));
  });

  it("restores archived products to draft", async () => {
    const result = await bulkProductAction("restore", ["old", "already-live"]);
    expect(result.done).toEqual(["old"]);
    expect(result.skipped).toEqual([{ slug: "already-live", reason: "not archived" }]);
    expect(db.calls.find((c) => c.op === "update")?.patch).toMatchObject({ status: "draft", archived_at: null });
  });

  it("deletes products and their stock rows, under the delete permission", async () => {
    const result = await bulkProductAction("delete", ["with-photo", "already-live"]);

    expect(vi.mocked(requireAdmin)).toHaveBeenCalledWith("products:delete");
    expect(result.done).toEqual(["with-photo", "already-live"]);
    const productDelete = db.calls.find((c) => c.op === "delete" && c.table === "cat_products");
    expect(productDelete?.filter).toEqual({ column: "id", values: ["p1", "p3"] });
    const stockDelete = db.calls.find((c) => c.op === "delete" && c.table === "product_variants");
    expect(stockDelete?.filter).toEqual({ column: "sku", values: ["SKU-1", "SKU-3A", "SKU-3B"] });
  });

  it("uses the write permission for status changes", async () => {
    await bulkProductAction("unpublish", ["already-live"]);
    expect(vi.mocked(requireAdmin)).toHaveBeenCalledWith("products:write");
  });

  it("rejects an empty or malformed selection without touching the database", async () => {
    expect((await bulkProductAction("publish", [])).error).toMatch(/at least one/i);
    expect((await bulkProductAction("publish", ["Not A Slug!"])).error).toMatch(/at least one/i);
    expect(db.calls).toHaveLength(0);
  });
});
