import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { productStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getCatalogRepository } from "@/modules/catalog/queries";

import { archiveProduct, deleteProduct, publishProduct, unpublishProduct } from "./_actions";
import { ProductEditForm } from "./_edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdmin("products:read");

  const product = await getCatalogRepository().getProductBySlug(id);
  if (!product) notFound();

  const canWrite = hasPermission(session.role, "products:write");
  const canDelete = hasPermission(session.role, "products:delete");

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
                <button className="inline-flex h-9 items-center rounded-md border border-success bg-success/10 px-3 text-sm font-medium text-success hover:bg-success hover:text-bg">
                  Publish
                </button>
              </form>
            ) : null}
            {canWrite && product.status === "active" ? (
              <form action={unpublishProduct.bind(null, product.slug)}>
                <button className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm text-ink hover:bg-surface-muted">
                  Unpublish
                </button>
              </form>
            ) : null}
          </div>
        }
      />

      {canWrite ? (
        <ProductEditForm product={product} />
      ) : (
        /* Read-only view for viewers */
        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Basic information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-subtle">Name</p>
                <p className="mt-0.5 text-ink">{product.name}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Status</p>
                <p className="mt-0.5 text-ink capitalize">{product.status}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Short description</p>
                <p className="mt-0.5 text-ink-muted">{product.shortDescription}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle">Category</p>
                <p className="mt-0.5 text-ink">{product.primaryCategoryPath}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 space-y-3">
            <h2 className="text-sm font-medium text-ink">Variants</h2>
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
                    <td className="py-2 font-medium text-ink">₹{(v.pricePaise / 100).toFixed(0)}</td>
                    <td className={`py-2 ${v.stock === 0 ? "text-danger" : v.stock <= 5 ? "text-warning" : "text-ink-muted"}`}>{v.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Danger zone */}
      {(canDelete) && (
        <section className="rounded-md border border-danger/20 bg-surface p-5 space-y-3">
          <h2 className="text-sm font-medium text-danger">Danger zone</h2>
          <div className="flex gap-3">
            <form action={archiveProduct.bind(null, product.slug)}>
              <button className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning hover:bg-warning/10">
                Archive product
              </button>
            </form>
            <form action={deleteProduct.bind(null, product.slug)}>
              <button className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger hover:bg-danger/10">
                Delete permanently
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
