"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/components/cart/cart-provider";
import { EmptyState } from "@/components/storefront/empty-state";
import { Price } from "@/components/storefront/price";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";
import { formatPaise } from "@/lib/money";

/** Showcase-only shape for the design-system page. */
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
  trigger?: React.ReactNode;
};

type DrawerLine = {
  key: string;
  sku: string | null;
  name: string;
  href: string | null;
  optionLabel: string | null;
  quantity: number;
  unitPricePaise: number;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  issue: string | null;
};

/**
 * Right-hand drawer over the server bag. On phones it takes 92% of the
 * viewport so the page peeks through.
 */
export function CartDrawer({ lines: staticLines, trigger }: CartDrawerProps) {
  const cart = useCart();
  const live = staticLines === undefined;

  const lines: DrawerLine[] = live
    ? (cart.cart?.lines ?? []).map((l) => ({
        key: l.sku,
        sku: l.sku,
        name: l.productName,
        href: `/products/${l.productSlug}/`,
        optionLabel: l.optionLabel,
        quantity: l.quantity,
        unitPricePaise: l.unitPricePaise,
        image: l.image,
        issue: l.issue === "out_of_stock" ? "Sold out" : l.issue === "reduced_stock" ? `Only ${l.available} left` : l.issue === "unavailable" ? "No longer available" : null,
      }))
    : staticLines.map((l) => ({ key: l.id, sku: null, name: l.name, href: null, optionLabel: l.variant ?? null, quantity: l.quantity, unitPricePaise: l.pricePaise, image: l.image, issue: null }));

  const count = live ? cart.itemCount : lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = live ? (cart.cart?.pricing.subtotalPaise ?? 0) : lines.reduce((n, l) => n + l.unitPricePaise * l.quantity, 0);

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

        {live && cart.notConfigured ? (
          <p className="type-small px-5 py-4 text-ink-muted">The store database is not configured on this environment, so the bag cannot be saved yet.</p>
        ) : null}

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
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5" aria-busy={live && cart.pending}>
            {lines.map((line) => (
              <li key={line.key} className="flex gap-4 py-4">
                <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                  {line.image.src ? <Image src={line.image.src} alt={line.image.alt} fill sizes="80px" unoptimized={line.image.unoptimized ?? false} className="object-cover" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {line.href ? (
                    <Link href={line.href} className="line-clamp-2 text-sm text-ink hover:underline hover:underline-offset-4">
                      {line.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm text-ink">{line.name}</p>
                  )}
                  {line.optionLabel ? <p className="type-small text-ink-muted">{line.optionLabel}</p> : null}
                  {line.issue ? <p className="type-small text-danger">{line.issue}</p> : null}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    {live && line.sku ? (
                      <QuantityStepper size="sm" value={line.quantity} max={MAX_QUANTITY_PER_LINE} onChange={(q) => void cart.setQuantity(line.sku ?? "", q)} label={`Quantity for ${line.name}`} />
                    ) : (
                      <p className="type-small text-ink-muted">Qty {line.quantity}</p>
                    )}
                    <Price pricePaise={line.unitPricePaise * line.quantity} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => line.sku && void cart.remove(line.sku)}
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
              <span className="type-price text-lg">{formatPaise(subtotal)}</span>
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
