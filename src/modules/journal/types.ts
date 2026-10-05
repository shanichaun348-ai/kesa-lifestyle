import type { ImageRef } from "@/modules/catalog/types";

export type ArticleType =
  | "Jewellery Guides"
  | "Styling Guides"
  | "Buying Guides"
  | "Gift Guides"
  | "Jewellery Care"
  | "Fashion Trends"
  | "Occasion Guides";

export const ARTICLE_TYPES: ArticleType[] = [
  "Jewellery Guides",
  "Styling Guides",
  "Buying Guides",
  "Gift Guides",
  "Jewellery Care",
  "Fashion Trends",
  "Occasion Guides",
];

export type Author = {
  name: string;
  bio: string;
};

export type ContentSection = {
  heading?: string;
  paragraphs: string[];
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  type: ArticleType;
  tags: string[];
  author: Author;
  publishedAt: string;
  updatedAt?: string | undefined;
  readingMinutes: number;
  image: ImageRef;
  body: ContentSection[];
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  relatedProductSlugs: string[];
  relatedCategoryPaths: string[];
  relatedArticleSlugs: string[];
};
