import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { ProductRail } from "@/components/storefront/product-rail";
import { SectionHeading } from "@/components/storefront/section-heading";
import { toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { getAllArticles, getArticleBySlug, getRelatedArticles } from "@/modules/journal/repository";
import { articleMetadata } from "@/modules/seo/metadata";
import { articleJsonLd, breadcrumbListJsonLd } from "@/modules/seo/structured-data";
import { absoluteUrl } from "@/lib/site";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return articleMetadata({
    title: article.title,
    excerpt: article.excerpt,
    path: `/journal/${slug}/`,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    imageUrl: absoluteUrl(article.image.src),
  });
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const repo = getCatalogRepository();
  const cardWithSiblings = async (p: Product) =>
    toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) });

  const [relatedProducts, relatedArticles] = await Promise.all([
    repo
      .getProductsBySlugs(article.relatedProductSlugs)
      .then((ps) => Promise.all(ps.map(cardWithSiblings))),
    Promise.resolve(getRelatedArticles(article.relatedArticleSlugs)),
  ]);

  const path = `/journal/${slug}/`;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Journal", href: "/journal/" },
    { label: article.title },
  ];

  const jsonLd = [
    breadcrumbListJsonLd(breadcrumbs.map((b) => ({ name: b.label, path: b.href ?? path }))),
    articleJsonLd({
      headline: article.title,
      description: article.excerpt,
      path,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      imageUrl: absoluteUrl(article.image.src),
      authorName: article.author.name,
    }),
  ];

  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
        {/* Main content */}
        <article aria-labelledby="article-title">
          {/* Header */}
          <header className="mb-8">
            <Link
              href={`/journal/?type=${encodeURIComponent(article.type)}`}
              className="type-eyebrow text-brand hover:underline mb-2 inline-block"
            >
              {article.type}
            </Link>
            <h1 id="article-title" className="type-h1 text-wrap-balance">
              {article.title}
            </h1>
            <p className="mt-3 type-body text-ink-muted">{article.excerpt}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 type-small text-ink-subtle">
              <span>{article.author.name}</span>
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              {article.updatedAt ? (
                <span>
                  Updated{" "}
                  <time dateTime={article.updatedAt}>
                    {new Date(article.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </span>
              ) : null}
              <span aria-label={`${article.readingMinutes} minute read`}>
                {article.readingMinutes} min read
              </span>
            </div>
          </header>

          {/* Featured image */}
          <div className="aspect-[16/9] w-full overflow-hidden rounded-md bg-surface-muted mb-8">
            <Image
              src={article.image.src}
              alt={article.image.alt}
              width={1200}
              height={675}
              className="h-full w-full object-cover"
              priority
              {...(article.image.unoptimized ? { unoptimized: true } : {})}
            />
          </div>

          {/* Body */}
          <div className="space-y-6 type-body text-ink">
            {article.body.map((section, i) => (
              <section key={i}>
                {section.heading ? (
                  <h2 className="type-h3 mt-10 mb-3 text-ink">{section.heading}</h2>
                ) : null}
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-ink-muted leading-relaxed mb-3 last:mb-0">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {/* Tags */}
          {article.tags.length > 0 ? (
            <div className="mt-10 pt-6 border-t border-line">
              <p className="type-small text-ink-subtle uppercase tracking-wider mb-3">Tags</p>
              <ul className="flex flex-wrap gap-2" aria-label="Article tags">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-flex items-center rounded-sm border border-line bg-surface px-3 py-1 type-small text-ink-muted">
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Author bio */}
          <div className="mt-8 rounded-md border border-line bg-surface-muted p-5">
            <p className="type-small font-medium text-ink">{article.author.name}</p>
            <p className="mt-1 type-small text-ink-muted">{article.author.bio}</p>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="mt-12 lg:mt-0 space-y-8">
          {/* Related categories */}
          {article.relatedCategoryPaths.length > 0 ? (
            <div>
              <p className="type-small text-ink-subtle uppercase tracking-wider mb-3">
                Shop by category
              </p>
              <ul className="flex flex-col gap-2">
                {article.relatedCategoryPaths.map((catPath) => (
                  <li key={catPath}>
                    <Link
                      href={`/${catPath}/`}
                      className="flex items-center justify-between rounded-sm border border-line bg-surface px-4 py-2.5 type-small text-ink hover:bg-surface-muted hover:border-ink-muted transition-colors"
                    >
                      <span>
                        {catPath
                          .split("/")
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(" › ")}
                      </span>
                      <span aria-hidden="true" className="text-ink-subtle">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Related articles */}
          {relatedArticles.length > 0 ? (
            <div>
              <p className="type-small text-ink-subtle uppercase tracking-wider mb-3">
                Also read
              </p>
              <ul className="flex flex-col gap-3">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/journal/${a.slug}/`}
                      className="group flex gap-3 rounded-md border border-line bg-surface p-3 hover:border-ink-muted hover:shadow-(--shadow-float) transition-all"
                    >
                      <div className="shrink-0 w-16 h-16 rounded overflow-hidden bg-surface-muted">
                        <Image
                          src={a.image.src}
                          alt={a.image.alt}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          {...(a.image.unoptimized ? { unoptimized: true } : {})}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="type-eyebrow text-brand mb-0.5">{a.type}</p>
                        <p className="type-small text-ink line-clamp-2 leading-snug group-hover:text-brand transition-colors">
                          {a.title}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Related products rail */}
      {relatedProducts.length > 0 ? (
        <section className="mt-16" aria-labelledby="shop-title">
          <SectionHeading
            eyebrow="Shop this"
            title="Featured pieces"
            description="Products referenced in this article."
            className="mb-6"
          />
          <ProductRail label="Featured products" products={relatedProducts} />
        </section>
      ) : null}
    </Container>
  );
}
