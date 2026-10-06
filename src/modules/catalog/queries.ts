import "server-only";

import { DemoCatalogRepository } from "./demo-repository";
import { SupabaseCatalogRepository } from "./supabase-repository";
import type { CatalogRepository } from "./repository";
import type { Category, Collection, ListingScope, Product } from "./types";

/**
 * Server-only entry points used by routes. Everything goes through the
 * repository so the demo → Supabase switch happens in one place.
 *
 * Selection rules (evaluated in order):
 *   1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY both set → SupabaseCatalogRepository.
 *   2. NODE_ENV === "production" without Supabase config → throw (fail closed).
 *   3. Otherwise (development / test) → DemoCatalogRepository.
 *
 * Production must NEVER resolve to DemoCatalogRepository.
 * See docs/PRODUCTION_CONFIGURATION.md.
 */

let repository: CatalogRepository | null = null;

/** Reset the cached repository instance. ONLY for use in tests. */
export function _resetCatalogRepositoryForTesting(): void {
  repository = null;
}

export function getCatalogRepository(): CatalogRepository {
  if (repository) return repository;

  const supabaseConfigured = !!(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (supabaseConfigured) {
    repository = new SupabaseCatalogRepository();
    return repository;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PRODUCTION STARTUP FAILURE: CATALOG REPOSITORY MISCONFIGURED.\n" +
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in production.\n" +
        "The application must never fall back to the in-memory DemoCatalogRepository in production.\n" +
        "Set the missing variables and redeploy. See docs/PRODUCTION_CONFIGURATION.md",
    );
  }

  // Development / test only — the production guard above prevents reaching this line in prod.
  repository = new DemoCatalogRepository();
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
