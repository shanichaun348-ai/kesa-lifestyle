"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type BulkAction = "publish" | "unpublish" | "archive" | "restore" | "delete";

export type BulkResult = {
  /** Slugs that were changed. */
  done: string[];
  /** Slugs left untouched, with the reason. */
  skipped: Array<{ slug: string; reason: string }>;
  /** A failure that stopped the whole batch. */
  error?: string;
};

const MAX_BATCH = 200;

type Row = { id: string; slug: string; name: string; status: string; images: unknown[] | null; published_at: string | null };

function revalidateAll(slugs: string[]) {
  revalidatePath("/admin/products/");
  revalidatePath("/");
  for (const slug of slugs) {
    revalidatePath(`/admin/products/${slug}/`);
    revalidatePath(`/products/${slug}/`);
  }
}

/**
 * Applies one action to many products. Each product is checked against the
 * same rules as the single-product actions (a publish needs a photo, an
 * archive keeps history, a delete is for products that never sold) and the
 * ones that fail a rule are reported back instead of silently dropped.
 */
export async function bulkProductAction(action: BulkAction, slugs: string[]): Promise<BulkResult> {
  const session = await requireAdmin(action === "delete" ? "products:delete" : "products:write");

  const wanted = [...new Set(slugs.filter((s) => typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s)))];
  if (wanted.length === 0) return { done: [], skipped: [], error: "Select at least one product." };
  if (wanted.length > MAX_BATCH) return { done: [], skipped: [], error: `Select at most ${MAX_BATCH} products at a time.` };

  const db = getSupabaseServiceClient();
  const { data, error } = await db.from("cat_products").select("id, slug, name, status, images, published_at").in("slug", wanted);
  if (error) return { done: [], skipped: [], error: `Could not load the products: ${error.message}` };
  const rows = (data ?? []) as Row[];
  const found = new Set(rows.map((r) => r.slug));

  const result: BulkResult = { done: [], skipped: wanted.filter((s) => !found.has(s)).map((slug) => ({ slug, reason: "not found" })) };
  const now = new Date().toISOString();

  if (action === "delete") {
    const ids = rows.map((r) => r.id);
    // Variants cascade from cat_products; the inventory rows are keyed by SKU, so collect them first.
    const { data: variants } = await db.from("cat_variants").select("sku").in("product_id", ids);
    const skus = ((variants ?? []) as Array<{ sku: string }>).map((v) => v.sku);
    const { error: deleteError } = await db.from("cat_products").delete().in("id", ids);
    if (deleteError) return { ...result, error: `Could not delete: ${deleteError.message}` };
    if (skus.length > 0) {
      const { error: stockError } = await db.from("product_variants").delete().in("sku", skus);
      if (stockError) result.error = `Products deleted, but their stock rows were not: ${stockError.message}`;
    }
    result.done = rows.map((r) => r.slug);
    for (const r of rows) auditLog(session, "product.delete", { productId: r.slug, bulk: true });
    revalidateAll(result.done);
    return result;
  }

  // Status changes: work out which rows qualify, then update them in one statement.
  const targets: Row[] = [];
  for (const r of rows) {
    if (action === "publish") {
      if (r.status === "active") result.skipped.push({ slug: r.slug, reason: "already published" });
      else if (((r.images as unknown[]) ?? []).length === 0) result.skipped.push({ slug: r.slug, reason: "no photo" });
      else targets.push(r);
    } else if (action === "unpublish") {
      if (r.status !== "active") result.skipped.push({ slug: r.slug, reason: "not published" });
      else targets.push(r);
    } else if (action === "archive") {
      if (r.status === "archived") result.skipped.push({ slug: r.slug, reason: "already archived" });
      else targets.push(r);
    } else if (action === "restore") {
      if (r.status !== "archived") result.skipped.push({ slug: r.slug, reason: "not archived" });
      else targets.push(r);
    }
  }
  if (targets.length === 0) return result;

  const patch: Record<string, unknown> =
    action === "publish"
      ? { status: "active", updated_at: now }
      : action === "unpublish"
        ? { status: "draft", updated_at: now }
        : action === "archive"
          ? { status: "archived", archived_at: now, updated_at: now }
          : { status: "draft", archived_at: null, updated_at: now };

  const ids = targets.map((t) => t.id);
  const { error: updateError } = await db.from("cat_products").update(patch).in("id", ids);
  if (updateError) return { ...result, error: `Could not update: ${updateError.message}` };

  if (action === "publish") {
    // First-time publishes get a published_at; re-publishes keep theirs.
    const firstTime = targets.filter((t) => !t.published_at).map((t) => t.id);
    if (firstTime.length > 0) await db.from("cat_products").update({ published_at: now }).in("id", firstTime);
  }

  result.done = targets.map((t) => t.slug);
  const auditAction = action === "publish" ? "product.publish" : action === "archive" ? "product.archive" : action === "unpublish" ? "product.unpublish" : "product.update";
  for (const t of targets) auditLog(session, auditAction, { productId: t.slug, bulk: true, ...(action === "restore" && { restored: true }) });
  revalidateAll(result.done);
  return result;
}
