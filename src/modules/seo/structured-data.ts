import "server-only";

import { absoluteUrl, site } from "@/lib/site";
import type { FaqItem, Product } from "@/modules/catalog/types";
import type { ReviewSummary } from "@/modules/reviews/types";

/**
 * JSON-LD builders (docs/06 §1.4). Only facts that are true today are
 * emitted. AggregateRating and Review nodes are added only from a real
 * ReviewSummary with at least one review; nothing is ever invented.
 */

export type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    description: site.description,
    // `logo` and `sameAs` are added once the brand asset (D12) and real social
    // profiles exist. Emitting a URL that does not resolve would be worse than none.
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    publisher: { "@id": `${site.url}/#organization` },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type BreadcrumbInput = { name: string; path: string };

export function breadcrumbListJsonLd(items: BreadcrumbInput[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageJsonLd(input: { name: string; path: string; description: string; productPaths: string[] }): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url: absoluteUrl(input.path),
    description: input.description,
    isPartOf: { "@id": `${site.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.productPaths.length,
      itemListElement: input.productPaths.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(p),
      })),
    },
  };
}

export function faqPageJsonLd(items: FaqItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

const RETURN_POLICY_ID = `${site.url}/returns-policy/#return-policy`;
const SHIPPING_ID = `${site.url}/shipping-policy/#shipping-india`;

function offerFor(variant: Product["variants"][number], url: string): JsonLdObject {
  return {
    "@type": "Offer",
    url: absoluteUrl(url),
    priceCurrency: "INR",
    price: (variant.pricePaise / 100).toFixed(2),
    availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    sku: variant.sku,
    hasMerchantReturnPolicy: { "@id": RETURN_POLICY_ID },
    shippingDetails: { "@id": SHIPPING_ID },
  };
}

/** Rating and review nodes, only when legitimate data exists. */
function reviewNodes(summary: ReviewSummary | undefined): JsonLdObject {
  if (!summary || summary.count === 0 || summary.average === null) return {};
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(summary.average.toFixed(1)),
      reviewCount: summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: summary.reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      author: { "@type": "Person", name: r.authorName },
      datePublished: r.createdAt.slice(0, 10),
      name: r.title,
      reviewBody: r.body,
    })),
  };
}

/**
 * Product or ProductGroup. Size/length variants become `hasVariant`
 * entries; colour/finish siblings are separate products linked by
 * `isVariantOf` → family ProductGroup (ADR-29).
 */
export function productJsonLd(product: Product, path: string, opts: { reviews?: ReviewSummary | undefined } = {}): JsonLdObject {
  const images = product.images.map((i) => absoluteUrl(i.src));
  const material = product.attributes.material?.[0]?.replace(/-/g, " ");
  const color = product.attributes.color?.join(", ");
  const base: JsonLdObject = {
    "@context": "https://schema.org",
    name: product.name,
    description: product.shortDescription,
    image: images,
    brand: { "@type": "Brand", name: site.name },
    category: product.primaryCategoryPath.replace("/", " > "),
    url: absoluteUrl(path),
    ...(material ? { material } : {}),
    ...(color ? { color } : {}),
    ...(product.weightGrams ? { weight: { "@type": "QuantitativeValue", value: product.weightGrams, unitCode: "GRM" } } : {}),
    ...reviewNodes(opts.reviews),
  };

  if (product.variants.length === 1) {
    const variant = product.variants[0];
    return {
      ...base,
      "@type": "Product",
      sku: variant?.sku,
      ...(variant ? { offers: offerFor(variant, path) } : {}),
      ...(product.familyId ? { isVariantOf: { "@type": "ProductGroup", productGroupID: product.familyId } } : {}),
    };
  }

  const prices = product.variants.map((v) => v.pricePaise);
  return {
    ...base,
    "@type": "ProductGroup",
    productGroupID: product.slug,
    variesBy: "https://schema.org/size",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    hasVariant: product.variants.map((v) => ({
      "@type": "Product",
      name: `${product.name} – ${product.optionName ?? "Option"} ${v.optionValue ?? ""}`.trim(),
      sku: v.sku,
      size: v.optionValue,
      image: images,
      offers: offerFor(v, `${path}?variant=${encodeURIComponent(v.sku)}`),
    })),
  };
}
