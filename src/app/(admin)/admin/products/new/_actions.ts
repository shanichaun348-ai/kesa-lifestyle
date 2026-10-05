"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";

export type ProductFormState = { error: string } | { success: string } | null;

export async function createProduct(prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requireAdmin("products:write");

  const name = formData.get("name");
  const slug = formData.get("slug");
  const status = formData.get("status");

  if (typeof name !== "string" || !name.trim()) return { error: "Product name is required." };
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug.trim())) return { error: "Slug must be lowercase letters, numbers and hyphens only." };

  auditLog(session, "product.create", { name, slug, status });

  // Demo mode: no real persistence. Supabase CatalogRepository will handle this (Phase 1).
  revalidatePath("/admin/products/");
  redirect("/admin/products/");
}
