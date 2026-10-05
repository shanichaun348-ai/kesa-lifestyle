import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { productStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { formatPaise } from "@/lib/money";
import { effectivePrice } from "@/modules/catalog/listing";
import { hasPermission } from "@/modules/admin/rbac";

export default async function ProductsPage() {
  const session = await requireAdmin("products:read");
  const products = await getCatalogRepository().getAllActiveProducts();
  const repo = getCatalogRepository();
  const archived = await repo.getArchivedProductBySlug("__none__").then(() => [] as typeof products).catch(() => [] as typeof products);
  void archived;

  const canWrite = hasPermission(session.role, "products:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${products.length} active products`}
        actions={
          canWrite ? (
            <Link
              href="/admin/products/new/"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover"
            >
              + Add product
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["All", "Active", "Draft", "Archived"].map((f) => (
          <button
            key={f}
            className={`rounded-sm border px-3 py-1.5 text-sm ${f === "All" ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Product</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Category</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Price</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              {canWrite ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => {
              const { pricePaise } = effectivePrice(product);
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={product.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-ink">{product.name}</p>
                      <p className="text-xs text-ink-subtle">{product.slug}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{product.primaryCategoryPath}</td>
                  <td className="hidden px-4 py-3 font-medium text-ink sm:table-cell">{formatPaise(pricePaise)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className={totalStock === 0 ? "text-danger" : totalStock <= 5 ? "text-warning" : "text-ink-muted"}>
                      {totalStock} units
                    </span>
                  </td>
                  <td className="px-4 py-3">{productStatusBadge(product.status)}</td>
                  {canWrite ? (
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/products/${product.id}/`} className="text-sm text-brand hover:underline">
                        Edit
                      </Link>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
