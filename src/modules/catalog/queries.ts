import "server-only";

import { DemoCatalogRepository } from "./demo-repository";
import type { CatalogRepository } from "./repository";
import type { Category, Collection, ListingScope, Product } from "./types";

/**
 * Server-only entry points used by routes. Everything goes through the
 * repository so the demo → Postgres switch happens in one place.
 */

let repository: CatalogRepository | null = null;

export function getCatalogRepository(): CatalogRepository {
  // Phase 1: return new PostgresCatalogRepository(db) when DATABASE_URL is set.
  repository ??= new DemoCatalogRepository();
  return repository;
}

export async function getCategoryTree(): Promise<{ roots: Category[]; childrenOf: (path: string) => Category[] }> {
  const all = await getCatalogRepository().getCategories();
  return {
    roots: all.filter((c) => c.parentPath === null),
    childrenOf: (path) => all.filter((c) => c.parentPath === path),
  };
}

export async function getCategoryByPath(path: string): Promise<Category | null> {
  return getCatalogRepository().getCategoryByPath(path);
}

export async function getCollections(): Promise<Collection[]> {
  return getCatalogRepository().getCollections();
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return getCatalogRepository().getCollectionBySlug(slug);
}

export async function countInScope(scope: ListingScope): Promise<number> {
  return (await getCatalogRepository().getScopeCandidates(scope)).length;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return getCatalogRepository().getProductBySlug(slug);
}

/** Family siblings for a set of products, keyed by product slug (one pass). */
export async function siblingsFor(products: Product[]): Promise<Map<string, Product[]>> {
  const repo = getCatalogRepository();
  const map = new Map<string, Product[]>();
  await Promise.all(
    products.map(async (p) => {
      if (p.familyId) map.set(p.slug, await repo.getFamilySiblings(p));
    }),
  );
  return map;
}
