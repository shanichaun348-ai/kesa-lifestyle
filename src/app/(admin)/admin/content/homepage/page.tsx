import { PageHeader } from "@/components/admin/page-header";
import { demoLook } from "@/lib/demo/homepage";
import { formatPaise } from "@/lib/money";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { effectivePrice, sortProducts } from "@/modules/catalog/listing";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { getHomeLook } from "@/modules/content/home-look-server";
import { HOME_RAIL_KEYS, HOME_RAILS, pinnedFor } from "@/modules/content/home-placements";

import { LookForm, type LookOption } from "./_look-form";
import { RailForm } from "./_rail-form";

const SECTIONS = [
  "Hero slides",
  "Category tiles",
  "New arrivals (editable below)",
  "Shop the look (editable below)",
  "Bestsellers (editable below)",
  "Kesa in motion (four product films, part of the site design)",
  "Brand statement",
  "Why Kesa",
  "Reviews",
  "Journal preview",
  "Newsletter",
];

export default async function HomepageEditorPage() {
  const session = await requireAdmin("content:read");
  const canWrite = hasPermission(session.role, "content:write");
  const [{ config, error }, active] = await Promise.all([getHomeLook(), getCatalogRepository().getAllActiveProducts()]);

  const options: LookOption[] = sortProducts(active, "newest").map((p) => ({
    slug: p.slug,
    name: p.name,
    thumb: p.images[0]?.src ?? null,
    priceLabel: formatPaise(effectivePrice(p).pricePaise),
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Homepage sections" back={{ href: "/admin/content/", label: "Content" }} description="What appears on the home page, top to bottom" />

      {error && error.code !== "unconfigured" ? (
        <p role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink">{error.message}</p>
      ) : null}

      {HOME_RAIL_KEYS.map((rail) => (
        <section key={rail} className="space-y-3">
          <h2 className="text-sm font-medium text-ink">{HOME_RAILS[rail].label}</h2>
          <p className="text-sm text-ink-muted">
            Choose published products to always show first in this row. The rest of the row fills itself ({rail === "newArrivals" ? "newest pieces" : "best-selling pieces"}). A piece that is later unpublished drops out on its own.
          </p>
          <RailForm rail={rail} options={options} initialSlugs={pinnedFor(active, rail).map((p) => p.slug)} canWrite={canWrite} />
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink">Shop the look</h2>
        <p className="text-sm text-ink-muted">Up to six live pieces listed beside the photo, in this order. Only published products can be chosen; a piece that is later unpublished drops out on its own.</p>
        <LookForm options={options} initialSlugs={config.productSlugs} initialHref={config.href} imageSrc={demoLook.image.src} canWrite={canWrite} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink">Section order</h2>
        <ol className="max-w-2xl divide-y divide-line rounded-md border border-line bg-surface">
          {SECTIONS.map((label, i) => (
            <li key={label} className="flex items-center gap-4 px-4 py-2.5 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-xs text-ink-subtle">{i + 1}</span>
              <span className="text-ink">{label}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink-subtle">The order is fixed in the site code for now. Hero slides and the brand photo are changed by the developer.</p>
      </section>
    </div>
  );
}
