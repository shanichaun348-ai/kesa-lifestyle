import type { Metadata } from "next";

import { BrandStatement } from "@/components/home/brand-statement";
import { CategoryTiles } from "@/components/home/category-tiles";
import { GenderTiles } from "@/components/home/gender-tiles";
import { Hero } from "@/components/home/hero";
import { JournalPreview } from "@/components/home/journal-preview";
import { NewsletterBand } from "@/components/home/newsletter-band";
import { ProductSection } from "@/components/home/product-section";
import { Reviews } from "@/components/home/reviews";
import { ShopTheLook } from "@/components/home/shop-the-look";
import { StylingGuides } from "@/components/home/styling-guides";
import { TrustMarquee } from "@/components/home/trust-marquee";
import { UgcGrid } from "@/components/home/ugc-grid";
import { WhyKesa } from "@/components/home/why-kesa";
import { JsonLd } from "@/components/seo/json-ld";
import { DEMO_CONTENT_NOTICE } from "@/lib/demo/catalog";
import { sortProducts } from "@/modules/catalog/listing";
import { toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository, siblingsFor } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import {
  demoBrandStatement,
  demoCategories,
  demoGenderTiles,
  demoHero,
  demoJournalPosts,
  demoLook,
  demoReviews,
  demoStylingGuides,
  demoUgcPosts,
  demoWhyKesa,
} from "@/lib/demo/homepage";
import { site } from "@/lib/site";
import { organizationJsonLd, websiteJsonLd } from "@/modules/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: `${site.name} | ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    locale: site.locale,
  },
};

/**
 * Homepage. Every section is a Server Component; the only client code on the
 * page comes from the shared chrome (menu sheet, bag drawer, announcement
 * dismissal, wishlist and quick-add buttons). In Phase 1 the section list and
 * its content come from `homepage_sections`; today it is demo data.
 */
const RAIL_SIZE = 4;

/** Rule-collection members first; top up from the whole active catalogue while it is small. */
function topUp(primary: Product[], pool: Product[]): Product[] {
  const seen = new Set(primary.map((p) => p.slug));
  return [...primary, ...pool.filter((p) => !seen.has(p.slug))].slice(0, RAIL_SIZE);
}

async function homeRails() {
  const repo = getCatalogRepository();
  const [active, arrivals, bestsellers] = await Promise.all([
    repo.getAllActiveProducts(),
    repo.getScopeCandidates({ kind: "collection", slug: "new-arrivals" }),
    repo.getScopeCandidates({ kind: "collection", slug: "bestsellers" }),
  ]);
  const newArrivals = topUp(sortProducts(arrivals, "newest"), sortProducts(active, "newest"));
  const bestSellers = topUp(bestsellers, sortProducts(active, "bestselling"));
  const siblings = await siblingsFor([...newArrivals, ...bestSellers]);
  const now = new Date();
  const card = (p: Product) => toCardData(p, { now, siblings: siblings.get(p.slug) });
  return { newArrivals: newArrivals.map(card), bestSellers: bestSellers.map(card) };
}

export default async function HomePage() {
  const { newArrivals, bestSellers } = await homeRails();
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <Hero {...demoHero} />
      <TrustMarquee items={demoWhyKesa.map((f) => f.title)} />

      <div className="flex flex-col gap-14 pt-14 pb-14 lg:gap-24 lg:pt-24 lg:pb-24">
        <GenderTiles tiles={demoGenderTiles} />

        <CategoryTiles categories={demoCategories} />

        <ProductSection
          id="new-arrivals"
          eyebrow="Just in"
          title="New arrivals"
          viewAll={{ label: "View all new arrivals", href: "/collections/new-arrivals/" }}
          products={newArrivals}
          priorityCount={4}
        />

        <ShopTheLook {...demoLook} />

        <ProductSection
          id="bestsellers"
          eyebrow="Most loved"
          title="Bestsellers"
          viewAll={{ label: "View all bestsellers", href: "/collections/bestsellers/" }}
          products={bestSellers}
        />

        <BrandStatement {...demoBrandStatement} />

        <StylingGuides guides={demoStylingGuides} />

        <WhyKesa facts={demoWhyKesa} />

        <Reviews
          reviews={demoReviews}
          notice="Sample reviews shown for layout. Verified customer reviews appear here after launch."
        />

        <UgcGrid handle="kesalifestyle" posts={demoUgcPosts} />

        <JournalPreview posts={demoJournalPosts} />

        <NewsletterBand />

        <p className="container-page type-small text-ink-subtle">{DEMO_CONTENT_NOTICE}</p>
      </div>
    </>
  );
}
