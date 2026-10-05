import type {
  AttributeDefinition,
  Category,
  Collection,
  ListingParams,
  ListingResult,
  ListingScope,
  Product,
} from "./types";

/**
 * Data-access contract for the catalogue. The storefront only talks to this
 * interface. Today the only implementation is the in-memory demo repository
 * over seed data; Phase 1 adds the Drizzle/Postgres implementation and
 * `getCatalogRepository()` switches on configuration.
 */
export interface CatalogRepository {
  getAttributes(): Promise<AttributeDefinition[]>;
  getCategories(): Promise<Category[]>;
  getCategoryByPath(path: string): Promise<Category | null>;
  getCollections(): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | null>;
  /** Products eligible for a scope before filters (active + visible only). */
  getScopeCandidates(scope: ListingScope): Promise<Product[]>;
  listProducts(scope: ListingScope, params: ListingParams): Promise<ListingResult | null>;
  getProductBySlug(slug: string): Promise<Product | null>;
  /** Archived (discontinued) products, so routes can redirect instead of 404. */
  getArchivedProductBySlug(slug: string): Promise<Product | null>;
  getProductsBySlugs(slugs: string[]): Promise<Product[]>;
  getFamilySiblings(product: Product): Promise<Product[]>;
  getRelatedProducts(product: Product, limit: number): Promise<Product[]>;
  getAllActiveProducts(): Promise<Product[]>;
}
