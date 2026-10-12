import type { Metadata } from "next";

// Revalidate every 60 s so product changes appear promptly.
// On-demand revalidatePath("/") from publish/unpublish actions fires sooner.
export const revalidate = 60;

import { BrandStatement } from "@/components/home/brand-statement";
import { CategoryTiles } from "@/components/home/category-tiles";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { JournalPreview } from "@/components/home/journal-preview";
import { NewsletterBand } from "@/components/home/newsletter-band";
import { ProductSection } from "@/components/home/product-section";
import { Reviews, type HomeReview } from "@/components/home/reviews";
import { ShopTheLook } from "@/components/home/shop-the-look";
import { TrustMarquee } from "@/components/home/trust-marquee";
import { UgcGrid } from "@/components/home/ugc-grid";
import { VideoReel } from "@/components/home/video-reel";
import { WhyKesa } from "@/components/home/why-kesa";
import { JsonLd } from "@/components/seo/json-ld";
import { DEMO_CONTENT_NOTICE } from "@/lib/demo/catalog";
import { sortProducts } from "@/modules/catalog/listing";
import { toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository, siblingsFor } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { pickLookProducts } from "@/modules/content/home-look";
import { getHomeLook } from "@/modules/content/home-look-server";
import { buildRail, pinnedFor } from "@/modules/content/home-placements";
import { getReviewShowcase } from "@/modules/reviews/queries";
import {
  demoBrandStatement,
  demoCategories,
  demoJournalPosts,
  demoLook,
  demoReviews,
  demoUgcPosts,
  demoWhyKesa,
} from "@/lib/demo/homepage";
import { HERO_SLIDES } from "@/lib/hero-slides";
import { homeReel } from "@/lib/home-reel";
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

async function homeRails() {
  const repo = getCatalogRepository();
  const [active, arrivals, bestsellers, { config: look }] = await Promise.all([
    repo.getAllActiveProducts(),
    repo.getScopeCandidates({ kind: "collection", slug: "new-arrivals" }),
    repo.getScopeCandidates({ kind: "collection", slug: "bestsellers" }),
    getHomeLook(),
  ]);
  const newest = sortProducts(active, "newest");
  // Each rail: pieces the owner pinned from the product form, then the rule's members, topped up while the catalogue is small.
  const newArrivals = buildRail(pinnedFor(active, "newArrivals"), sortProducts(arrivals, "newest"), newest, RAIL_SIZE);
  const bestSellers = buildRail(pinnedFor(active, "bestsellers"), bestsellers, sortProducts(active, "bestselling"), RAIL_SIZE);
  // "Shop the look": the owner's picks (admin → Content → Homepage), newest live pieces until then.
  const lookChosen = look.productSlugs.length > 0 ? await repo.getProductsBySlugs(look.productSlugs) : [];
  const lookProducts = pickLookProducts(look, lookChosen, newest);
  const siblings = await siblingsFor([...newArrivals, ...bestSellers, ...lookProducts]);
  const now = new Date();
  const card = (p: Product) => toCardData(p, { now, siblings: siblings.get(p.slug) });
  return { newArrivals: newArrivals.map(card), bestSellers: bestSellers.map(card), look: { products: lookProducts.map(card), href: look.href } };
}

const MIN_REAL_REVIEWS = 3;

/** Real customer reviews once there are enough; the sample set (with its notice) until then. */
async function homeReviews(): Promise<{ reviews: readonly HomeReview[]; notice: string | undefined }> {
  const showcase = await getReviewShowcase(6);
  if (showcase.total < MIN_REAL_REVIEWS || showcase.reviews.length === 0) {
    return { reviews: demoReviews, notice: "Sample reviews shown for layout. Verified customer reviews appear here after launch." };
  }
  const products = await getCatalogRepository().getProductsBySlugs([...new Set(showcase.reviews.map((r) => r.productSlug))]);
  const nameOf = new Map(products.map((p) => [p.slug, p.name]));
  return {
    reviews: showcase.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.authorName,
      product: nameOf.get(r.productSlug) ?? "a Kesa piece",
      productHref: `/products/${r.productSlug}/`,
      verified: r.verifiedPurchase,
      images: r.images,
    })),
    notice: undefined,
  };
}

export default async function HomePage() {
  const [{ newArrivals, bestSellers, look }, reviews] = await Promise.all([homeRails(), homeReviews()]);
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <HeroCarousel slides={HERO_SLIDES} />
      <TrustMarquee items={demoWhyKesa.map((f) => f.title)} />

      <div className="flex flex-col gap-14 pt-14 pb-14 lg:gap-24 lg:pt-24 lg:pb-24">
        <CategoryTiles categories={demoCategories} />

        <ProductSection
          id="new-arrivals"
          eyebrow="Just in"
          title="New arrivals"
          viewAll={{ label: "View all new arrivals", href: "/collections/new-arrivals/" }}
          products={newArrivals}
          priorityCount={4}
        />

        {look.products.length > 0 ? <ShopTheLook {...demoLook} products={look.products} href={look.href} /> : null}

        <ProductSection
          id="bestsellers"
          eyebrow="Most loved"
          title="Bestsellers"
          viewAll={{ label: "View all bestsellers", href: "/collections/bestsellers/" }}
          products={bestSellers}
        />

        <VideoReel items={homeReel} />

        <BrandStatement {...demoBrandStatement} />

        <WhyKesa facts={demoWhyKesa} />

        <Reviews reviews={reviews.reviews} notice={reviews.notice} />

        <UgcGrid handle="kesalifestyle" posts={demoUgcPosts} />

        <JournalPreview posts={demoJournalPosts} />

        <NewsletterBand />

        <p className="container-page type-small text-ink-subtle">{DEMO_CONTENT_NOTICE}</p>
      </div>
    </>
  );
}
