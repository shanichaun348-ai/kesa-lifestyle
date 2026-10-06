"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type ProductEditState = { error: string } | { success: string } | null;

export async function updateProduct(id: string, prevState: ProductEditState, formData: FormData): Promise<ProductEditState> {
  const session = await requireAdmin("products:write");

  const name = formData.get("name");
  const shortDescription = formData.get("shortDescription");
  const description = formData.get("description");
  const gender = formData.get("gender");
  const primaryCategoryPath = formData.get("primaryCategoryPath");
  const care = formData.get("care");
  const highlights = formData.get("highlights");
  const imagesJson = formData.get("imagesJson");
  const variantsJson = formData.get("variantsJson");
  const status = formData.get("status");
  const hsnCode = formData.get("hsnCode");
  const gstRateBp = formData.get("gstRateBp");
  const returnPolicy = formData.get("returnPolicy");

  if (typeof name !== "string" || !name.trim()) return { error: "Product name is required." };

  const db = getSupabaseServiceClient();

  // Look up the product by slug to get the UUID
  const { data: existing, error: lookupError } = await db
    .from("cat_products")
    .select("id")
    .eq("slug", id)
    .single();

  if (lookupError || !existing) return { error: "Product not found." };
  const productUuid = existing.id as string;

  // Parse images
  let images: Array<{ src: string; alt: string }> = [];
  try { images = JSON.parse(typeof imagesJson === "string" ? imagesJson : "[]"); } catch { /* keep empty */ }

  // Parse description paragraphs (newline-separated in textarea)
  const descParagraphs = typeof description === "string"
    ? description.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  // Parse highlights (one per line)
  const highlightLines = typeof highlights === "string"
    ? highlights.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  // Update cat_products
  const { error: updateError } = await db
    .from("cat_products")
    .update({
      name: (name as string).trim(),
      short_description: typeof shortDescription === "string" ? shortDescription.trim() : "",
      description: descParagraphs,
      gender: typeof gender === "string" ? gender : "women",
      primary_category_path: typeof primaryCategoryPath === "string" ? primaryCategoryPath.trim() : "",
      care: typeof care === "string" ? care.trim() : "",
      highlights: highlightLines,
      images,
      status: typeof status === "string" ? status : "draft",
      hsn_code: typeof hsnCode === "string" ? hsnCode.trim() : "",
      gst_rate_bp: typeof gstRateBp === "string" ? parseInt(gstRateBp, 10) || 300 : 300,
      return_policy: typeof returnPolicy === "string" ? returnPolicy : "returnable",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productUuid);

  if (updateError) return { error: `Failed to update product: ${updateError.message}` };

  // Parse and upsert variants
  let variants: Array<{ sku: string; optionValue: string; pricePaise: number; compareAtPaise: number | null; stock: number; position: number }> = [];
  try { variants = JSON.parse(typeof variantsJson === "string" ? variantsJson : "[]"); } catch { /* keep empty */ }

  if (variants.length > 0) {
    // Upsert cat_variants
    const catVariantRows = variants.map((v, i) => ({
      product_id: productUuid,
      sku: v.sku,
      option_value: v.optionValue || null,
      price_paise: v.pricePaise,
      compare_at_paise: v.compareAtPaise || null,
      position: i,
    }));

    const { error: varError } = await db
      .from("cat_variants")
      .upsert(catVariantRows, { onConflict: "sku" });

    if (varError) return { error: `Failed to update variants: ${varError.message}` };

    // Upsert product_variants (inventory)
    for (const v of variants) {
      const { error: invError } = await db
        .from("product_variants")
        .upsert({ sku: v.sku, available_stock: v.stock }, { onConflict: "sku" });
      if (invError) return { error: `Failed to update stock for ${v.sku}: ${invError.message}` };
    }
  }

  auditLog(session, "product.update", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
  revalidatePath(`/products/${id}/`);
  return { success: "Product saved successfully." };
}

export async function publishProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:write");
  const db = getSupabaseServiceClient();
  await db
    .from("cat_products")
    .update({ status: "active", published_at: new Date().toISOString() })
    .eq("slug", id);
  auditLog(session, "product.publish", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
  revalidatePath(`/products/${id}/`);
}

export async function unpublishProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:write");
  const db = getSupabaseServiceClient();
  await db.from("cat_products").update({ status: "draft" }).eq("slug", id);
  auditLog(session, "product.unpublish", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
  revalidatePath(`/products/${id}/`);
}

export async function archiveProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  const db = getSupabaseServiceClient();
  await db
    .from("cat_products")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("slug", id);
  auditLog(session, "product.archive", { productId: id });
  revalidatePath("/admin/products/");
  redirect("/admin/products/");
}

export async function deleteProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  const db = getSupabaseServiceClient();
  // Delete variants first (FK constraint)
  const { data: productRow } = await db.from("cat_products").select("id").eq("slug", id).single();
  if (productRow) {
    await db.from("cat_variants").delete().eq("product_id", productRow.id);
  }
  await db.from("cat_products").delete().eq("slug", id);
  auditLog(session, "product.delete", { productId: id });
  revalidatePath("/admin/products/");
  redirect("/admin/products/");
}
