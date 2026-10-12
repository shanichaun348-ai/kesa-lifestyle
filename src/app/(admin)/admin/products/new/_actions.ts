"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";

import { withRailTags } from "@/modules/content/home-placements";

import { categoryOptions, readPlacements, rupeesToPaise, SKU_PATTERN } from "../_category-options";

export type ProductFormState = { error: string } | null;

export async function createProduct(prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requireAdmin("products:write");

  const name = formData.get("name");
  const slug = formData.get("slug");
  const shortDescription = formData.get("shortDescription");
  const gender = formData.get("gender");
  const primaryCategoryPath = formData.get("primaryCategoryPath");
  const sku = formData.get("sku");
  const stock = formData.get("stock");
  const pricePaise = rupeesToPaise(formData.get("priceRupees"));
  const compareAtPaise = rupeesToPaise(formData.get("compareAtRupees"));

  if (typeof name !== "string" || !name.trim()) return { error: "Product name is required." };
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) return { error: "Slug must be lowercase letters, numbers and single hyphens, e.g. gold-hoop-earrings." };
  if (pricePaise === null || pricePaise <= 0) return { error: "Enter the price in rupees, e.g. 999 or 1299.50." };
  if (compareAtPaise !== null && compareAtPaise <= pricePaise) return { error: "Compare-at price must be higher than the selling price (or leave it blank)." };
  if (typeof sku !== "string" || !SKU_PATTERN.test(sku.trim())) return { error: "SKU may only contain letters, numbers, dots, dashes and underscores (no spaces), e.g. KL-NCK-0101." };
  if (typeof gender !== "string" || !["women", "men", "unisex"].includes(gender)) return { error: "Choose a gender." };

  const categories = await categoryOptions();
  const category = categories.find((c) => c.path === primaryCategoryPath);
  if (!category) return { error: "Choose a category from the list." };
  const placements = readPlacements(formData, categories, category, gender);
  if ("error" in placements) return placements;

  const db = getSupabaseServiceClient();
  const cleanSlug = slug.trim();
  const cleanSku = sku.trim().toUpperCase();

  const [{ data: slugTaken }, { data: skuTaken }] = await Promise.all([
    db.from("cat_products").select("id").eq("slug", cleanSlug).maybeSingle(),
    db.from("cat_variants").select("id").eq("sku", cleanSku).maybeSingle(),
  ]);
  if (slugTaken) return { error: `The slug "${cleanSlug}" is already used by another product.` };
  if (skuTaken) return { error: `The SKU "${cleanSku}" already exists on another product.` };

  const { data: created, error: insertError } = await db
    .from("cat_products")
    .insert({
      slug: cleanSlug,
      name: name.trim(),
      short_description: typeof shortDescription === "string" ? shortDescription.trim() : "",
      description: [],
      gender,
      primary_category_path: category.path,
      category_paths: placements.categoryPaths,
      tags: withRailTags([], placements.rails),
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
      // Always starts as a draft: images are added on the edit screen, then the product is published.
      status: "draft",
      published_at: null,
      sales_30d: 0,
      sort_weight: 0,
    })
    .select("id")
    .single();

  if (insertError || !created) return { error: `Could not create the product: ${insertError?.message ?? "unknown error"}` };
  const productId = (created as { id: string }).id;

  const { error: variantError } = await db.from("cat_variants").insert({
    product_id: productId,
    sku: cleanSku,
    option_value: null,
    price_paise: pricePaise,
    compare_at_paise: compareAtPaise,
    position: 0,
  });
  if (variantError) return { error: `Product created but the variant failed: ${variantError.message}` };

  await db.from("product_variants").upsert(
    { sku: cleanSku, product_id: productId, product_name: name.trim(), available_stock: Math.max(0, parseInt(typeof stock === "string" ? stock : "0", 10) || 0), reserved_stock: 0 },
    { onConflict: "sku" },
  );

  auditLog(session, "product.create", { name: name.trim(), slug: cleanSlug, status: "draft", categoryPaths: placements.categoryPaths, rails: placements.rails });
  revalidatePath("/admin/products/");
  redirect(`/admin/products/${cleanSlug}/?created=1`);
}
