import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";

import { isInStock, matchesFilters, runListing, sortProducts } from "./listing";
import type { CatalogRepository } from "./repository";
import { seedAttributes, seedCategories, seedCollections } from "@/lib/demo/seed-catalog";
import type {
  AttributeDefinition,
  Category,
  Collection,
  ImageRef,
  ListingParams,
  ListingResult,
  ListingScope,
  Product,
  ProductVariant,
  SortKey,
} from "./types";

// ── Raw DB rows ───────────────────────────────────────────────────────────────

type CatProductRow = {
  id: string;
  slug: string;
  name: string;
  gender: string;
  status: string;
  primary_category_path: string;
  category_paths: string[];
  tags: string[];
  family_id: string | null;
  family_option_label: string | null;
  option_name: string | null;
  attributes: Record<string, string[]>;
  short_description: string;
  description: string[];
  highlights: string[];
  styling_tips: string[];
  care: string;
  weight_grams: number | null;
  dimensions: string | null;
  hsn_code: string;
  gst_rate_bp: number;
  return_policy: string;
  low_stock_threshold: number;
  complete_the_look_slugs: string[];
  faq: Array<{ question: string; answer: string }>;
  discontinued_redirect_path: string | null;
  images: ImageRef[];
  published_at: string | null;
  archived_at: string | null;
  sales_30d: number;
  sort_weight: number;
  cat_variants: CatVariantRow[];
};

type CatVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  option_value: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  position: number;
};

type InventoryRow = {
  sku: string;
  available_stock: number;
};

// ── Mapper ────────────────────────────────────────────────────────────────────

function toProduct(row: CatProductRow, inventory: Map<string, number>): Product {
  const variants: ProductVariant[] = row.cat_variants
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      sku: v.sku,
      ...(v.option_value !== null && { optionValue: v.option_value }),
      pricePaise: v.price_paise,
      ...(v.compare_at_paise !== null && { compareAtPaise: v.compare_at_paise }),
      stock: inventory.get(v.sku) ?? 0,
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    gender: row.gender as Product["gender"],
    status: row.status as Product["status"],
    primaryCategoryPath: row.primary_category_path,
    categoryPaths: row.category_paths,
    tags: row.tags,
    ...(row.family_id && { familyId: row.family_id }),
    ...(row.family_option_label && { familyOptionLabel: row.family_option_label }),
    ...(row.option_name && { optionName: row.option_name as Product["optionName"] }),
    attributes: row.attributes,
    variants,
    images: row.images,
    shortDescription: row.short_description,
    description: row.description,
    highlights: row.highlights,
    stylingTips: row.styling_tips,
    care: row.care,
    ...(row.weight_grams !== null && { weightGrams: row.weight_grams }),
    ...(row.dimensions !== null && { dimensions: row.dimensions }),
    hsnCode: row.hsn_code,
    gstRateBp: row.gst_rate_bp,
    returnPolicy: row.return_policy as Product["returnPolicy"],
    lowStockThreshold: row.low_stock_threshold,
    completeTheLookSlugs: row.complete_the_look_slugs,
    faq: row.faq,
    ...(row.discontinued_redirect_path !== null && {
      discontinuedRedirectPath: row.discontinued_redirect_path,
    }),
    publishedAt: row.published_at ?? new Date(0).toISOString(),
    sales30d: row.sales_30d,
    sortWeight: row.sort_weight,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchAllWithInventory(): Promise<Product[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("cat_products")
    .select("*, cat_variants(*)")
    .order("sort_weight", { ascending: false });

  if (error) throw new Error(`SupabaseCatalogRepository: failed to fetch products: ${error.message}`);
  if (!data || data.length === 0) return [];

  const allSkus = (data as CatProductRow[]).flatMap((p) =>
    p.cat_variants.map((v) => v.sku),
  );
  const inventory = await fetchInventory(allSkus);

  return (data as CatProductRow[]).map((row) => toProduct(row, inventory));
}

async function fetchInventory(skus: string[]): Promise<Map<string, number>> {
  if (skus.length === 0) return new Map();
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("product_variants")
    .select("sku, available_stock")
    .in("sku", skus);

  if (error) throw new Error(`SupabaseCatalogRepository: failed to fetch inventory: ${error.message}`);
  const map = new Map<string, number>();
  for (const row of (data ?? []) as InventoryRow[]) {
    map.set(row.sku, row.available_stock);
  }
  return map;
}

// ── Repository ────────────────────────────────────────────────────────────────

/**
 * Production CatalogRepository backed by Supabase.
 *
 * Products and variants are read from `cat_products` + `cat_variants`.
 * Live stock is read from the inventory `product_variants` table (001 migration).
 * Categories, collections, and attributes are served from the seed data — they
 * are site configuration and do not require a separate production table today.
 */
export class SupabaseCatalogRepository implements CatalogRepository {
  // A single in-request cache avoids re-fetching on the same request.
  private _products: Product[] | null = null;

  private async allProducts(): Promise<Product[]> {
    this._products ??= await fetchAllWithInventory();
    return this._products;
  }

  private async activeProducts(): Promise<Product[]> {
    return (await this.allProducts()).filter((p) => p.status === "active");
  }

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
    const pool = await this.activeProducts();
    if (scope.kind === "category") {
      const category = await this.getCategoryByPath(scope.path);
      if (!category) return [];
      if (category.parentPath === null)
        return pool.filter((p) => p.gender === category.gender || p.gender === "unisex");
      return pool.filter((p) => p.categoryPaths.includes(category.path));
    }
    const collection = await this.getCollectionBySlug(scope.slug);
    if (!collection) return [];
    return this._collectionMembers(collection, pool);
  }

  private _collectionMembers(collection: Collection, pool: Product[]): Product[] {
    if (collection.kind === "manual") {
      const order = new Map((collection.productSlugs ?? []).map((s, i) => [s, i]));
      return pool
        .filter((p) => order.has(p.slug))
        .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
    }
    const rule = collection.rule;
    if (!rule) return [];
    const now = new Date();
    switch (rule.type) {
      case "new_arrivals": {
        const cutoff = now.getTime() - rule.withinDays * 86_400_000;
        return pool.filter((p) => new Date(p.publishedAt).getTime() >= cutoff);
      }
      case "bestsellers":
        return sortProducts(pool, "bestselling").filter(isInStock).slice(0, rule.limit);
      case "attribute":
        return pool.filter((p) =>
          (p.attributes[rule.key] ?? []).some((v) => rule.values.includes(v)),
        );
      case "price_max":
        return pool.filter(
          (p) => Math.min(...p.variants.map((v) => v.pricePaise)) <= rule.paise,
        );
    }
  }

  private async _defaultSortFor(scope: ListingScope): Promise<SortKey> {
    if (scope.kind === "collection")
      return (await this.getCollectionBySlug(scope.slug))?.defaultSort ?? "featured";
    return "featured";
  }

  async listProducts(scope: ListingScope, params: ListingParams): Promise<ListingResult | null> {
    const exists =
      scope.kind === "category"
        ? await this.getCategoryByPath(scope.path)
        : await this.getCollectionBySlug(scope.slug);
    if (!exists) return null;
    const candidates = await this.getScopeCandidates(scope);
    return runListing(candidates, params, await this._defaultSortFor(scope), seedAttributes);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return (await this.activeProducts()).find((p) => p.slug === slug) ?? null;
  }

  async getArchivedProductBySlug(slug: string): Promise<Product | null> {
    return (await this.allProducts()).find((p) => p.slug === slug && p.status === "archived") ?? null;
  }

  async getProductsBySlugs(slugs: string[]): Promise<Product[]> {
    const wanted = new Set(slugs);
    return (await this.activeProducts()).filter((p) => wanted.has(p.slug));
  }

  async getFamilySiblings(product: Product): Promise<Product[]> {
    if (!product.familyId) return [];
    return (await this.activeProducts()).filter(
      (p) => p.familyId === product.familyId && p.slug !== product.slug,
    );
  }

  async getRelatedProducts(product: Product, limit: number): Promise<Product[]> {
    const pool = (await this.activeProducts()).filter(
      (p) => p.slug !== product.slug && p.familyId !== product.familyId,
    );
    const sameCategory = pool.filter(
      (p) => p.primaryCategoryPath === product.primaryCategoryPath,
    );
    const sameOccasion = pool.filter(
      (p) =>
        !sameCategory.includes(p) &&
        matchesFilters(p, { occasion: product.attributes.occasion ?? [] }) &&
        (product.attributes.occasion?.length ?? 0) > 0,
    );
    return sortProducts([...sameCategory, ...sameOccasion], "bestselling").slice(0, limit);
  }

  async getAllActiveProducts(): Promise<Product[]> {
    return this.activeProducts();
  }

  async getAllProducts(): Promise<Product[]> {
    return this.allProducts();
  }

  async getAnyProductBySlug(slug: string): Promise<Product | null> {
    return (await this.allProducts()).find((p) => p.slug === slug) ?? null;
  }

  async getProductsBySku(
    skus: string[],
  ): Promise<Map<string, { product: Product; variant: ProductVariant }>> {
    const wanted = new Set(skus);
    const result = new Map<string, { product: Product; variant: ProductVariant }>();
    for (const product of await this.activeProducts()) {
      for (const variant of product.variants) {
        if (wanted.has(variant.sku)) {
          result.set(variant.sku, { product, variant });
          if (result.size === wanted.size) return result;
        }
      }
    }
    return result;
  }
}
