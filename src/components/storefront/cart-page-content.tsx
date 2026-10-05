"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useCart } from "@/components/cart/cart-provider";
import { EmptyState } from "@/components/storefront/empty-state";
import { InlineError } from "@/components/storefront/error-state";
import { Price } from "@/components/storefront/price";
import { ProductCardSkeleton } from "@/components/storefront/product-card-skeleton";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";
import { formatPaise } from "@/lib/money";

/** Full bag page over the server cart with coupon entry and a live summary. */
export function CartPageContent() {
  const { cart, ready, notConfigured, pending, setQuantity, remove, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = React.useState("");

  if (notConfigured) {
    return (
      <InlineError
        className="mt-8"
        title="The bag is not available on this environment"
        description="The store database has not been configured. See README → Database to run it locally."
      />
    );
  }

  if (!ready) {
    return (
      <ul className="mt-8 grid gap-6 sm:grid-cols-2" aria-busy="true">
        {[0, 1].map((i) => (
          <li key={i}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (!cart || cart.lines.length === 0) {
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

  const p = cart.pricing;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16" aria-busy={pending}>
      <ul className="divide-y divide-line border-y border-line">
        {cart.lines.map((line) => (
          <li key={line.sku} className="flex gap-4 py-5">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
              {line.image.src ? <Image src={line.image.src} alt={line.image.alt} fill sizes="96px" unoptimized={line.image.unoptimized ?? false} className="object-cover" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link href={`/products/${line.productSlug}/`} className="text-base text-ink hover:underline hover:underline-offset-4">
                {line.productName}
              </Link>
              {line.optionLabel ? <p className="type-small text-ink-muted">{line.optionLabel}</p> : null}
              <Price pricePaise={line.unitPricePaise} compareAtPaise={line.compareAtPaise ?? undefined} size="sm" className="mt-1" />
              {line.priceChanged ? <p className="type-small text-warning">The price changed since you added this.</p> : null}
              {line.issue === "out_of_stock" ? <p className="type-small text-danger">Sold out. Remove it to continue.</p> : null}
              {line.issue === "reduced_stock" ? <p className="type-small text-danger">Only {line.available} left. Reduce the quantity to continue.</p> : null}
              {line.issue === "unavailable" ? <p className="type-small text-danger">No longer available. Remove it to continue.</p> : null}
              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                <QuantityStepper size="sm" value={line.quantity} max={MAX_QUANTITY_PER_LINE} onChange={(q) => void setQuantity(line.sku, q)} label={`Quantity for ${line.productName}`} />
                <button type="button" onClick={() => void remove(line.sku)} className="type-small text-ink-muted underline underline-offset-4 hover:text-ink">
                  Remove
                </button>
              </div>
            </div>
            <Price pricePaise={line.lineTotalPaise} className="shrink-0" />
          </li>
        ))}
      </ul>

      <aside aria-label="Order summary" className="h-fit rounded-md border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="type-h3">Summary</h2>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void applyCoupon(code).then((ok) => ok && setCode(""));
          }}
        >
          <Label htmlFor="cart-coupon" className="sr-only">
            Coupon code
          </Label>
          <Input id="cart-coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" autoComplete="off" className="h-10" />
          <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" loading={pending}>
            Apply
          </Button>
        </form>
        {cart.coupon ? (
          <p className={`type-small mt-2 flex items-center justify-between gap-2 ${cart.coupon.applied ? "text-success" : "text-danger"}`}>
            <span>{cart.coupon.applied ? `${cart.coupon.code} applied` : cart.coupon.message}</span>
            <button type="button" onClick={() => void removeCoupon()} className="underline underline-offset-4">
              Remove
            </button>
          </p>
        ) : null}

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})</dt>
            <dd className="type-price">{formatPaise(p.subtotalPaise)}</dd>
          </div>
          {p.discountPaise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Discount</dt>
              <dd className="type-price text-success">−{formatPaise(p.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping (standard)</dt>
            <dd className="type-price">{p.shippingPaise === 0 ? "Free" : formatPaise(p.shippingPaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="text-ink">Total</dt>
            <dd className="type-price">{formatPaise(p.totalPaise)}</dd>
          </div>
          <p className="type-small text-ink-subtle">Includes {formatPaise(p.taxPaise)} GST. Final shipping and tax split are confirmed at checkout.</p>
        </dl>

        <Button size="lg" fullWidth className="mt-5" disabled={!cart.checkoutReady} asChild={cart.checkoutReady}>
          {cart.checkoutReady ? <Link href="/checkout/">Checkout</Link> : <span>Fix the items above to continue</span>}
        </Button>
      </aside>
    </div>
  );
}
