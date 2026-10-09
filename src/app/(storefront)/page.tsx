import type { Metadata } from "next";

// Revalidate every 60 s so product changes appear promptly.
// On-demand revalidatePath("/") from publish/unpublish actions fires sooner.
export const revalidate = 60;

import { BrandStatement } from "@/components/home/brand-statement";
import { CategoryTiles } from "@/components/home/category-tiles";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { JournalPreview } from "@/components/home/journal-preview";
import { NewsletterBand } from "@/components/home/newsletter-band";
import { ProductSection } from "@/components/home/product-section";
import { Reviews } from "@/components/home/reviews";
import { ShopTheLook } from "@/components/home/shop-the-look";
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
  demoJournalPosts,
  demoLook,
  demoReviews,
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
const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/images/hero/style-that-feels-like-you-desktop.png",
    mobileSrc: "/images/hero/style-that-feels-like-you-mobile-4x5.jpg",
    alt: "Kesa Lifestyle — Style that feels like you. A model in an embroidered cream saree wearing a gold-tone crystal flower necklace and matching drop earrings.",
    href: "/women/",
    cta: "Shop the collection",
  },
  {
    src: "/images/hero/necklace-showcase.jpg",
    alt: "A model in a black embroidered saree wearing a gold-tone crystal pendant necklace, beside gold-tone crystal lariat necklaces and an Om pendant on display stands.",
    href: "/women/necklaces/",
    cta: "Shop necklaces",
  },
  {
    src: "/images/hero/necklace-edit.jpg",
    alt: "Kesa Lifestyle new collection — The Necklace Edit. Grace you can wear, every day. Gold-tone crystal pendant necklaces on display stands and a model wearing one.",
    href: "/women/necklaces/",
    cta: "Shop The Necklace Edit",
  },
  {
    src: "/images/hero/everyday-grace-desktop.jpg",
    mobileSrc: "/images/hero/everyday-grace-mobile.jpg",
    alt: "New launch — Everyday Grace. Crafted to shine with you. Crystal Drop Edit. A model in black velvet wearing a gold-tone crystal drop necklace.",
    href: "/collections/new-arrivals/",
    cta: "Shop the Crystal Drop Edit",
  },
  {
    src: "/images/hero/golden-bloom-desktop.jpg",
    mobileSrc: "/images/hero/golden-bloom-mobile.jpg",
    alt: "Festive Edit — Golden Bloom. Light up every celebration. A gold-tone crystal flower pendant necklace on a black display bust.",
    href: "/occasion/festive-jewellery/",
    cta: "Shop the Festive Edit",
  },
  {
    src: "/images/hero/midnight-in-bloom-desktop.jpg",
    mobileSrc: "/images/hero/midnight-in-bloom-mobile.jpg",
    alt: "New launch — Midnight in Bloom. Petal Sparkle. A gold-tone crystal pendant necklace on midnight-blue satin with a white orchid.",
    href: "/collections/new-arrivals/",
    cta: "Shop Petal Sparkle",
  },
  {
    src: "/images/hero/soft-glow-desktop.jpg",
    mobileSrc: "/images/hero/soft-glow-mobile.jpg",
    alt: "Kesa Lifestyle everyday luxe — Soft Glow. Light pieces, lasting shine. A gold-tone crystal flower pendant necklace on a cream display bust.",
    href: "/women/necklaces/",
    cta: "Shop Soft Glow",
  },
  {
    src: "/images/hero/gift-her-sparkle-desktop.jpg",
    mobileSrc: "/images/hero/gift-her-sparkle-mobile.jpg",
    alt: "The Gift Edit — Gift her sparkle. Wrapped and ready to treasure. A gold-tone crystal pendant necklace draped over a black gift box.",
    href: "/occasion/gifting/",
    cta: "Shop gifts",
  },
];

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

        <ShopTheLook {...demoLook} />

        <ProductSection
          id="bestsellers"
          eyebrow="Most loved"
          title="Bestsellers"
          viewAll={{ label: "View all bestsellers", href: "/collections/bestsellers/" }}
          products={bestSellers}
        />

        <BrandStatement {...demoBrandStatement} />

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
