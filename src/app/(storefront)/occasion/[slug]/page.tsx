import type { Metadata } from "next";
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
import { occasionMetadata } from "@/modules/seo/metadata";
import { breadcrumbListJsonLd, collectionPageJsonLd, faqPageJsonLd } from "@/modules/seo/structured-data";
import { SEED_NOW } from "@/lib/demo/seed-catalog";
import { seedOccasionPages, getOccasionPageBySlug } from "@/lib/demo/seed-occasion";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return seedOccasionPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getOccasionPageBySlug(slug);
  if (!page) return {};
  return occasionMetadata({
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    path: `/occasion/${slug}/`,
  });
}

export default async function OccasionLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = getOccasionPageBySlug(slug);
  if (!page) notFound();

  const repo = getCatalogRepository();
  const featuredProducts = await repo.getProductsBySlugs(page.featuredProductSlugs);
  const cardWithSiblings = async (p: Product) =>
    toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) });
  const featuredCards = await Promise.all(featuredProducts.map(cardWithSiblings));

  const path = `/occasion/${slug}/`;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "By Occasion", href: "/occasion/" },
    { label: page.name },
  ];

  const jsonLd = [
    breadcrumbListJsonLd(breadcrumbs.map((b) => ({ name: b.label, path: b.href ?? path }))),
    collectionPageJsonLd({
      name: page.heading,
      path,
      description: page.seoDescription,
      productPaths: page.featuredProductSlugs.map((s) => `/products/${s}/`),
    }),
    ...(page.faq.length > 0 ? [faqPageJsonLd(page.faq)] : []),
  ];

  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={breadcrumbs} />

      <header className="mt-6 mb-10 max-w-2xl">
        <h1 className="type-h1">{page.heading}</h1>
        <p className="mt-3 type-body text-ink-muted">{page.intro}</p>
      </header>

      {featuredCards.length > 0 ? (
        <section aria-labelledby="featured-title">
          <SectionHeading title="Featured pieces" className="mb-6" />
          <ProductRail label={`Featured pieces for ${page.name}`} products={featuredCards} />
        </section>
      ) : null}

      <div className="mt-14 max-w-2xl space-y-10">
        {page.body.map((section, i) => (
          <section key={i} aria-labelledby={`body-section-${i}`}>
            <h2 id={`body-section-${i}`} className="type-h3 mb-3">{section.heading}</h2>
            <div className="space-y-3">
              {section.content.map((p, j) => (
                <p key={j} className="type-body text-ink-muted leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {page.faq.length > 0 ? (
        <section className="mt-14 max-w-2xl" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="type-h2 mb-6">Frequently asked questions</h2>
          <dl className="space-y-6 divide-y divide-line">
            {page.faq.map((item, i) => (
              <div key={i} className="pt-6 first:pt-0">
                <dt className="type-body font-medium text-ink">{item.question}</dt>
                <dd className="mt-2 type-body text-ink-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <nav className="mt-12 pt-8 border-t border-line" aria-label="Related">
        {page.relatedCategoryPaths.length > 0 ? (
          <div className="mb-6">
            <p className="type-small text-ink-subtle mb-3 uppercase tracking-wider">Shop by category</p>
            <ul className="flex flex-wrap gap-2">
              {page.relatedCategoryPaths.map((catPath) => (
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
          </div>
        ) : null}

        {page.relatedOccasionSlugs.length > 0 ? (
          <div>
            <p className="type-small text-ink-subtle mb-3 uppercase tracking-wider">More occasions</p>
            <ul className="flex flex-wrap gap-2">
              {page.relatedOccasionSlugs.map((s) => {
                const related = seedOccasionPages.find((p) => p.slug === s);
                if (!related) return null;
                return (
                  <li key={s}>
                    <Link
                      href={`/occasion/${s}/`}
                      className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-4 type-small text-ink hover:bg-surface-muted transition-colors"
                    >
                      {related.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>
    </Container>
  );
}
