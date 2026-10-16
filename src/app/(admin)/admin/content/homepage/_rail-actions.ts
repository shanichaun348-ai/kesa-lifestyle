"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { HOME_RAILS, isHomeRail } from "@/modules/content/home-placements";

export type HomeRailState = { error: string } | { success: string } | null;

const SLUG = /^[a-z0-9-]{1,120}$/;

/**
 * Saves which products are shown in the homepage "New arrivals" or
 * "Bestsellers" row. The choice is kept as a hidden tag on each product
 * (the same tag the product form's tick box sets), so this screen and the
 * product form always agree. Only published products can be chosen.
 */
export async function updateHomeRail(_prev: HomeRailState, formData: FormData): Promise<HomeRailState> {
  const session = await requireAdmin("content:write");

  const rail = String(formData.get("rail") ?? "");
  if (!isHomeRail(rail)) return { error: "Unknown homepage row." };
  const tag = HOME_RAILS[rail].tag;

  const slugs = [...new Set(formData.getAll("slug").filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean))];
  if (slugs.some((s) => !SLUG.test(s))) return { error: "One of the chosen products is not valid." };

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("cat_products")
    .select("slug, status, tags")
    .or(`tags.cs.{"${tag}"},slug.in.(${slugs.join(",") || "__none__"})`);
  if (error) return { error: `Could not read the products: ${error.message}` };
  const rows = (data ?? []) as Array<{ slug: string; status: string; tags: string[] | null }>;

  const notLive = slugs.filter((s) => rows.find((r) => r.slug === s)?.status !== "active");
  if (notLive.length > 0) return { error: `Not published, so it cannot be shown: ${notLive.join(", ")}. Publish it first or remove it.` };

  const wanted = new Set(slugs);
  let changed = 0;
  for (const row of rows) {
    const tags = row.tags ?? [];
    const has = tags.includes(tag);
    const want = wanted.has(row.slug);
    if (has === want) continue;
    const next = want ? [...tags, tag] : tags.filter((t) => t !== tag);
    const { error: updateError } = await db.from("cat_products").update({ tags: next, updated_at: new Date().toISOString() }).eq("slug", row.slug);
    if (updateError) return { error: `Could not save ${row.slug}: ${updateError.message}` };
    changed += 1;
  }

  auditLog(session, "content.update", { key: `home.rail.${rail}`, productSlugs: slugs, changed });
  revalidatePath("/");
  revalidatePath("/admin/products/");
  revalidatePath("/admin/content/homepage/");
  return {
    success:
      slugs.length === 0
        ? `Saved. ${HOME_RAILS[rail].label} fills itself automatically until you choose some.`
        : `Saved. ${slugs.length === 1 ? "The piece you chose is" : `The ${slugs.length} pieces you chose are`} always shown first in ${HOME_RAILS[rail].label}; the rest of the row fills itself.`,
  };
}
