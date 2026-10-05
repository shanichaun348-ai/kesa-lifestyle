import type { Article, ArticleType } from "./types";
import { journalArticles } from "./seed";

export function getAllArticles(): Article[] {
  return [...journalArticles].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function getArticleBySlug(slug: string): Article | null {
  return journalArticles.find((a) => a.slug === slug) ?? null;
}

export function getArticlesByType(type: ArticleType): Article[] {
  return getAllArticles().filter((a) => a.type === type);
}

export function getRelatedArticles(slugs: string[]): Article[] {
  return slugs
    .map((s) => getArticleBySlug(s))
    .filter((a): a is Article => a !== null);
}
