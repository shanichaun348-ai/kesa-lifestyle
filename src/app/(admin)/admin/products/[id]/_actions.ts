"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { validateSubmittedVideos } from "@/modules/catalog/videos";
import { slugProblem } from "@/modules/catalog/slug";
import { isWarrantyMonths, withWarrantyTag } from "@/modules/catalog/warranty";
import { getHomeLook, renameLookSlug, setLookMembership } from "@/modules/content/home-look-server";
import { withRailTags } from "@/modules/content/home-placements";

import { categoryOptions, readPlacements, SKU_PATTERN } from "../_category-options";

/** `notice` is something that did not happen even though the save went through. */
export type ProductEditState = { error: string } | { success: string; notice?: string } | null;

type SubmittedVariant = { sku: string; optionValue: string; pricePaise: number; compareAtPaise: number | null; stock: number };
type SubmittedImage = { src: string; alt: string };

function lines(value: FormDataEntryValue | null): string[] {
  return typeof value === "string" ? value.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function revalidateProduct(slug: string, categoryPaths: readonly string[] = []) {
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${slug}/`);
  revalidatePath(`/products/${slug}/`);
  revalidatePath("/");
  for (const path of new Set(categoryPaths)) revalidatePath(`/${path}/`);
}

export async function updateProduct(slug: string, prevState: ProductEditState, formData: FormData): Promise<ProductEditState> {
  const session = await requireAdmin("products:write");

  const name = text(formData.get("name"));
  if (!name) return { error: "Product name is required." };

  const status = text(formData.get("status")) === "active" ? "active" : "draft";
  // The URL may be changed here (e.g. to repair one that was filled from a pasted description).
  const requestedSlug = text(formData.get("slug")) || slug;
  const slugError = slugProblem(requestedSlug);
  if (slugError) return { error: slugError };
  const renamed = requestedSlug !== slug;
  const gender = text(formData.get("gender"));
  if (!["women", "men", "unisex"].includes(gender)) return { error: "Choose a gender." };

  const categories = await categoryOptions();
  const category = categories.find((c) => c.path === text(formData.get("primaryCategoryPath")));
  if (!category) return { error: "Choose a category from the list." };
  const placements = readPlacements(formData, categories, category, gender);
  if ("error" in placements) return placements;
  const showInLook = formData.get("showInLook") === "on";

  let images: SubmittedImage[] = [];
  try { images = JSON.parse(text(formData.get("imagesJson")) || "[]"); } catch { return { error: "Image data was malformed — reload the page and try again." }; }
  images = images.map((i) => ({ src: i.src.trim(), alt: i.alt.trim() })).filter((i) => i.src);
  for (const img of images) {
    if (!/^(https?:\/\/|\/)/.test(img.src)) return { error: `Image URL "${img.src.slice(0, 40)}" must start with https:// (or / for a site file).` };
  }
  if (status === "active" && images.length === 0) return { error: "Add at least one product image before publishing. Save as draft if the photos are not ready yet." };

  let videosRaw: unknown = [];
  try { videosRaw = JSON.parse(text(formData.get("videosJson")) || "[]"); } catch { return { error: "Video data was malformed — reload the page and try again." }; }
  const videosResult = validateSubmittedVideos(videosRaw);
  if (!videosResult.ok) return { error: videosResult.error };

  let variants: SubmittedVariant[] = [];
  try { variants = JSON.parse(text(formData.get("variantsJson")) || "[]"); } catch { return { error: "Variant data was malformed — reload the page and try again." }; }
  variants = variants.map((v) => ({ ...v, sku: v.sku.trim().toUpperCase(), optionValue: v.optionValue.trim() }));
  if (variants.length === 0) return { error: "A product needs at least one variant with a SKU and price." };
  const seenSku = new Set<string>();
  for (const v of variants) {
    if (!SKU_PATTERN.test(v.sku)) return { error: `SKU "${v.sku || "(blank)"}" may only contain letters, numbers, dots, dashes and underscores — no spaces.` };
    if (seenSku.has(v.sku)) return { error: `SKU "${v.sku}" is listed twice.` };
    seenSku.add(v.sku);
    if (!Number.isInteger(v.pricePaise) || v.pricePaise <= 0) return { error: `Enter a selling price for ${v.sku}.` };
    if (v.compareAtPaise !== null && v.compareAtPaise <= v.pricePaise) return { error: `Original price for ${v.sku} must be higher than its selling price (or blank).` };
    if (!Number.isInteger(v.stock) || v.stock < 0) return { error: `Stock for ${v.sku} must be 0 or more.` };
  }
  if (variants.length > 1 && variants.some((v) => !v.optionValue)) return { error: "When a product has several variants, every variant needs an option value (e.g. S, M, 18 inch)." };

  const db = getSupabaseServiceClient();
  const { data: existing } = await db.from("cat_products").select("id, published_at, tags, category_paths, cat_variants(sku)").eq("slug", slug).maybeSingle();
  if (!existing) return { error: "Product not found." };
  const productId = existing.id as string;
  if (renamed) {
    const { data: taken } = await db.from("cat_products").select("id").eq("slug", requestedSlug).neq("id", productId).maybeSingle();
    if (taken) return { error: `The URL slug "${requestedSlug}" is already used by another product.` };
  }
  const previousTags = Array.isArray(existing.tags) ? (existing.tags as string[]) : [];
  const previousPaths = Array.isArray(existing.category_paths) ? (existing.category_paths as string[]) : [];
  const existingSkus = ((existing.cat_variants as Array<{ sku: string }> | null) ?? []).map((v) => v.sku);

  // A SKU moving to this product from another one would silently steal it — refuse.
  const incoming = variants.map((v) => v.sku).filter((s) => !existingSkus.includes(s));
  if (incoming.length > 0) {
    const { data: clashes } = await db.from("cat_variants").select("sku").in("sku", incoming).neq("product_id", productId);
    if (clashes && clashes.length > 0) return { error: `SKU "${(clashes[0] as { sku: string }).sku}" already belongs to another product.` };
  }

  const warrantyValue = Number(text(formData.get("warranty")));
  const warranty = isWarrantyMonths(warrantyValue) ? warrantyValue : undefined;
  const gstRateBp = parseInt(text(formData.get("gstRateBp")), 10);
  const { error: updateError } = await db
    .from("cat_products")
    .update({
      name,
      slug: requestedSlug,
      short_description: text(formData.get("shortDescription")),
      description: lines(formData.get("description")),
      gender,
      primary_category_path: category.path,
      category_paths: placements.categoryPaths,
      tags: withWarrantyTag(withRailTags(previousTags, placements.rails), warranty),
      care: text(formData.get("care")),
      highlights: lines(formData.get("highlights")),
      images,
      videos: videosResult.videos,
      status,
      published_at: status === "active" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at,
      hsn_code: text(formData.get("hsnCode")) || "71171990",
      gst_rate_bp: Number.isFinite(gstRateBp) && gstRateBp >= 0 ? gstRateBp : 300,
      return_policy: ["returnable", "exchange_only", "final_sale"].includes(text(formData.get("returnPolicy"))) ? text(formData.get("returnPolicy")) : "returnable",
      option_name: variants.length > 1 ? (text(formData.get("optionName")) === "Length" ? "Length" : "Size") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (updateError) return { error: `Could not save the product: ${updateError.message}` };

  const { error: variantError } = await db.from("cat_variants").upsert(
    variants.map((v, i) => ({ product_id: productId, sku: v.sku, option_value: v.optionValue || null, price_paise: v.pricePaise, compare_at_paise: v.compareAtPaise, position: i })),
    { onConflict: "sku" },
  );
  if (variantError) return { error: `Could not save variants: ${variantError.message}` };

  const removed = existingSkus.filter((s) => !seenSku.has(s));
  if (removed.length > 0) {
    const { error: removeError } = await db.from("cat_variants").delete().eq("product_id", productId).in("sku", removed);
    if (removeError) return { error: `Saved, but could not remove old variants: ${removeError.message}` };
  }

  for (const v of variants) {
    const { error: stockError } = await db
      .from("product_variants")
      .upsert({ sku: v.sku, product_id: productId, product_name: name, available_stock: v.stock, updated_at: new Date().toISOString() }, { onConflict: "sku" });
    if (stockError) return { error: `Saved, but could not update stock for ${v.sku}: ${stockError.message}` };
  }

  // "Shop the look" lives in site content, not on the product: add or drop this piece without reordering the rest.
  let notice: string | undefined;
  if (renamed) {
    const moved = await renameLookSlug(slug, requestedSlug);
    if (!moved.ok && moved.error.code !== "unconfigured") notice = `The URL changed, but Shop the look could not be updated: ${moved.error.message}`;
  }
  const { config: look, error: lookError } = await getHomeLook();
  const inLook = look.productSlugs.includes(requestedSlug);
  if (showInLook && status !== "active" && !inLook) {
    notice = "Not added to Shop the look: only published pieces can be shown there. Publish the product, then tick the box again.";
  } else if (showInLook !== inLook) {
    const result = lookError ? { ok: false as const, error: lookError } : await setLookMembership(requestedSlug, showInLook);
    if (!result.ok) notice = `${showInLook ? "Not added to" : "Not removed from"} Shop the look: ${result.error.message}`;
  }

  auditLog(session, "product.update", { productId: requestedSlug, previousSlug: renamed ? slug : undefined, status, categoryPaths: placements.categoryPaths, rails: placements.rails, showInLook });
  revalidateProduct(slug, [...previousPaths, ...placements.categoryPaths]);
  if (renamed) {
    revalidateProduct(requestedSlug);
    // The edit page lives at the slug, so move the browser to the new address.
    redirect(`/admin/products/${requestedSlug}/?renamed=1${notice ? `&notice=${encodeURIComponent(notice)}` : ""}`);
  }
  const success = status === "active" ? "Saved and live in the store." : "Saved as draft.";
  return notice ? { success, notice } : { success };
}

export async function publishProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:write");
  const db = getSupabaseServiceClient();
  const { data } = await db.from("cat_products").select("images, published_at").eq("slug", slug).maybeSingle();
  if (!data) redirect("/admin/products/");
  if (((data.images as unknown[]) ?? []).length === 0) redirect(`/admin/products/${slug}/?error=no-image`);
  const { error } = await db
    .from("cat_products")
    .update({ status: "active", published_at: data.published_at ?? new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    console.error(`publishProduct(${slug}) failed: ${error.message}`);
    redirect(`/admin/products/${slug}/?error=publish-failed`);
  }
  auditLog(session, "product.publish", { productId: slug });
  revalidateProduct(slug);
  redirect(`/admin/products/${slug}/?published=1`);
}

export async function unpublishProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:write");
  const { error } = await getSupabaseServiceClient().from("cat_products").update({ status: "draft", updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) {
    console.error(`unpublishProduct(${slug}) failed: ${error.message}`);
    redirect(`/admin/products/${slug}/?error=unpublish-failed`);
  }
  auditLog(session, "product.unpublish", { productId: slug });
  revalidateProduct(slug);
  redirect(`/admin/products/${slug}/`);
}

export async function archiveProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  await getSupabaseServiceClient().from("cat_products").update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("slug", slug);
  auditLog(session, "product.archive", { productId: slug });
  revalidateProduct(slug);
  redirect("/admin/products/");
}

export async function deleteProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  const db = getSupabaseServiceClient();
  const { data } = await db.from("cat_products").select("id").eq("slug", slug).maybeSingle();
  if (data) {
    await db.from("cat_variants").delete().eq("product_id", data.id);
    await db.from("cat_products").delete().eq("id", data.id);
  }
  auditLog(session, "product.delete", { productId: slug });
  revalidateProduct(slug);
  redirect("/admin/products/");
}
