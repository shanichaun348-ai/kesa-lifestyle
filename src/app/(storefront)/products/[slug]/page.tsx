import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { effectivePrice } from "@/modules/catalog/listing";
import { productHref } from "@/modules/catalog/presenters";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { plainText } from "@/modules/content/rich-text";
import type { Product } from "@/modules/catalog/types";
import { productMetadata } from "@/modules/seo/metadata";
import { absoluteUrl } from "@/lib/site";

import { ProductView } from "./_product-view";

const SLUG = /^[a-z0-9-]{1,120}$/;

export async function generateStaticParams() {
  const products = await getCatalogRepository().getAllActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

/**
 * Looks a product up by slug. Returns `archived` so the page can redirect
 * discontinued products instead of serving a 404 and losing the link equity.
 */
async function lookup(slug: string): Promise<{ kind: "active"; product: Product } | { kind: "archived"; product: Product } | { kind: "missing" }> {
  if (!SLUG.test(slug)) return { kind: "missing" };
  const repo = getCatalogRepository();
  const active = await repo.getProductBySlug(slug);
  if (active) return { kind: "active", product: active };
  const archived = await repo.getArchivedProductBySlug(slug);
  return archived ? { kind: "archived", product: archived } : { kind: "missing" };
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const found = await lookup(slug);
  if (found.kind !== "active") return {};
  const product = found.product;
  const { pricePaise } = effectivePrice(product);
  const first = product.images[0];
  const finish = product.attributes.finish?.[0]?.replace(/-/g, " ");
  return productMetadata({
    name: product.name,
    shortDescription: plainText(product.shortDescription),
    finishLabel: finish,
    path: productHref(product),
    imageUrl: first ? absoluteUrl(first.src) : undefined,
    pricePaise,
  });
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const found = await lookup(slug);
  if (found.kind === "missing") notFound();
  if (found.kind === "archived") {
    // Discontinued: send visitors (and link equity) to the admin-chosen target, default primary category.
    permanentRedirect(found.product.discontinuedRedirectPath ?? `/${found.product.primaryCategoryPath}/`);
  }
  const rawVariant = searchParams.variant;
  return <ProductView product={found.product} requestedSku={Array.isArray(rawVariant) ? rawVariant[0] : rawVariant} allReviews={searchParams.reviews === "all"} />;
}
