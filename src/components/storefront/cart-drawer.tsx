"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EmptyState } from "@/components/storefront/empty-state";
import { Price } from "@/components/storefront/price";
import { cartTotals, type CartLine } from "@/modules/cart/store";
import { useCart } from "@/modules/cart/use-cart";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";
import { formatPaise } from "@/lib/money";

/** Showcase-only shape; the drawer reads the bag store by default. */
export type CartDrawerLine = {
  id: string;
  name: string;
  variant?: string | undefined;
  quantity: number;
  pricePaise: number;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
};

type CartDrawerProps = {
  /** Static lines for the design-system showcase; omit to use the live bag. */
  lines?: CartDrawerLine[] | undefined;
  /** Custom trigger; defaults to the header bag button. */
  trigger?: React.ReactNode;
};

function toStoreLines(lines: CartDrawerLine[]): CartLine[] {
  return lines.map((l) => ({
    sku: l.id,
    productSlug: "",
    name: l.name,
    optionLabel: l.variant,
    unitPricePaise: l.pricePaise,
    quantity: l.quantity,
    image: l.image,
  }));
}

/**
 * Right-hand drawer over the bag store with quantity and remove controls.
 * On phones it takes 92% of the viewport width so the page peeks through.
 */
export function CartDrawer({ lines: staticLines, trigger }: CartDrawerProps) {
  const cart = useCart();
  const live = staticLines === undefined;
  const lines: readonly CartLine[] = live ? cart.lines : toStoreLines(staticLines);
  const { count, subtotalPaise } = cartTotals(lines);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`} className="relative -mr-2">
            <ShoppingBagIcon strokeWidth={1.5} aria-hidden="true" />
            {count > 0 ? (
              <span aria-hidden="true" className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] leading-4 font-medium text-bg">
                {count}
              </span>
            ) : null}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Your bag</SheetTitle>
          <SheetDescription>{count === 0 ? "Nothing here yet." : `${count} ${count === 1 ? "item" : "items"}`}</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 items-center px-5">
            <EmptyState
              icon={<ShoppingBagIcon strokeWidth={1.5} />}
              title="Your bag is empty"
              description="Pieces you add will appear here."
              action={
                <Button variant="secondary" asChild>
                  <Link href="/collections/new-arrivals/">Explore new arrivals</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {lines.map((line) => (
              <li key={line.sku} className="flex gap-4 py-4">
                <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                  <Image src={line.image.src} alt={line.image.alt} fill sizes="80px" unoptimized={line.image.unoptimized ?? false} className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {line.productSlug ? (
                    <Link href={`/products/${line.productSlug}/`} className="line-clamp-2 text-sm text-ink hover:underline hover:underline-offset-4">
                      {line.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm text-ink">{line.name}</p>
                  )}
                  {line.optionLabel ? <p className="type-small text-ink-muted">{line.optionLabel}</p> : null}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    {live ? (
                      <QuantityStepper
                        size="sm"
                        value={line.quantity}
                        max={MAX_QUANTITY_PER_LINE}
                        onChange={(q) => cart.setQuantity(line.sku, q, MAX_QUANTITY_PER_LINE)}
                        label={`Quantity for ${line.name}`}
                      />
                    ) : (
                      <p className="type-small text-ink-muted">Qty {line.quantity}</p>
                    )}
                    <Price pricePaise={line.unitPricePaise * line.quantity} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => live && cart.remove(line.sku)}
                  className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center self-start rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 ? (
          <SheetFooter>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <span className="type-price text-lg">{formatPaise(subtotalPaise)}</span>
            </div>
            <p className="type-small text-ink-subtle">Shipping and offers are calculated at checkout.</p>
            <Button size="lg" fullWidth asChild>
              <Link href="/checkout/">Checkout</Link>
            </Button>
            <Button variant="link" className="self-center" asChild>
              <Link href="/cart/">View bag</Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
