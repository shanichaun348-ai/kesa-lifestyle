import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { effectivePrice } from "@/modules/catalog/listing";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/types";
import { getHomeLook } from "@/modules/content/home-look-server";
import { HOME_RAIL_KEYS, HOME_RAILS, railFlags } from "@/modules/content/home-placements";
import { formatPaise } from "@/lib/money";

import { ProductTable, type ProductRow } from "./_product-table";

const FILTERS: Array<{ label: string; value?: Product["status"] }> = [
  { label: "All" },
  { label: "Published", value: "active" },
  { label: "Drafts", value: "draft" },
  { label: "Archived", value: "archived" },
];

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

/** The list address for a status filter and search text, e.g. /admin/products/?status=active&q=om. */
function listHref(status: string | undefined, q: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin/products/?${query}` : "/admin/products/";
}

/** Matches the name, the URL slug or any variant SKU, ignoring case. */
function matchesSearch(product: Product, q: string): boolean {
  const needle = q.toLowerCase();
  return product.name.toLowerCase().includes(needle) || product.slug.toLowerCase().includes(needle) || product.variants.some((v) => v.sku.toLowerCase().includes(needle));
}

function toRow(product: Product, lookSlugs: readonly string[]): ProductRow {
  const { pricePaise } = effectivePrice(product);
  const rails = railFlags(product.tags);
  const placements = [...(lookSlugs.includes(product.slug) ? ["Shop the look"] : []), ...HOME_RAIL_KEYS.filter((r) => rails[r]).map((r) => HOME_RAILS[r].label)];
  return {
    slug: product.slug,
    name: product.name,
    thumb: product.images[0]?.src ?? null,
    skus: product.variants.map((v) => v.sku),
    category: product.primaryCategoryPath,
    extraCategories: product.categoryPaths.filter((p) => p !== product.primaryCategoryPath),
    placements,
    priceLabel: formatPaise(pricePaise),
    stock: product.variants.reduce((s, v) => s + v.stock, 0),
    status: product.status,
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const [session, { status, q: rawQuery }] = await Promise.all([requireAdmin("products:read"), searchParams]);
  const q = (rawQuery ?? "").trim().slice(0, 100);
  const [all, { config: look }] = await Promise.all([getCatalogRepository().getAllProducts(), getHomeLook()]);
  const active = FILTERS.find((f) => f.value === status)?.value;
  const products = (active ? all.filter((p) => p.status === active) : all.filter((p) => p.status !== "archived"))
    .filter((p) => q === "" || matchesSearch(p, q))
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

      <form action="/admin/products/" method="get" role="search" className="flex flex-wrap items-center gap-2">
        {active ? <input type="hidden" name="status" value={active} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or SKU"
          aria-label="Search products by name, SKU or URL"
          className="h-10 w-full max-w-md rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
        />
        <button type="submit" className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
          Search
        </button>
        {q ? (
          <Link href={listHref(active, "")} className="text-sm text-brand hover:underline">
            Clear
          </Link>
        ) : null}
      </form>
      {q ? (
        <p className="text-sm text-ink-muted" role="status">
          {products.length === 0 ? "No products match" : `${products.length} ${products.length === 1 ? "product matches" : "products match"}`} “{q}”.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={listHref(f.value, q)}
            className={`rounded-sm border px-3 py-1.5 text-sm ${f.value === active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* key resets the selection when the filter changes */}
      <ProductTable key={`${active ?? "all"}|${q}`} rows={products.map((p) => toRow(p, look.productSlugs))} canWrite={canWrite} canDelete={canDelete} />
    </div>
  );
}
