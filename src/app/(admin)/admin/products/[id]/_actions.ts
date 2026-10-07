"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";

import { categoryOptions, SKU_PATTERN } from "../_category-options";

export type ProductEditState = { error: string } | { success: string } | null;

type SubmittedVariant = { sku: string; optionValue: string; pricePaise: number; compareAtPaise: number | null; stock: number };
type SubmittedImage = { src: string; alt: string };

function lines(value: FormDataEntryValue | null): string[] {
  return typeof value === "string" ? value.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function revalidateProduct(slug: string) {
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${slug}/`);
  revalidatePath(`/products/${slug}/`);
  revalidatePath("/");
}

export async function updateProduct(slug: string, prevState: ProductEditState, formData: FormData): Promise<ProductEditState> {
  const session = await requireAdmin("products:write");

  const name = text(formData.get("name"));
  if (!name) return { error: "Product name is required." };

  const status = text(formData.get("status")) === "active" ? "active" : "draft";
  const gender = text(formData.get("gender"));
  if (!["women", "men", "unisex"].includes(gender)) return { error: "Choose a gender." };

  const category = (await categoryOptions()).find((c) => c.path === text(formData.get("primaryCategoryPath")));
  if (!category) return { error: "Choose a category from the list." };

  let images: SubmittedImage[] = [];
  try { images = JSON.parse(text(formData.get("imagesJson")) || "[]"); } catch { return { error: "Image data was malformed — reload the page and try again." }; }
  images = images.map((i) => ({ src: i.src.trim(), alt: i.alt.trim() })).filter((i) => i.src);
  for (const img of images) {
    if (!/^(https?:\/\/|\/)/.test(img.src)) return { error: `Image URL "${img.src.slice(0, 40)}" must start with https:// (or / for a site file).` };
  }
  if (status === "active" && images.length === 0) return { error: "Add at least one product image before publishing. Save as draft if the photos are not ready yet." };

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
  const { data: existing } = await db.from("cat_products").select("id, published_at, cat_variants(sku)").eq("slug", slug).maybeSingle();
  if (!existing) return { error: "Product not found." };
  const productId = existing.id as string;
  const existingSkus = ((existing.cat_variants as Array<{ sku: string }> | null) ?? []).map((v) => v.sku);

  // A SKU moving to this product from another one would silently steal it — refuse.
  const incoming = variants.map((v) => v.sku).filter((s) => !existingSkus.includes(s));
  if (incoming.length > 0) {
    const { data: clashes } = await db.from("cat_variants").select("sku").in("sku", incoming).neq("product_id", productId);
    if (clashes && clashes.length > 0) return { error: `SKU "${(clashes[0] as { sku: string }).sku}" already belongs to another product.` };
  }

  const gstRateBp = parseInt(text(formData.get("gstRateBp")), 10);
  const { error: updateError } = await db
    .from("cat_products")
    .update({
      name,
      short_description: text(formData.get("shortDescription")),
      description: lines(formData.get("description")),
      gender,
      primary_category_path: category.path,
      category_paths: [category.path],
      care: text(formData.get("care")),
      highlights: lines(formData.get("highlights")),
      images,
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

  auditLog(session, "product.update", { productId: slug, status });
  revalidateProduct(slug);
  return { success: status === "active" ? "Saved and live in the store." : "Saved as draft." };
}

export async function publishProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:write");
  const db = getSupabaseServiceClient();
  const { data } = await db.from("cat_products").select("images, published_at").eq("slug", slug).maybeSingle();
  if (!data) redirect("/admin/products/");
  if (((data.images as unknown[]) ?? []).length === 0) redirect(`/admin/products/${slug}/?error=no-image`);
  await db.from("cat_products").update({ status: "active", published_at: data.published_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq("slug", slug);
  auditLog(session, "product.publish", { productId: slug });
  revalidateProduct(slug);
  redirect(`/admin/products/${slug}/?published=1`);
}

export async function unpublishProduct(slug: string): Promise<void> {
  const session = await requireAdmin("products:write");
  await getSupabaseServiceClient().from("cat_products").update({ status: "draft", updated_at: new Date().toISOString() }).eq("slug", slug);
  auditLog(session, "product.unpublish", { productId: slug });
  revalidateProduct(slug);
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
