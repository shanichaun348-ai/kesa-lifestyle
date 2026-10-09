import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { effectivePrice } from "@/modules/catalog/listing";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { formatPaise } from "@/lib/money";

import { ProductTable, type ProductRow } from "./_product-table";

const FILTERS: Array<{ label: string; value?: Product["status"] }> = [
  { label: "All" },
  { label: "Published", value: "active" },
  { label: "Drafts", value: "draft" },
  { label: "Archived", value: "archived" },
];

type Props = { searchParams: Promise<{ status?: string }> };

function toRow(product: Product): ProductRow {
  const { pricePaise } = effectivePrice(product);
  return {
    slug: product.slug,
    name: product.name,
    thumb: product.images[0]?.src ?? null,
    category: product.primaryCategoryPath,
    priceLabel: formatPaise(pricePaise),
    stock: product.variants.reduce((s, v) => s + v.stock, 0),
    status: product.status,
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const [session, { status }] = await Promise.all([requireAdmin("products:read"), searchParams]);
  const all = await getCatalogRepository().getAllProducts();
  const active = FILTERS.find((f) => f.value === status)?.value;
  const products = (active ? all.filter((p) => p.status === active) : all.filter((p) => p.status !== "archived"))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const counts = { active: all.filter((p) => p.status === "active").length, draft: all.filter((p) => p.status === "draft").length };
  const canWrite = hasPermission(session.role, "products:write");
  const canDelete = hasPermission(session.role, "products:delete");

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

      {/* key resets the selection when the filter changes */}
      <ProductTable key={active ?? "all"} rows={products.map(toRow)} canWrite={canWrite} canDelete={canDelete} />
    </div>
  );
}
