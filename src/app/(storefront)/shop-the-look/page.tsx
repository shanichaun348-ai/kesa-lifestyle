import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AddLookToBag } from "@/components/look/add-look-to-bag";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { Price } from "@/components/storefront/price";
import { demoLook } from "@/lib/demo/homepage";
import { formatPaise } from "@/lib/money";
import { sortProducts } from "@/modules/catalog/listing";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { pickLookProducts } from "@/modules/content/home-look";
import { getHomeLook } from "@/modules/content/home-look-server";
import { lookTotals, toLookPiece } from "@/modules/content/look-bag";

// Same freshness as the homepage, which lists the same pieces.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop the Look",
  description: "Every piece from the look, together: add them all to your bag in one tap or buy the full look straight away.",
  alternates: { canonical: "/shop-the-look/" },
};

/**
 * The look from the homepage as its own page: the photograph, each piece
 * with its price and a link to its page, the total, and two buttons that
 * put the whole look in the bag (and, for "Buy the full look", go straight
 * to checkout). The pieces are the owner's picks from Admin → Content →
 * Homepage, exactly as on the home page.
 */
export default async function ShopTheLookPage() {
  const repo = getCatalogRepository();
  const [{ config }, active] = await Promise.all([getHomeLook(), repo.getAllActiveProducts()]);
  const chosen = config.productSlugs.length > 0 ? await repo.getProductsBySlugs(config.productSlugs) : [];
  const products = pickLookProducts(config, chosen, sortProducts(active, "newest"));
  const pieces = products.map(toLookPiece);
  const totals = lookTotals(pieces);

  return (
    <Container className="py-8 lg:py-12 [--container-page:82.5rem]">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop the look" }]} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <figure className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-sm bg-surface-muted lg:col-span-5">
          <Image src={demoLook.image.src} alt={demoLook.image.alt} fill priority sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
        </figure>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 lg:justify-center">
          <div className="flex flex-col gap-2">
            <p className="type-eyebrow text-ink-subtle">The complete look</p>
            <h1 className="type-h1">Shop the look</h1>
            <p className="type-body max-w-prose text-ink-muted">
              {pieces.length === 1 ? "The piece" : `All ${pieces.length} pieces`} from the photograph, together. Add them to your bag in one tap, or open any piece to choose a different option.
            </p>
          </div>

          <ul className="divide-y divide-line border-y border-line" aria-label="Pieces in this look">
            {pieces.map((piece) => (
              <li key={piece.slug} className="flex items-center gap-5 py-5">
                <Link href={piece.href} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={piece.name}>
                  <Image src={piece.image.src} alt="" fill sizes="80px" unoptimized={piece.image.unoptimized ?? false} className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={piece.href} className="line-clamp-2 text-lg font-medium text-ink outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                    {piece.name}
                  </Link>
                  {piece.line?.optionLabel ? <p className="text-sm text-ink-muted">{piece.line.optionLabel}</p> : null}
                  <Price pricePaise={piece.pricePaise} compareAtPaise={piece.compareAtPaise} size="sm" />
                  {!piece.line ? <p className="text-sm text-danger">Sold out, not included</p> : null}
                </div>
              </li>
            ))}
          </ul>

          {totals.available > 0 ? (
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-sm text-ink-muted">
                {totals.available === 1 ? "1 piece" : `${totals.available} pieces`}
                {totals.soldOut > 0 ? ` (${totals.soldOut} sold out)` : ""}
              </p>
              <p className="flex items-baseline gap-3">
                <span className="font-display text-2xl text-ink">{formatPaise(totals.totalPaise)}</span>
                {totals.savingsPaise > 0 ? (
                  <>
                    <s className="text-sm text-ink-subtle">{formatPaise(totals.compareTotalPaise)}</s>
                    <span className="text-sm font-medium text-success">You save {formatPaise(totals.savingsPaise)}</span>
                  </>
                ) : null}
              </p>
            </div>
          ) : (
            <p className="type-body text-ink-muted">These pieces are sold out right now. New stock arrives regularly.</p>
          )}

          <AddLookToBag pieces={pieces} />

          <p className="text-sm text-ink-muted">
            Prices include GST.{" "}
            <Link href={config.href} className="text-brand underline-offset-4 hover:underline">
              Browse more pieces
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
}
