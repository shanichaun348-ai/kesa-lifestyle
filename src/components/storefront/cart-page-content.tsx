"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/storefront/empty-state";
import { Price } from "@/components/storefront/price";
import { useCart } from "@/modules/cart/use-cart";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";
import { trackBeginCheckout, trackRemoveFromCart } from "@/modules/analytics/events";
import { formatPaise } from "@/lib/money";

/** Full bag page over the bag store. Totals are provisional until the server cart exists. */
export function CartPageContent() {
  const cart = useCart();

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        icon={<ShoppingBagIcon strokeWidth={1.5} />}
        title="Your bag is empty"
        description="Pieces you add will appear here."
        action={
          <Button asChild>
            <Link href="/collections/new-arrivals/">Explore new arrivals</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
      <ul className="divide-y divide-line border-y border-line">
        {cart.lines.map((line) => (
          <li key={line.sku} className="flex gap-4 py-5">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
              <Image src={line.image.src} alt={line.image.alt} fill sizes="96px" unoptimized={line.image.unoptimized ?? false} className="object-cover" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link href={`/products/${line.productSlug}/`} className="text-base text-ink hover:underline hover:underline-offset-4">
                {line.name}
              </Link>
              {line.optionLabel ? <p className="type-small text-ink-muted">{line.optionLabel}</p> : null}
              <Price pricePaise={line.unitPricePaise} size="sm" className="mt-1" />
              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                <QuantityStepper size="sm" value={line.quantity} max={MAX_QUANTITY_PER_LINE} onChange={(q) => cart.setQuantity(line.sku, q, MAX_QUANTITY_PER_LINE)} label={`Quantity for ${line.name}`} />
                <button
                  type="button"
                  onClick={() => {
                    trackRemoveFromCart({
                      sku: line.sku,
                      productName: line.name,
                      pricePaise: line.unitPricePaise,
                      quantity: line.quantity,
                      ...(line.optionLabel ? { optionLabel: line.optionLabel } : {}),
                    });
                    cart.remove(line.sku);
                  }}
                  className="type-small text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </div>
            <Price pricePaise={line.unitPricePaise * line.quantity} className="shrink-0" />
          </li>
        ))}
      </ul>

      <aside aria-label="Order summary" className="h-fit rounded-md border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="type-h3">Summary</h2>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal ({cart.count} {cart.count === 1 ? "item" : "items"})</dt>
            <dd className="type-price">{formatPaise(cart.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="text-ink-muted">Calculated at checkout</dd>
          </div>
        </dl>
        <Button size="lg" fullWidth className="mt-5" asChild>
          <Link
            href="/checkout/"
            onClick={() => {
              trackBeginCheckout(
                cart.lines.map((l) => ({
                  sku: l.sku,
                  name: l.name,
                  unitPricePaise: l.unitPricePaise,
                  quantity: l.quantity,
                  ...(l.optionLabel ? { optionLabel: l.optionLabel } : {}),
                })),
              );
            }}
          >
            Checkout
          </Link>
        </Button>
        <p className="type-small mt-3 text-ink-subtle">Prices include GST. Final totals are confirmed at checkout.</p>
      </aside>
    </div>
  );
}
