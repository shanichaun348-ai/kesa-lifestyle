import "server-only";

import { getCatalogRepository } from "@/modules/catalog/queries";
import { isHomeRail, type RailFlags } from "@/modules/content/home-placements";

export type CategoryOption = { path: string; label: string; gender: "women" | "men" };

/** Leaf categories the admin can assign a product to, labelled "Women › Earrings". */
export async function categoryOptions(): Promise<CategoryOption[]> {
  const all = await getCatalogRepository().getCategories();
  const rootName = new Map(all.filter((c) => c.parentPath === null).map((c) => [c.path, c.name]));
  return all
    .filter((c) => c.parentPath !== null)
    .map((c) => ({ path: c.path, label: `${rootName.get(c.parentPath!) ?? c.gender} › ${c.name}`, gender: c.gender }));
}

export const SKU_PATTERN = /^[A-Za-z0-9._-]{2,40}$/;

export function rupeesToPaise(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export type Placements = { categoryPaths: string[]; rails: RailFlags };

/**
 * "Where this product shows" from the product forms: the main category first,
 * then any extra categories ticked (only real ones for the product's gender),
 * and which homepage rails the piece is pinned to.
 */
export function readPlacements(formData: FormData, categories: CategoryOption[], primary: CategoryOption, gender: string): Placements | { error: string } {
  const extra = formData.getAll("categoryPaths").filter((v): v is string => typeof v === "string");
  const paths = [primary.path];
  for (const path of extra) {
    if (path === primary.path) continue;
    const option = categories.find((c) => c.path === path);
    if (!option) return { error: `"${path}" is not a category.` };
    if (gender !== "unisex" && option.gender !== gender) return { error: `${option.label} is not a ${gender}'s category.` };
    if (!paths.includes(path)) paths.push(path);
  }
  const rails = formData.getAll("homeRail").filter(isHomeRail);
  return { categoryPaths: paths, rails: { newArrivals: rails.includes("newArrivals"), bestsellers: rails.includes("bestsellers") } };
}
