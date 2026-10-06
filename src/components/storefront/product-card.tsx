import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/storefront/price";
import { QuickAddButton } from "@/components/storefront/quick-add-button";
import { QuickViewButton } from "@/components/storefront/quick-view-button";
import { RatingStars } from "@/components/storefront/rating-stars";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import type { QuickViewProduct } from "@/modules/catalog/presenters";
import { cn } from "@/lib/utils";

export type ProductCardImage = {
  src: string;
  alt: string;
  /** Set for local SVG placeholders; real product photos go through the optimiser. */
  unoptimized?: boolean | undefined;
};

export type ProductCardSibling = {
  label: string;
  hex: string;
  href: string;
};

export type ProductCardData = {
  slug: string;
  name: string;
  pricePaise: number;
  compareAtPaise?: number | undefined;
  image: ProductCardImage;
  hoverImage?: ProductCardImage | undefined;
  badge?: { label: string; variant?: "outline" | "solid" | "muted" | "success" | "warning" | "danger" } | undefined;
  rating?: { value: number; count: number } | undefined;
  siblings?: ProductCardSibling[] | undefined;
  /** Single-variant products can be added straight from the card. */
  quickAdd?: { sku: string; unitPricePaise: number } | undefined;
  soldOut?: boolean | undefined;
  /** When present, a quick-view control is rendered on pointer devices. */
  quickView?: QuickViewProduct | undefined;
};

type ProductCardProps = {
  product: ProductCardData;
  /** Set on the first row of a grid so the LCP image loads eagerly. */
  priority?: boolean;
  className?: string;
};

const IMAGE_SIZES = "(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw";

/**
 * Editorial product card: 3:4 image, name, price.
 *
 * Accessibility pattern: the product name is the single link, stretched over
 * the whole card with a `::after` overlay. Wishlist, quick-add, quick-view and
 * sibling swatches sit above the overlay (`z-10`), so they are real siblings
 * of the link rather than interactive elements nested inside it.
 */
export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const href = `/products/${product.slug}/`;

  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-surface-muted">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes={IMAGE_SIZES}
          priority={priority}
          unoptimized={product.image.unoptimized ?? false}
          className={cn(
            "object-cover transition-opacity duration-250 ease-(--ease-standard)",
            product.hoverImage && "group-hover/card:opacity-0 group-focus-within/card:opacity-0",
            product.soldOut && "opacity-60",
          )}
        />
        {product.hoverImage ? (
          <Image
            src={product.hoverImage.src}
            alt=""
            fill
            sizes={IMAGE_SIZES}
            unoptimized={product.hoverImage.unoptimized ?? false}
            className="object-cover opacity-0 transition-opacity duration-250 ease-(--ease-standard) group-hover/card:opacity-100 group-focus-within/card:opacity-100"
          />
        ) : null}

        {product.soldOut ? (
          <Badge variant="solid" className="absolute bottom-3 left-3">
            Sold out
          </Badge>
        ) : product.badge ? (
          <Badge variant={product.badge.variant ?? "outline"} className="absolute bottom-3 left-3">
            {product.badge.label}
          </Badge>
        ) : null}

        <WishlistButton productSlug={product.slug} productName={product.name} className="absolute top-2 right-2 z-10" />

        {product.quickView ? (
          <QuickViewButton
            product={product.quickView}
            className={cn(
              "absolute top-2 left-2 z-10 hidden md:inline-flex",
              "md:-translate-y-1 md:opacity-0 md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100 md:group-focus-within/card:translate-y-0 md:group-focus-within/card:opacity-100",
            )}
          />
        ) : null}

        {product.quickAdd && !product.soldOut ? (
          <QuickAddButton
            productName={product.name}
            productSlug={product.slug}
            sku={product.quickAdd.sku}
            unitPricePaise={product.quickAdd.unitPricePaise}
            image={product.image}
            className={cn(
              "absolute right-2 bottom-2 z-10",
              // Always visible on touch devices; revealed on hover/focus with a pointer.
              "md:translate-y-1 md:opacity-0 md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100 md:group-focus-within/card:translate-y-0 md:group-focus-within/card:opacity-100",
            )}
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <h3 className="line-clamp-2 font-sans text-sm leading-snug font-normal text-ink">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-sm after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
          >
            {product.name}
          </Link>
        </h3>
        <Price pricePaise={product.pricePaise} compareAtPaise={product.compareAtPaise} size="sm" />
        {product.rating ? <RatingStars rating={product.rating.value} count={product.rating.count} /> : null}
      </div>

      {product.siblings && product.siblings.length > 0 ? (
        <ul className="relative z-10 mt-2 flex items-center gap-1.5" aria-label="Also available in">
          {product.siblings.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-label={s.label}
                title={s.label}
                className="block size-4 rounded-full border border-line-strong outline-none ring-offset-2 ring-offset-bg focus-visible:ring-2 focus-visible:ring-brand"
                style={{ backgroundColor: s.hex }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
