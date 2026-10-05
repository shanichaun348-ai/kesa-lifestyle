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
import { articleMetadata } from "@/modules/seo/metadata";
import { articleJsonLd, breadcrumbListJsonLd } from "@/modules/seo/structured-data";
import { absoluteUrl } from "@/lib/site";
import { SEED_NOW } from "@/lib/demo/seed-catalog";
import { seedJournalArticles, getJournalArticleBySlug } from "@/lib/demo/seed-journal";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return seedJournalArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getJournalArticleBySlug(slug);
  if (!article) return {};
  return articleMetadata({
    title: article.title,
    excerpt: article.excerpt,
    path: `/journal/${slug}/`,
    publishedAt: article.publishedAt,
    imageUrl: absoluteUrl(article.image.src),
  });
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getJournalArticleBySlug(slug);
  if (!article) notFound();

  const repo = getCatalogRepository();
  const relatedProducts = await repo.getProductsBySlugs(article.relatedProductSlugs);
  const cardWithSiblings = async (p: Product) =>
    toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) });
  const relatedCards = await Promise.all(relatedProducts.map(cardWithSiblings));

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
      imageUrl: absoluteUrl(article.image.src),
    }),
  ];

  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={breadcrumbs} />

      <article className="mt-6 max-w-2xl" aria-labelledby="article-title">
        <header className="mb-8">
          <p className="type-eyebrow text-brand mb-2">{article.category}</p>
          <h1 id="article-title" className="type-h1">{article.title}</h1>
          <p className="mt-3 type-body text-ink-muted">{article.excerpt}</p>
          <div className="mt-4 flex items-center gap-4 type-small text-ink-subtle">
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <span aria-label={`${article.readingMinutes} minute read`}>{article.readingMinutes} min read</span>
          </div>
        </header>

        <div className="aspect-[16/9] w-full overflow-hidden rounded-md bg-surface-muted mb-8">
          <Image
            src={article.image.src}
            alt={article.image.alt}
            width={1200}
            height={675}
            className="h-full w-full object-cover"
            {...(article.image.unoptimized ? { unoptimized: true } : {})}
          />
        </div>

        <div className="prose-like space-y-6 type-body text-ink">
          {article.body.map((section, i) => (
            <section key={i}>
              {section.heading ? (
                <h2 className="type-h3 mt-8 mb-3">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-ink-muted leading-relaxed mb-3">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      {relatedCards.length > 0 ? (
        <section className="mt-16" aria-labelledby="shop-title">
          <SectionHeading
            eyebrow="Shop this"
            title="Featured pieces"
            description="Pieces mentioned in this article."
            className="mb-6"
          />
          <ProductRail label="Featured products" products={relatedCards} />
        </section>
      ) : null}

      {article.relatedCategoryPaths.length > 0 ? (
        <nav className="mt-12 pt-8 border-t border-line" aria-label="Related categories">
          <p className="type-small text-ink-subtle mb-3 uppercase tracking-wider">Explore more</p>
          <ul className="flex flex-wrap gap-2">
            {article.relatedCategoryPaths.map((path) => (
              <li key={path}>
                <Link
                  href={`/${path}/`}
                  className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-4 type-small text-ink hover:bg-surface-muted transition-colors"
                >
                  {path.split("/").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" › ")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </Container>
  );
}
