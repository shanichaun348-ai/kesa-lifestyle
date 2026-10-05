"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Price } from "@/components/storefront/price";
import { RatingStars } from "@/components/storefront/rating-stars";
import type { QuickViewProduct } from "@/modules/catalog/presenters";
import { cn } from "@/lib/utils";

type QuickViewButtonProps = {
  product: QuickViewProduct;
  className?: string;
};

/**
 * Quick view: a dialog with the essentials and a link to the full page.
 * Rendered only on pointer devices (the card hides it below `md`), because
 * on a phone the product page is one tap away and a dialog adds nothing.
 */
export function QuickViewButton({ product, className }: QuickViewButtonProps) {
  const cart = useCart();
  const [selected, setSelected] = React.useState<string | null>(product.options.find((o) => o.inStock)?.sku ?? null);
  const needsOption = product.optionName !== undefined && product.options.length > 1;

  async function addToBag() {
    const sku = needsOption ? selected : (product.options[0]?.sku ?? null);
    if (!sku) return;
    const ok = await cart.add(sku, 1);
    if (ok) toast.success("Added to bag", { description: product.name });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/90 px-3 text-xs font-medium text-ink shadow-(--shadow-float) backdrop-blur-sm",
            "transition-[opacity,transform] duration-250 ease-(--ease-standard)",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            className,
          )}
        >
          <EyeIcon className="size-4" aria-hidden="true" />
          Quick view
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-surface-muted">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              sizes="(min-width: 640px) 320px, 100vw"
              unoptimized={product.image.unoptimized ?? false}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="type-h3">{product.name}</DialogTitle>
              <DialogDescription>{product.shortDescription}</DialogDescription>
            </DialogHeader>
            <Price pricePaise={product.pricePaise} compareAtPaise={product.compareAtPaise} size="lg" />
            {product.rating ? <RatingStars rating={product.rating.value} count={product.rating.count} /> : null}

            {needsOption ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-ink">{product.optionName}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={product.optionName}>
                  {product.options.map((o) => (
                    <button
                      key={o.sku}
                      type="button"
                      role="radio"
                      aria-checked={selected === o.sku}
                      disabled={!o.inStock}
                      onClick={() => setSelected(o.sku)}
                      className={cn(
                        "h-10 min-w-12 rounded-sm border px-3 text-sm transition-colors",
                        selected === o.sku ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink hover:border-ink",
                        !o.inStock && "cursor-not-allowed line-through opacity-50",
                        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="mt-auto flex flex-col gap-3">
              <Button size="lg" fullWidth disabled={!product.inStock || (needsOption && !selected)} onClick={() => void addToBag()}>
                {product.inStock ? "Add to bag" : "Sold out"}
              </Button>
              <Button variant="link" className="self-center" asChild>
                <Link href={product.href}>View full details</Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
