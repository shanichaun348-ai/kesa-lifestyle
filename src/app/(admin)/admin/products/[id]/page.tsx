import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { productStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { effectivePrice } from "@/modules/catalog/listing";
import { formatPaise } from "@/lib/money";

import { archiveProduct, deleteProduct, publishProduct, unpublishProduct } from "./_actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdmin("products:read");

  // In demo mode, `id` is the product slug (no separate UUID until Postgres).
  const product = await getCatalogRepository().getProductBySlug(id);
  if (!product) notFound();

  const canWrite = hasPermission(session.role, "products:write");
  const canDelete = hasPermission(session.role, "products:delete");
  const { pricePaise } = effectivePrice(product);
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.slug}
        back={{ href: "/admin/products/", label: "Products" }}
        actions={
          <div className="flex items-center gap-2">
            {productStatusBadge(product.status)}
            {canWrite && product.status !== "active" ? (
              <form action={publishProduct.bind(null, product.id)}>
                <button className="inline-flex h-9 items-center rounded-md border border-success bg-success/10 px-3 text-sm font-medium text-success hover:bg-success hover:text-bg">
                  Publish
                </button>
              </form>
            ) : null}
            {canWrite && product.status === "active" ? (
              <form action={unpublishProduct.bind(null, product.id)}>
                <button className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm text-ink hover:bg-surface-muted">
                  Unpublish
                </button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-line bg-surface p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink">Basic information</h2>
            <div>
              <p className="text-xs text-ink-subtle">Name</p>
              <p className="mt-0.5 text-sm text-ink">{product.name}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Short description</p>
              <p className="mt-0.5 text-sm text-ink-muted">{product.shortDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-subtle">Gender</p>
                <p className="mt-0.5 text-sm capitalize text-ink">{product.gender}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Primary category</p>
                <p className="mt-0.5 text-sm text-ink">{product.primaryCategoryPath}</p>
              </div>
            </div>
            {!canWrite ? null : (
              <a href="#edit-form" className="inline-flex items-center text-sm text-brand hover:underline">
                Edit details →
              </a>
            )}
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink">Variants &amp; inventory</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">SKU</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Option</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Price</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {product.variants.map((v) => (
                  <tr key={v.sku}>
                    <td className="py-2 font-mono text-xs text-ink-muted">{v.sku}</td>
                    <td className="py-2 text-ink-muted">{v.optionValue ?? "—"}</td>
                    <td className="py-2 font-medium text-ink">{formatPaise(v.pricePaise)}</td>
                    <td className={`py-2 ${v.stock === 0 ? "text-danger" : v.stock <= 5 ? "text-warning" : "text-ink-muted"}`}>
                      {v.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {product.images.length > 0 ? (
            <section className="rounded-md border border-line bg-surface p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">Images</h2>
              <div className="flex flex-wrap gap-3">
                {product.images.map((img, i) => (
                  <div key={i} className="h-20 w-20 overflow-hidden rounded-sm border border-line bg-surface-muted">
                    <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Pricing</h2>
            <div>
              <p className="text-xs text-ink-subtle">Price</p>
              <p className="mt-0.5 text-base font-medium text-ink">{formatPaise(pricePaise)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Total stock</p>
              <p className={`mt-0.5 text-sm font-medium ${totalStock === 0 ? "text-danger" : "text-ink"}`}>
                {totalStock} units
              </p>
            </div>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">SEO</h2>
            <div>
              <p className="text-xs text-ink-subtle">Slug (URL)</p>
              <p className="mt-0.5 font-mono text-xs text-ink-muted">/products/{product.slug}/</p>
            </div>
            <a href={`/products/${product.slug}/`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              View in store ↗
            </a>
          </section>

          {(canWrite || canDelete) ? (
            <section className="rounded-md border border-line bg-surface p-5 space-y-3">
              <h2 className="text-sm font-medium text-ink">Actions</h2>
              <div className="space-y-2">
                {canDelete ? (
                  <form action={archiveProduct.bind(null, product.id)}>
                    <button className="w-full rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-left text-sm text-warning hover:bg-warning/10">
                      Archive product
                    </button>
                  </form>
                ) : null}
                {canDelete ? (
                  <form action={deleteProduct.bind(null, product.id)}>
                    <button className="w-full rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
                      Delete permanently
                    </button>
                  </form>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
