import { Suspense } from "react";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DeliveryEstimateChecker } from "@/components/product/delivery-estimate";
import { ProductBackdrop } from "@/components/product/product-backdrop";
import { ProductBenefits } from "@/components/product/product-benefits";
import { ProductDetails } from "@/components/product/product-details";
import { ProductFaq } from "@/components/product/product-faq";
import { ProductGallery, type GalleryItem } from "@/components/product/product-gallery";
import { ProductHighlights } from "@/components/product/product-highlights";
import { ProductReviews } from "@/components/product/product-reviews";
import { PurchasePanel, type PurchaseOption } from "@/components/product/purchase-panel";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { ProductRail } from "@/components/storefront/product-rail";
import { RichText } from "@/components/storefront/rich-text";
import { RatingStars } from "@/components/storefront/rating-stars";
import { SectionHeading } from "@/components/storefront/section-heading";
import { pdpBadges, type PdpBadgeTone } from "@/modules/catalog/pdp";
import { primaryImage, productHref, toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository, getCategoryByPath } from "@/modules/catalog/queries";
import type { FaqItem, Product } from "@/modules/catalog/types";
import { resolveVariant } from "@/modules/catalog/variants";
import { getProductReviewSummary } from "@/modules/reviews/queries";
import { getSessionUser } from "@/lib/auth/session";
import { breadcrumbListJsonLd, faqPageJsonLd, productJsonLd, type JsonLdObject } from "@/modules/seo/structured-data";
import { cn } from "@/lib/utils";

const BADGE_CLASS: Record<PdpBadgeTone, string> = {
  gold: "border-highlight/60 bg-transparent text-highlight",
  muted: "",
  warning: "",
  danger: "",
};
const BADGE_VARIANT: Record<PdpBadgeTone, "outline" | "muted" | "warning" | "solid"> = { gold: "outline", muted: "muted", warning: "warning", danger: "solid" };

type ProductViewProps = {
  product: Product;
  /** The ?variant= query value, if any. */
  requestedSku: string | undefined;
  /** Admin preview of a draft: no analytics, no redirect on a stale variant. */
  preview?: boolean | undefined;
  /** `?reviews=all`: list every approved review instead of the latest few. */
  allReviews?: boolean | undefined;
};

const REVIEWS_SHOWN = 6;

function productFaq(product: Product, categoryFaq: FaqItem[] | undefined): FaqItem[] {
  const base: FaqItem[] = [
    { question: "Is this piece safe for sensitive skin?", answer: "Yes. The base metal is nickel-safe and the plating is hypoallergenic, so it is suitable for daily wear." },
    { question: "How do I keep the finish from fading?", answer: product.care },
    {
      question: "Can I return or exchange it?",
      answer:
        product.returnPolicy === "returnable"
          ? "Yes, within the return window for unworn pieces with tags."
          : product.returnPolicy === "exchange_only"
            ? "This piece is exchange-only for hygiene reasons. Damaged or incorrect items are replaced free of charge."
            : "This piece is final sale and cannot be returned or exchanged.",
    },
  ];
  return [...(product.faq ?? []), ...base, ...(categoryFaq ?? []).slice(0, 2)];
}

/** The product page body, shared by the public page and the admin draft preview. */
export async function ProductView({ product, requestedSku, preview = false, allReviews = false }: ProductViewProps) {
  const path = productHref(product);

  let resolution = resolveVariant(product, requestedSku);
  if (resolution.status === "invalid") {
    // A stale ?variant= on the public page is redirected; a preview just ignores it.
    if (!preview) permanentRedirect(path);
    resolution = resolveVariant(product, undefined);
  }

  const repo = getCatalogRepository();
  const [category, siblings, related, lookProducts, reviews, sessionUser] = await Promise.all([
    getCategoryByPath(product.primaryCategoryPath),
    repo.getFamilySiblings(product),
    repo.getRelatedProducts(product, 4),
    repo.getProductsBySlugs(product.completeTheLookSlugs),
    getProductReviewSummary(product.slug, allReviews ? 0 : REVIEWS_SHOWN),
    getSessionUser(),
  ]);
  const root = category?.parentPath ? await getCategoryByPath(category.parentPath) : null;

  const now = new Date();
  const orderedLook = product.completeTheLookSlugs.map((s) => lookProducts.find((p) => p.slug === s)).filter((p): p is Product => p !== undefined);
  const cardWithSiblings = async (p: Product) => toCardData(p, { now, siblings: await repo.getFamilySiblings(p) });
  const [lookCards, relatedCards] = await Promise.all([Promise.all(orderedLook.map(cardWithSiblings)), Promise.all(related.map(cardWithSiblings))]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...(root ? [{ label: root.name, href: `/${root.path}/` }] : []),
    ...(category ? [{ label: category.name, href: `/${category.path}/` }] : []),
    { label: product.name },
  ];

  const galleryItems: GalleryItem[] = [
    ...(product.images.length > 0 ? product.images : [primaryImage(product)]).map((image) => ({ kind: "image" as const, image })),
    ...(product.videos ?? []).map((video) => ({ kind: "video" as const, video })),
  ];

  const options: PurchaseOption[] = product.variants.map((v) => ({
    sku: v.sku,
    label: v.optionValue ?? product.name,
    stock: v.stock,
    pricePaise: v.pricePaise,
    compareAtPaise: v.compareAtPaise,
  }));
  const initialSku = resolution.status === "ok" ? resolution.variant.sku : null;
  const trackerVariant = (resolution.status === "ok" ? resolution.variant : null) ?? product.variants[0] ?? null;
  const faq = productFaq(product, category?.faq);
  const badges = pdpBadges(product, now);

  const jsonLd: JsonLdObject[] = [
    breadcrumbListJsonLd(breadcrumbs.map((c) => ({ name: c.label, path: c.href ?? path }))),
    productJsonLd(product, path, { reviews }),
    faqPageJsonLd(faq),
  ];

  const heroImage = product.images[0];
  // The short description is the lead; the full description (in the accordion) only stands in when it is empty.
  const intro = product.shortDescription.trim() || product.description[0] || "";

  return (
    <Container className="relative isolate pt-5 pb-16 lg:pb-24">
      {heroImage ? <ProductBackdrop image={heroImage} /> : null}
      <JsonLd data={jsonLd} />
      {trackerVariant && !preview ? (
        <Suspense>
          <ProductViewTracker
            sku={trackerVariant.sku}
            productName={product.name}
            pricePaise={trackerVariant.pricePaise}
            categoryPath={product.primaryCategoryPath}
          />
        </Suspense>
      ) : null}
      <Breadcrumbs items={breadcrumbs} />

      <article className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div>
          <ProductGallery productName={product.name} items={galleryItems} />
        </div>

        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {badges.map((b) => (
                <Badge key={b.label} variant={BADGE_VARIANT[b.tone]} className={cn("rounded-full px-3", BADGE_CLASS[b.tone])}>
                  {b.label}
                </Badge>
              ))}
              {category ? (
                <Link href={`/${category.path}/`} className="type-eyebrow tracking-[0.18em] text-ink-muted underline-offset-4 hover:text-highlight hover:underline">
                  {category.name}
                </Link>
              ) : null}
            </div>
            <h1 className="type-h1 text-balance lg:text-[clamp(2rem,1.2rem+2vw,2.9rem)] lg:leading-[1.1]">{product.name}</h1>
            {reviews.count > 0 && reviews.average !== null ? (
              <a href="#reviews-title" className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <RatingStars rating={reviews.average} size="md" />
                <span>
                  {reviews.average.toFixed(1)} · {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
                </span>
              </a>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-ink-subtle">
                <RatingStars rating={0} size="md" className="text-highlight/60" />
                <span>No reviews yet</span>
              </p>
            )}
            <span className="lux-divider-ornament my-1" aria-hidden="true">
              <span className="text-sm leading-none">✦</span>
            </span>
            {intro ? <RichText text={intro} className="type-lead text-ink-muted" /> : null}
          </header>

          <ProductHighlights highlights={product.highlights} />

          {siblings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">
                Finish <span className="ml-1.5 font-normal text-ink-muted">{product.familyOptionLabel}</span>
              </p>
              <ul className="flex flex-wrap gap-2" aria-label="Also available in">
                <li>
                  <span aria-current="true" className="inline-flex h-11 items-center rounded-xl border border-highlight bg-highlight/10 px-4 text-sm font-medium text-ink ring-1 ring-highlight/60">
                    {product.familyOptionLabel}
                  </span>
                </li>
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link href={productHref(s)} className="lux-hairline inline-flex h-11 items-center rounded-xl bg-surface px-4 text-sm text-ink transition-colors hover:border-highlight">
                      {s.familyOptionLabel ?? s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <PurchasePanel
            productSlug={product.slug}
            productName={product.name}
            image={primaryImage(product)}
            optionName={product.optionName}
            options={options}
            initialSku={initialSku}
            lowStockThreshold={product.lowStockThreshold}
            sizeGuideHref={product.optionName === "Size" ? "/size-guide/" : undefined}
            categoryPath={product.primaryCategoryPath}
          />

          <ProductBenefits returnPolicy={product.returnPolicy} />

          <DeliveryEstimateChecker />

          {product.highlights.length > 0 && product.highlights.length < 2 ? (
            <ul className="grid gap-2 text-sm text-ink-muted" aria-label="Highlights">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-highlight" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <ProductDetails product={product} />

          {product.stylingTips.length > 0 ? (
            <section aria-labelledby="styling-title" className="lux-surface rounded-md p-5">
              <h2 id="styling-title" className="type-h3">
                How to style it
              </h2>
              <span className="lux-divider mt-3" aria-hidden="true" />
              <ul className="mt-4 grid gap-2 text-sm text-ink-muted">
                {product.stylingTips.map((tip) => (
                  <li key={tip} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-highlight" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>

      <div className="mt-16 flex flex-col gap-14 lg:mt-24 lg:gap-20">
        {lookCards.length > 0 ? (
          <section aria-labelledby="look-title" className="reveal">
            <SectionHeading eyebrow="Complete the look" title="Wear it with" description="Curated by our stylists to pair with this piece." className="mb-6" />
            <ProductRail label="Complete the look" products={lookCards} />
          </section>
        ) : null}

        {relatedCards.length > 0 ? (
          <section aria-labelledby="related-title" className="reveal">
            <SectionHeading eyebrow="You may also like" title="Similar pieces" className="mb-6" />
            <ProductRail label="Related products" products={relatedCards} />
          </section>
        ) : null}

        <ProductReviews productSlug={product.slug} productName={product.name} summary={reviews} sessionEmail={sessionUser?.email} showingAll={allReviews} />

        <ProductFaq items={faq} />

        <RecentlyViewed currentSlug={product.slug} />
      </div>
    </Container>
  );
}
