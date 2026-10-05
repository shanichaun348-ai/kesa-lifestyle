/**
 * In-memory CatalogRepository over the demo seed. Deterministic and
 * synchronous under the hood, async in signature so the Postgres version is
 * a drop-in. Not for production data.
 */
import { seedAttributes, seedCategories, seedCollections, seedProducts, SEED_NOW } from "@/lib/demo/seed-catalog";

import { isInStock, matchesFilters, runListing, sortProducts } from "./listing";
import type { CatalogRepository } from "./repository";
import type {
  AttributeDefinition,
  Category,
  Collection,
  ListingParams,
  ListingResult,
  ListingScope,
  Product,
  SortKey,
} from "./types";

function activeProducts(): Product[] {
  return seedProducts.filter((p) => p.status === "active");
}

function collectionMembers(collection: Collection, pool: Product[], now: Date): Product[] {
  if (collection.kind === "manual") {
    const order = new Map((collection.productSlugs ?? []).map((s, i) => [s, i]));
    return pool.filter((p) => order.has(p.slug)).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  }
  const rule = collection.rule;
  if (!rule) return [];
  switch (rule.type) {
    case "new_arrivals": {
      const cutoff = now.getTime() - rule.withinDays * 86_400_000;
      return pool.filter((p) => new Date(p.publishedAt).getTime() >= cutoff);
    }
    case "bestsellers":
      return sortProducts(pool, "bestselling").filter(isInStock).slice(0, rule.limit);
    case "attribute":
      return pool.filter((p) => (p.attributes[rule.key] ?? []).some((v) => rule.values.includes(v)));
    case "price_max":
      return pool.filter((p) => Math.min(...p.variants.map((v) => v.pricePaise)) <= rule.paise);
  }
}

export class DemoCatalogRepository implements CatalogRepository {
  constructor(private readonly now: Date = SEED_NOW) {}

  async getAttributes(): Promise<AttributeDefinition[]> {
    return seedAttributes;
  }

  async getCategories(): Promise<Category[]> {
    return seedCategories.filter((c) => c.isVisible).sort((a, b) => a.position - b.position);
  }

  async getCategoryByPath(path: string): Promise<Category | null> {
    return seedCategories.find((c) => c.path === path && c.isVisible) ?? null;
  }

  async getCollections(): Promise<Collection[]> {
    return seedCollections.filter((c) => c.isVisible).sort((a, b) => a.position - b.position);
  }

  async getCollectionBySlug(slug: string): Promise<Collection | null> {
    return seedCollections.find((c) => c.slug === slug && c.isVisible) ?? null;
  }

  async getScopeCandidates(scope: ListingScope): Promise<Product[]> {
    const pool = activeProducts();
    if (scope.kind === "category") {
      const category = await this.getCategoryByPath(scope.path);
      if (!category) return [];
      if (category.parentPath === null) return pool.filter((p) => p.gender === category.gender || p.gender === "unisex");
      return pool.filter((p) => p.categoryPaths.includes(category.path));
    }
    const collection = await this.getCollectionBySlug(scope.slug);
    return collection ? collectionMembers(collection, pool, this.now) : [];
  }

  private async defaultSortFor(scope: ListingScope): Promise<SortKey> {
    if (scope.kind === "collection") return (await this.getCollectionBySlug(scope.slug))?.defaultSort ?? "featured";
    return "featured";
  }

  async listProducts(scope: ListingScope, params: ListingParams): Promise<ListingResult | null> {
    const exists =
      scope.kind === "category" ? await this.getCategoryByPath(scope.path) : await this.getCollectionBySlug(scope.slug);
    if (!exists) return null;
    const candidates = await this.getScopeCandidates(scope);
    return runListing(candidates, params, await this.defaultSortFor(scope), seedAttributes);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return activeProducts().find((p) => p.slug === slug) ?? null;
  }

  async getArchivedProductBySlug(slug: string): Promise<Product | null> {
    return seedProducts.find((p) => p.slug === slug && p.status === "archived") ?? null;
  }

  async getProductsBySlugs(slugs: string[]): Promise<Product[]> {
    const wanted = new Set(slugs);
    return activeProducts().filter((p) => wanted.has(p.slug));
  }

  async getFamilySiblings(product: Product): Promise<Product[]> {
    if (!product.familyId) return [];
    return activeProducts().filter((p) => p.familyId === product.familyId && p.slug !== product.slug);
  }

  async getRelatedProducts(product: Product, limit: number): Promise<Product[]> {
    const pool = activeProducts().filter((p) => p.slug !== product.slug && p.familyId !== product.familyId);
    const sameCategory = pool.filter((p) => p.primaryCategoryPath === product.primaryCategoryPath);
    const sameOccasion = pool.filter(
      (p) =>
        !sameCategory.includes(p) &&
        matchesFilters(p, { occasion: product.attributes.occasion ?? [] }) &&
        (product.attributes.occasion?.length ?? 0) > 0,
    );
    return sortProducts([...sameCategory, ...sameOccasion], "bestselling").slice(0, limit);
  }

  async getAllActiveProducts(): Promise<Product[]> {
    return activeProducts();
  }
}
