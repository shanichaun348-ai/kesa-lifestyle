import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { ARTICLE_TYPES } from "@/modules/journal/types";
import { getAllArticles, getArticlesByType } from "@/modules/journal/repository";

const BASE_META = {
  title: { absolute: "Journal | Kesa Lifestyle" },
  description:
    "Jewellery styling guides, care advice, buying guides and gift ideas from the Kesa Lifestyle team.",
  alternates: { canonical: "/journal/" },
} as const satisfies Omit<Metadata, "robots">;

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { type } = await searchParams;
  const filtered = type !== undefined && ARTICLE_TYPES.some((t) => t === type);
  return {
    ...BASE_META,
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function JournalIndexPage({ searchParams }: Props) {
  const { type } = await searchParams;

  const activeType = ARTICLE_TYPES.find((t) => t === type) ?? null;
  const articles = activeType ? getArticlesByType(activeType) : getAllArticles();

  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />

      <header className="mt-6 mb-8">
        <h1 className="type-h1">Journal</h1>
        <p className="mt-3 max-w-xl type-body text-ink-muted">
          Jewellery styling, care and buying — practical guidance for Indian wardrobes.
        </p>
      </header>

      {/* Type filter tabs */}
      <nav aria-label="Filter by article type" className="mb-8 -mx-1">
        <ul className="flex flex-wrap gap-2 px-1">
          <li>
            <Link
              href="/journal/"
              className={`inline-flex h-8 items-center rounded-full px-4 type-small transition-colors ${
                !activeType
                  ? "bg-ink text-surface"
                  : "border border-line bg-surface text-ink hover:bg-surface-muted"
              }`}
              aria-current={!activeType ? "page" : undefined}
            >
              All
            </Link>
          </li>
          {ARTICLE_TYPES.map((t) => (
            <li key={t}>
              <Link
                href={`/journal/?type=${encodeURIComponent(t)}`}
                className={`inline-flex h-8 items-center rounded-full px-4 type-small transition-colors ${
                  activeType === t
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-ink hover:bg-surface-muted"
                }`}
                aria-current={activeType === t ? "page" : undefined}
              >
                {t}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {articles.length === 0 ? (
        <p className="type-body text-ink-muted py-12 text-center">
          No articles in this category yet.
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <article className="group flex h-full flex-col rounded-md border border-line bg-surface overflow-hidden">
                <div className="aspect-[16/9] w-full overflow-hidden bg-surface-muted">
                  <Image
                    src={article.image.src}
                    alt={article.image.alt}
                    width={800}
                    height={450}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    {...(article.image.unoptimized ? { unoptimized: true } : {})}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="type-eyebrow text-brand">{article.type}</p>
                  <h2 className="type-h3">
                    <Link
                      href={`/journal/${article.slug}/`}
                      className="hover:text-brand transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="type-small text-ink-muted line-clamp-3">{article.excerpt}</p>

                  {/* Tags */}
                  {article.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5 mt-1" aria-label="Tags">
                      {article.tags.slice(0, 3).map((tag) => (
                        <li
                          key={tag}
                          className="inline-flex items-center rounded-sm bg-surface-muted px-2 py-0.5 type-small text-ink-subtle"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <time className="type-small text-ink-subtle" dateTime={article.publishedAt}>
                      {new Date(article.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <span className="type-small text-ink-subtle">
                      {article.readingMinutes} min read
                    </span>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

