import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { productStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { formatPaise } from "@/lib/money";

import { categoryOptions } from "../_category-options";
import { archiveProduct, deleteProduct, publishProduct, unpublishProduct } from "./_actions";
import { ProductEditForm } from "./_edit-form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; published?: string; error?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const session = await requireAdmin("products:read");

  const [product, categories] = await Promise.all([getCatalogRepository().getAnyProductBySlug(id), categoryOptions()]);
  if (!product) notFound();

  const canWrite = hasPermission(session.role, "products:write");
  const canDelete = hasPermission(session.role, "products:delete");
  const hasImages = product.images.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`/products/${product.slug}/`}
        back={{ href: "/admin/products/", label: "Products" }}
        actions={
          <div className="flex items-center gap-2">
            {productStatusBadge(product.status)}
            {canWrite && product.status !== "active" ? (
              <form action={publishProduct.bind(null, product.slug)}>
                <button
                  disabled={!hasImages}
                  title={hasImages ? "Make this product visible in the store" : "Upload photos and click 'Save draft' first, then Publish"}
                  className="inline-flex h-9 items-center rounded-md border border-success bg-success/10 px-3 text-sm font-medium text-success hover:bg-success hover:text-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-success/10 disabled:hover:text-success"
                >
                  Publish
                </button>
              </form>
            ) : null}
            {canWrite && product.status === "active" ? (
              <form action={unpublishProduct.bind(null, product.slug)}>
                <button className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm text-ink hover:bg-surface-muted">Unpublish</button>
              </form>
            ) : null}
          </div>
        }
      />

      {flags.created ? (
        <p role="status" className="rounded-md border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-ink">
          Product created as a draft. Add photos and details below, save, then click <strong>Publish</strong> to make it live.
        </p>
      ) : null}
      {flags.published ? <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">Published — this product is now visible in the store.</p> : null}
      {flags.error === "no-image" ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">Add at least one photo, then click <strong>&ldquo;Save draft&rdquo;</strong> at the bottom of the form — only after saving will the Publish button become active.</p> : null}
      {flags.error === "publish-failed" || flags.error === "unpublish-failed" ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          The status change could not be saved. Try again; if it keeps failing, check the server logs.
        </p>
      ) : null}

      {canWrite ? (
        <ProductEditForm product={product} categories={categories} />
      ) : (
        <section className="rounded-md border border-line bg-surface p-5 space-y-3 text-sm">
          <h2 className="font-medium text-ink">Summary</h2>
          <p className="text-ink-muted">{product.shortDescription}</p>
          <ul className="divide-y divide-line">
            {product.variants.map((v) => (
              <li key={v.sku} className="flex justify-between py-2">
                <span className="font-mono text-xs text-ink-muted">{v.sku}{v.optionValue ? ` · ${v.optionValue}` : ""}</span>
                <span className="text-ink">{formatPaise(v.pricePaise)} · {v.stock} in stock</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canDelete ? (
        <section className="rounded-md border border-danger/20 bg-surface p-5 space-y-3">
          <h2 className="text-sm font-medium text-danger">Danger zone</h2>
          <div className="flex flex-wrap gap-3">
            <form action={archiveProduct.bind(null, product.slug)}>
              <button className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning hover:bg-warning/10">Archive (discontinue)</button>
            </form>
            <form action={deleteProduct.bind(null, product.slug)}>
              <button className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger hover:bg-danger/10">Delete permanently</button>
            </form>
          </div>
          <p className="text-xs text-ink-subtle">Archiving keeps the product&rsquo;s history and redirects its old URL. Delete only products that were never sold.</p>
        </section>
      ) : null}
    </div>
  );
}
