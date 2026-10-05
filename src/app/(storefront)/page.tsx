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
import { UgcGrid } from "@/components/home/ugc-grid";
import { WhyKesa } from "@/components/home/why-kesa";
import { JsonLd } from "@/components/seo/json-ld";
import { DEMO_CONTENT_NOTICE, demoBestSellers, demoNewArrivals } from "@/lib/demo/catalog";
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
export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <div className="flex flex-col gap-14 pb-14 lg:gap-24 lg:pb-24">
        <Hero {...demoHero} />

        <GenderTiles tiles={demoGenderTiles} />

        <CategoryTiles categories={demoCategories} />

        <ProductSection
          id="new-arrivals"
          eyebrow="Just in"
          title="New arrivals"
          viewAll={{ label: "View all new arrivals", href: "/collections/new-arrivals/" }}
          products={demoNewArrivals}
          priorityCount={4}
        />

        <ShopTheLook {...demoLook} />

        <ProductSection
          id="bestsellers"
          eyebrow="Most loved"
          title="Bestsellers"
          viewAll={{ label: "View all bestsellers", href: "/collections/bestsellers/" }}
          products={demoBestSellers}
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
