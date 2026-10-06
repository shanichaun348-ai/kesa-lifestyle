"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type ProductFormState = { error: string } | { success: string } | null;

export async function createProduct(prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requireAdmin("products:write");

  const name = formData.get("name");
  const slug = formData.get("slug");
  const status = formData.get("status") ?? "draft";
  const shortDescription = formData.get("shortDescription") ?? "";
  const gender = formData.get("gender") ?? "women";
  const primaryCategoryPath = formData.get("primaryCategoryPath") ?? "";
  const pricePaise = formData.get("pricePaise");
  const compareAtPaise = formData.get("compareAtPaise");
  const sku = formData.get("sku");
  const stock = formData.get("stock") ?? "0";

  if (typeof name !== "string" || !name.trim()) return { error: "Product name is required." };
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug.trim())) return { error: "Slug must be lowercase letters, numbers and hyphens only." };
  if (!pricePaise || isNaN(Number(pricePaise))) return { error: "Price is required." };
  if (!sku || typeof sku !== "string" || !sku.trim()) return { error: "SKU is required." };

  const db = getSupabaseServiceClient();

  // Check slug uniqueness
  const { data: existing } = await db.from("cat_products").select("id").eq("slug", slug.trim()).single();
  if (existing) return { error: `Slug "${slug.trim()}" is already in use.` };

  // Insert product
  const { data: newProduct, error: insertError } = await db
    .from("cat_products")
    .insert({
      slug: slug.trim(),
      name: name.trim(),
      short_description: typeof shortDescription === "string" ? shortDescription.trim() : "",
      description: [],
      gender,
      primary_category_path: typeof primaryCategoryPath === "string" ? primaryCategoryPath.trim() : "",
      category_paths: [typeof primaryCategoryPath === "string" ? primaryCategoryPath.trim() : ""],
      tags: [],
      attributes: {},
      highlights: [],
      styling_tips: [],
      care: "",
      hsn_code: "71171990",
      gst_rate_bp: 300,
      return_policy: "returnable",
      low_stock_threshold: 3,
      complete_the_look_slugs: [],
      faq: [],
      images: [],
      status,
      published_at: status === "active" ? new Date().toISOString() : null,
      sales_30d: 0,
      sort_weight: 0,
    })
    .select("id")
    .single();

  if (insertError || !newProduct) return { error: `Failed to create product: ${insertError?.message ?? "unknown error"}` };

  const productId = (newProduct as { id: string }).id;

  // Insert variant
  const { error: varError } = await db.from("cat_variants").insert({
    product_id: productId,
    sku: (sku as string).trim(),
    option_value: null,
    price_paise: parseInt(pricePaise as string, 10),
    compare_at_paise: compareAtPaise ? parseInt(compareAtPaise as string, 10) : null,
    position: 0,
  });

  if (varError) return { error: `Product created but variant failed: ${varError.message}` };

  // Insert inventory row
  await db.from("product_variants").upsert({
    sku: (sku as string).trim(),
    available_stock: parseInt(stock as string, 10) || 0,
    reserved_stock: 0,
  }, { onConflict: "sku" });

  auditLog(session, "product.create", { name, slug, status });
  revalidatePath("/admin/products/");
  redirect(`/admin/products/${slug.trim()}/`);
}
