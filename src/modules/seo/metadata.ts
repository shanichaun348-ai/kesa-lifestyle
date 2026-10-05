import type { Metadata } from "next";

import type { ListingParams } from "@/modules/catalog/types";
import { hasActiveFilters, isIndexableListing } from "@/modules/catalog/facets";
import { site } from "@/lib/site";

/**
 * Metadata builders (docs/06 §1.3). Pure functions so they are unit-tested.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export function clampTitle(title: string): string {
  return title.length <= TITLE_MAX ? title : `${title.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

export function clampDescription(text: string): string {
  return text.length <= DESCRIPTION_MAX ? text : `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export type ListingMetadataInput = {
  /** Entity-specific title without suffix, e.g. "Earrings for Women". */
  baseTitle: string;
  seoTitle?: string | undefined;
  description: string;
  /** Path with trailing slash, e.g. `/women/earrings/`. */
  basePath: string;
  params: ListingParams;
  /** Deterministic canonical for the current state (self-canonical). */
  canonicalHref: string;
};

export function listingMetadata(input: ListingMetadataInput): Metadata {
  const indexable = isIndexableListing(input.params);
  const pageSuffix = input.params.page > 1 ? ` – Page ${input.params.page}` : "";
  const filteredSuffix = hasActiveFilters(input.params) ? " (filtered)" : "";
  const title = input.seoTitle ? clampTitle(`${input.seoTitle}${pageSuffix}`) : clampTitle(`${input.baseTitle}${pageSuffix}${filteredSuffix} | Kesa`);

  return {
    title: { absolute: title },
    description: clampDescription(input.description),
    alternates: { canonical: input.canonicalHref },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: "website",
      url: input.canonicalHref,
      title,
      description: clampDescription(input.description),
      siteName: site.name,
      locale: site.locale,
    },
  };
}

export type ArticleMetadataInput = {
  title: string;
  excerpt: string;
  path: string;
  imageUrl?: string | undefined;
  publishedAt: string;
};

export function articleMetadata(input: ArticleMetadataInput): Metadata {
  const title = clampTitle(`${input.title} | Kesa Lifestyle`);
  const description = clampDescription(input.excerpt);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: input.path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      url: input.path,
      title,
      description,
      siteName: site.name,
      locale: site.locale,
      publishedTime: input.publishedAt,
      ...(input.imageUrl ? { images: [{ url: input.imageUrl, alt: input.title }] } : {}),
    },
  };
}

export type OccasionMetadataInput = {
  seoTitle: string;
  seoDescription: string;
  path: string;
};

export function occasionMetadata(input: OccasionMetadataInput): Metadata {
  const title = clampTitle(input.seoTitle);
  const description = clampDescription(input.seoDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: input.path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: input.path,
      title,
      description,
      siteName: site.name,
      locale: site.locale,
    },
  };
}

export type ProductMetadataInput = {
  name: string;
  shortDescription: string;
  finishLabel?: string | undefined;
  /** Canonical product path, always without `?variant=`. */
  path: string;
  imageUrl?: string | undefined;
  pricePaise: number;
};

/**
 * Product title is `{name} | Kesa Lifestyle`. Names are unique per product
 * (finish siblings carry the finish in their name), so titles are unique.
 */
export function productMetadata(input: ProductMetadataInput): Metadata {
  const title = clampTitle(`${input.name} | Kesa Lifestyle`);
  const description = clampDescription(
    `${input.shortDescription} Anti-tarnish, skin-friendly${input.finishLabel ? `, ${input.finishLabel}` : ""}. Free shipping over ₹999.`,
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: input.path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: input.path,
      title,
      description,
      siteName: site.name,
      locale: site.locale,
      images: input.imageUrl ? [{ url: input.imageUrl, alt: input.name }] : undefined,
    },
    other: {
      "product:price:amount": (input.pricePaise / 100).toFixed(2),
      "product:price:currency": "INR",
    },
  };
}
