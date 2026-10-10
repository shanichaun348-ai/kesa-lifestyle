"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { homeLookSchema, MAX_LOOK_PRODUCTS } from "@/modules/content/home-look";
import { saveHomeLook } from "@/modules/content/home-look-server";

export type HomeLookState = { error: string } | { success: string } | null;

/**
 * Saves which pieces appear beside the "Shop the look" photo. Only live
 * products can be chosen, in the order they were listed in the form.
 */
export async function updateHomeLook(_prev: HomeLookState, formData: FormData): Promise<HomeLookState> {
  const session = await requireAdmin("content:write");

  const slugs = formData.getAll("slug").filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
  const href = String(formData.get("href") ?? "").trim() || "/collections/new-arrivals/";

  const parsed = homeLookSchema.safeParse({ productSlugs: [...new Set(slugs)], href });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  if (parsed.data.productSlugs.length > MAX_LOOK_PRODUCTS) return { error: `Choose at most ${MAX_LOOK_PRODUCTS} pieces.` };

  if (parsed.data.productSlugs.length > 0) {
    const live = new Set((await getCatalogRepository().getProductsBySlugs(parsed.data.productSlugs)).map((p) => p.slug));
    const missing = parsed.data.productSlugs.filter((s) => !live.has(s));
    if (missing.length > 0) return { error: `Not published, so it cannot be shown: ${missing.join(", ")}. Publish it first or remove it from the look.` };
  }

  const result = await saveHomeLook(parsed.data);
  if (!result.ok) return { error: result.error.message };

  auditLog(session, "content.update", { key: "home.look", productSlugs: parsed.data.productSlugs, href: parsed.data.href });
  revalidatePath("/");
  revalidatePath("/admin/content/homepage/");
  const n = parsed.data.productSlugs.length;
  return { success: n === 0 ? "Saved. The newest live pieces will be shown until you choose some." : `Saved. ${n} ${n === 1 ? "piece is" : "pieces are"} shown beside the photo.` };
}
