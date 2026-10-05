"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";

export type ProductEditState = { error: string } | { success: string } | null;

export async function updateProduct(id: string, prevState: ProductEditState, formData: FormData): Promise<ProductEditState> {
  const session = await requireAdmin("products:write");

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return { error: "Product name is required." };

  auditLog(session, "product.update", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
  // Demo: no real DB write
  return { success: "Product updated (demo — changes not persisted)." };
}

export async function publishProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:write");
  auditLog(session, "product.publish", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
}

export async function unpublishProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:write");
  auditLog(session, "product.unpublish", { productId: id });
  revalidatePath("/admin/products/");
  revalidatePath(`/admin/products/${id}/`);
}

export async function archiveProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  auditLog(session, "product.archive", { productId: id });
  revalidatePath("/admin/products/");
  redirect("/admin/products/");
}

export async function deleteProduct(id: string): Promise<void> {
  const session = await requireAdmin("products:delete");
  auditLog(session, "product.delete", { productId: id });
  revalidatePath("/admin/products/");
  redirect("/admin/products/");
}
