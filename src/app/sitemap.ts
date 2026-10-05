import type { MetadataRoute } from "next";

import { countInScope, getCatalogRepository, getCollections } from "@/modules/catalog/queries";
import { absoluteUrl } from "@/lib/site";
import { seedJournalArticles } from "@/lib/demo/seed-journal";
import { seedStyleGuides } from "@/lib/demo/seed-style-guides";
import { seedOccasionPages } from "@/lib/demo/seed-occasion";

/**
 * Only SEO-approved landing pages: categories, collections with ≥ 3 products,
 * active products, editorial content, and policy pages. No facet URLs, ever.
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
    { url: absoluteUrl("/journal/"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/style-guides/"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/occasion/"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/returns-policy/"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/shipping-policy/"), changeFrequency: "monthly", priority: 0.3 },
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
    ...seedOccasionPages.map((p) => ({
      url: absoluteUrl(`/occasion/${p.slug}/`),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...seedStyleGuides.map((g) => ({
      url: absoluteUrl(`/style-guides/${g.slug}/`),
      lastModified: new Date(g.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    ...seedJournalArticles.map((a) => ({
      url: absoluteUrl(`/journal/${a.slug}/`),
      lastModified: new Date(a.publishedAt),
      changeFrequency: "never" as const,
      priority: 0.6,
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
