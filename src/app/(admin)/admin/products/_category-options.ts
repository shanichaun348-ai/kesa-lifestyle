import "server-only";

import { getCatalogRepository } from "@/modules/catalog/queries";

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
