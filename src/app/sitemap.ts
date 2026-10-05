import type { MetadataRoute } from "next";

import { countInScope, getCatalogRepository, getCollections } from "@/modules/catalog/queries";
import { absoluteUrl } from "@/lib/site";

/**
 * Only SEO-approved landing pages: categories, collections with ≥ 3 products,
 * active products, and the static pages that exist. No facet URLs, ever.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getCatalogRepository();
  const [categories, collections, products] = await Promise.all([repo.getCategories(), getCollections(), repo.getAllActiveProducts()]);

  const collectionEntries = (
    await Promise.all(
      collections.map(async (c) => ({ c, count: await countInScope({ kind: "collection", slug: c.slug }) })),
    )
  ).filter(({ count }) => count >= 3);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/collections/"), changeFrequency: "weekly", priority: 0.6 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/${c.path}/`),
      changeFrequency: "weekly" as const,
      priority: c.parentPath === null ? 0.9 : 0.8,
    })),
    ...collectionEntries.map(({ c }) => ({
      url: absoluteUrl(`/collections/${c.slug}/`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}/`),
      lastModified: new Date(p.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.map((i) => absoluteUrl(i.src)),
    })),
  ];
}
