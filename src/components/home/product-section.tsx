import type { ProductCardData } from "@/components/storefront/product-card";
import { ProductRail } from "@/components/storefront/product-rail";


type ProductSectionProps = {
  id: string;
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  viewAll: { label: string; href: string };
  products: ProductCardData[];
  /** Eagerly load the first N product images (pass 4 for above-the-fold rails). */
  priorityCount?: number | undefined;
};

/** New Arrivals, Best Sellers and any merchandised product row. Renders nothing while the row is empty. */
export function ProductSection({ id, eyebrow, title, description, viewAll, products, priorityCount }: ProductSectionProps) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`} className="container-page reveal">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-prose flex-col gap-2">
          {eyebrow ? <p className="type-eyebrow text-ink-subtle">{eyebrow}</p> : null}
          <h2 id={`${id}-title`} className="type-h2">
            {title}
          </h2>
          {description ? <p className="type-body text-ink-muted">{description}</p> : null}
        </div>
        <a
          href={viewAll.href}
          className="type-small shrink-0 font-medium text-ink underline decoration-line-strong underline-offset-6 hover:decoration-ink"
        >
          {viewAll.label}
        </a>
      </div>
      <ProductRail products={products} label={title} className="lg:grid-cols-5" {...(priorityCount !== undefined ? { priorityCount } : {})} />
    </section>
  );
}

