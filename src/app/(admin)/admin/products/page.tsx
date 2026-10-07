import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { productStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { effectivePrice } from "@/modules/catalog/listing";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { formatPaise } from "@/lib/money";

const FILTERS: Array<{ label: string; value?: Product["status"] }> = [
  { label: "All" },
  { label: "Published", value: "active" },
  { label: "Drafts", value: "draft" },
  { label: "Archived", value: "archived" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const [session, { status }] = await Promise.all([requireAdmin("products:read"), searchParams]);
  const all = await getCatalogRepository().getAllProducts();
  const active = FILTERS.find((f) => f.value === status)?.value;
  const products = (active ? all.filter((p) => p.status === active) : all.filter((p) => p.status !== "archived"))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const counts = { active: all.filter((p) => p.status === "active").length, draft: all.filter((p) => p.status === "draft").length };
  const canWrite = hasPermission(session.role, "products:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${counts.active} published · ${counts.draft} draft`}
        actions={
          canWrite ? (
            <Link href="/admin/products/new/" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
              + Add product
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/products/?status=${f.value}` : "/admin/products/"}
            className={`rounded-sm border px-3 py-1.5 text-sm ${f.value === active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {products.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">No products here.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Product</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Price</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => {
                const { pricePaise } = effectivePrice(product);
                const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
                const thumb = product.images[0];
                return (
                  <tr key={product.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-muted">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb.src} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-[10px] text-warning" title="No photo">No photo</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{product.name}</p>
                          <p className="truncate text-xs text-ink-subtle">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{product.primaryCategoryPath}</td>
                    <td className="hidden px-4 py-3 font-medium text-ink sm:table-cell">{formatPaise(pricePaise)}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={totalStock === 0 ? "text-danger" : totalStock <= 5 ? "text-warning" : "text-ink-muted"}>{totalStock} units</span>
                    </td>
                    <td className="px-4 py-3">{productStatusBadge(product.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/products/${product.slug}/`} className="text-sm text-brand hover:underline">{canWrite ? "Edit" : "View"}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
