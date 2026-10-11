import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";

import { ProductView } from "../../../products/[slug]/_product-view";

// Admin-only: reads the session cookie and shows drafts, so never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

const STATUS_LABEL = { draft: "a draft", active: "a published product", archived: "an archived product" } as const;

/**
 * What a product page will look like before it is published. Renders the
 * same view as /products/[slug]/ for any status, behind the admin session.
 */
export default async function PreviewProductPage(props: PageProps<"/preview/products/[slug]">) {
  await requireAdmin("products:read");
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const product = (await getCatalogRepository().getAllProducts()).find((p) => p.slug === slug);
  if (!product) notFound();

  const rawVariant = searchParams.variant;
  const requestedSku = Array.isArray(rawVariant) ? rawVariant[0] : rawVariant;

  return (
    <>
      <div role="status" className="border-b border-warning/30 bg-warning/10 text-sm text-ink">
        <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
          <span>
            <strong className="font-medium">Preview</strong> of {STATUS_LABEL[product.status]}. Only signed-in admins can open this page; shoppers see it after you publish.
          </span>
          <span className="ml-auto flex gap-4">
            <Link href={`/admin/products/${product.slug}/`} className="underline underline-offset-4 hover:text-brand">Back to admin</Link>
            {product.status === "active" ? (
              <Link href={`/products/${product.slug}/`} className="underline underline-offset-4 hover:text-brand">Open the live page</Link>
            ) : null}
          </span>
        </div>
      </div>
      <ProductView product={product} requestedSku={requestedSku} preview />
    </>
  );
}
