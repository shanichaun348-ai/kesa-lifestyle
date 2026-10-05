import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { articleMetadata } from "@/modules/seo/metadata";
import { articleJsonLd, breadcrumbListJsonLd } from "@/modules/seo/structured-data";
import { absoluteUrl } from "@/lib/site";
import { SEED_NOW } from "@/lib/demo/seed-catalog";
import { seedStyleGuides, getStyleGuideBySlug } from "@/lib/demo/seed-style-guides";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return seedStyleGuides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getStyleGuideBySlug(slug);
  if (!guide) return {};
  return articleMetadata({
    title: guide.title,
    excerpt: guide.excerpt,
    path: `/style-guides/${slug}/`,
    publishedAt: guide.publishedAt,
    imageUrl: absoluteUrl(guide.image.src),
  });
}

export default async function StyleGuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = getStyleGuideBySlug(slug);
  if (!guide) notFound();

  const repo = getCatalogRepository();
  const featuredProducts = await repo.getProductsBySlugs(guide.featuredProductSlugs);
  const cardWithSiblings = async (p: Product) =>
    toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) });
  const featuredCards = await Promise.all(featuredProducts.map(cardWithSiblings));

  const path = `/style-guides/${slug}/`;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Style Guides", href: "/style-guides/" },
    { label: guide.title },
  ];

  const jsonLd = [
    breadcrumbListJsonLd(breadcrumbs.map((b) => ({ name: b.label, path: b.href ?? path }))),
    articleJsonLd({
      headline: guide.title,
      description: guide.excerpt,
      path,
      datePublished: guide.publishedAt,
      imageUrl: absoluteUrl(guide.image.src),
    }),
  ];

  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={breadcrumbs} />

      <article className="mt-6" aria-labelledby="guide-title">
        <header className="mb-8 max-w-2xl">
          <h1 id="guide-title" className="type-h1">{guide.title}</h1>
          <p className="mt-3 type-body text-ink-muted">{guide.excerpt}</p>
          <p className="mt-3 type-small text-ink-subtle">
            <time dateTime={guide.publishedAt}>
              {new Date(guide.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 max-w-2xl space-y-8">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-md bg-surface-muted">
              <Image
                src={guide.image.src}
                alt={guide.image.alt}
                width={1200}
                height={675}
                className="h-full w-full object-cover"
                {...(guide.image.unoptimized ? { unoptimized: true } : {})}
              />
            </div>

            {guide.body.map((section, i) => (
              <section key={i} aria-labelledby={`section-${i}`}>
                <h2 id={`section-${i}`} className="type-h3 mb-3">{section.heading}</h2>
                <div className="space-y-3">
                  {section.content.map((p, j) => (
                    <p key={j} className="type-body text-ink-muted leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="mt-10 lg:col-span-5 lg:mt-0">
            {featuredCards.length > 0 ? (
              <div className="rounded-md border border-line bg-surface p-5">
                <h2 className="type-h3 mb-4">Shop the guide</h2>
                <ul className="space-y-3">
                  {featuredCards.map((card) => (
                    <li key={card.slug}>
                      <Link
                        href={`/products/${card.slug}/`}
                        className="flex items-center gap-3 rounded-sm hover:bg-surface-muted p-2 transition-colors"
                      >
                        <div className="h-14 w-14 flex-none overflow-hidden rounded-sm bg-surface-muted">
                          <Image
                            src={card.image.src}
                            alt={card.image.alt}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                            {...(card.image.unoptimized ? { unoptimized: true } : {})}
                          />
                        </div>
                        <div>
                          <p className="type-small font-medium text-ink">{card.name}</p>
                          <p className="type-small text-ink-muted">
                            ₹{(card.pricePaise / 100).toLocaleString("en-IN")}
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
      </article>

      {guide.relatedCategoryPaths.length > 0 ? (
        <nav className="mt-12 pt-8 border-t border-line" aria-label="Related categories">
          <p className="type-small text-ink-subtle mb-3 uppercase tracking-wider">Explore</p>
          <ul className="flex flex-wrap gap-2">
            {guide.relatedCategoryPaths.map((catPath) => (
              <li key={catPath}>
                <Link
                  href={`/${catPath}/`}
                  className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-4 type-small text-ink hover:bg-surface-muted transition-colors"
                >
                  {catPath.split("/").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" › ")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </Container>
  );
}
