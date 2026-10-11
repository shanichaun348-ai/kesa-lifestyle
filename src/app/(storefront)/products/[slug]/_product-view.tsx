import { Suspense } from "react";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DeliveryEstimateChecker } from "@/components/product/delivery-estimate";
import { ProductDetails } from "@/components/product/product-details";
import { ProductFaq } from "@/components/product/product-faq";
import { ProductGallery, type GalleryItem } from "@/components/product/product-gallery";
import { ProductReviews } from "@/components/product/product-reviews";
import { PurchasePanel, type PurchaseOption } from "@/components/product/purchase-panel";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { ProductRail } from "@/components/storefront/product-rail";
import { RatingStars } from "@/components/storefront/rating-stars";
import { SectionHeading } from "@/components/storefront/section-heading";
import { isNewArrival } from "@/modules/catalog/listing";
import { primaryImage, productHref, toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository, getCategoryByPath } from "@/modules/catalog/queries";
import type { FaqItem, Product } from "@/modules/catalog/types";
import { resolveVariant } from "@/modules/catalog/variants";
import { getProductReviewSummary } from "@/modules/reviews/queries";
import { breadcrumbListJsonLd, faqPageJsonLd, productJsonLd, type JsonLdObject } from "@/modules/seo/structured-data";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

type ProductViewProps = {
  product: Product;
  /** The ?variant= query value, if any. */
  requestedSku: string | undefined;
  /** Admin preview of a draft: no analytics, no redirect on a stale variant. */
  preview?: boolean | undefined;
};

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
export async function ProductView({ product, requestedSku, preview = false }: ProductViewProps) {
  const path = productHref(product);

  let resolution = resolveVariant(product, requestedSku);
  if (resolution.status === "invalid") {
    // A stale ?variant= on the public page is redirected; a preview just ignores it.
    if (!preview) permanentRedirect(path);
    resolution = resolveVariant(product, undefined);
  }

  const repo = getCatalogRepository();
  const [category, siblings, related, lookProducts, reviews] = await Promise.all([
    getCategoryByPath(product.primaryCategoryPath),
    repo.getFamilySiblings(product),
    repo.getRelatedProducts(product, 4),
    repo.getProductsBySlugs(product.completeTheLookSlugs),
    getProductReviewSummary(product.slug),
  ]);
  const root = category?.parentPath ? await getCategoryByPath(category.parentPath) : null;

  const orderedLook = product.completeTheLookSlugs.map((s) => lookProducts.find((p) => p.slug === s)).filter((p): p is Product => p !== undefined);
  const cardWithSiblings = async (p: Product) => toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) });
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

  const jsonLd: JsonLdObject[] = [
    breadcrumbListJsonLd(breadcrumbs.map((c) => ({ name: c.label, path: c.href ?? path }))),
    productJsonLd(product, path, { reviews }),
    faqPageJsonLd(faq),
  ];

  return (
    <Container className="pt-5 pb-16 lg:pb-24">
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

      <article className="mt-5 grid gap-8 lg:mt-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <ProductGallery productName={product.name} items={galleryItems} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {isNewArrival(product, SEED_NOW) ? <Badge>New</Badge> : null}
              {category ? (
                <Link href={`/${category.path}/`} className="type-eyebrow text-ink-subtle hover:text-ink">
                  {category.name}
                </Link>
              ) : null}
            </div>
            <h1 className="type-h2">{product.name}</h1>
            {reviews.count > 0 && reviews.average !== null ? (
              <a href="#reviews-title" className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <RatingStars rating={reviews.average} />
                <span>
                  {reviews.average.toFixed(1)} · {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
                </span>
              </a>
            ) : (
              <p className="type-small text-ink-subtle">No reviews yet</p>
            )}
            <p className="type-body text-ink-muted">{product.shortDescription}</p>
          </header>

          {siblings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">
                Finish <span className="ml-1.5 font-normal text-ink-muted">{product.familyOptionLabel}</span>
              </p>
              <ul className="flex flex-wrap gap-2" aria-label="Also available in">
                <li>
                  <span aria-current="true" className="inline-flex h-10 items-center rounded-sm border border-ink bg-ink px-3 text-sm text-bg">
                    {product.familyOptionLabel}
                  </span>
                </li>
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link href={productHref(s)} className="inline-flex h-10 items-center rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink hover:border-ink">
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

          <DeliveryEstimateChecker />

          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {product.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <ProductDetails product={product} />

          {product.stylingTips.length > 0 ? (
            <section aria-labelledby="styling-title" className="rounded-md bg-surface-muted/70 p-5">
              <h2 id="styling-title" className="type-h3">
                How to style it
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
                {product.stylingTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>

      <div className="mt-16 flex flex-col gap-14 lg:mt-24 lg:gap-20">
        {lookCards.length > 0 ? (
          <section aria-labelledby="look-title">
            <SectionHeading eyebrow="Complete the look" title="Wear it with" description="Curated by our stylists to pair with this piece." className="mb-6" />
            <ProductRail label="Complete the look" products={lookCards} />
          </section>
        ) : null}

        {relatedCards.length > 0 ? (
          <section aria-labelledby="related-title">
            <SectionHeading eyebrow="You may also like" title="Similar pieces" className="mb-6" />
            <ProductRail label="Related products" products={relatedCards} />
          </section>
        ) : null}

        <ProductReviews productName={product.name} summary={reviews} />

        <ProductFaq items={faq} />

        <RecentlyViewed currentSlug={product.slug} />
      </div>
    </Container>
  );
}
