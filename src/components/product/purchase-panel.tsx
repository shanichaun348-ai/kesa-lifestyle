"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Price } from "@/components/storefront/price";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { useCart } from "@/modules/cart/use-cart";
import { availabilityOf, maxQuantity, type Availability } from "@/modules/catalog/variants";
import { trackAddToCart } from "@/modules/analytics/events";
import { cn } from "@/lib/utils";

export type PurchaseOption = {
  sku: string;
  label: string;
  stock: number;
  pricePaise: number;
  compareAtPaise?: number | undefined;
};

type PurchasePanelProps = {
  productSlug: string;
  productName: string;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  optionName: "Size" | "Length" | undefined;
  options: PurchaseOption[];
  /** SKU preselected from `?variant=`; single-variant products pass their only SKU. */
  initialSku: string | null;
  lowStockThreshold: number;
  sizeGuideHref?: string | undefined;
  /** Primary category path — passed through to analytics. */
  categoryPath?: string | undefined;
};

const AVAILABILITY_COPY: Record<Availability, string> = {
  in_stock: "In stock. Dispatched in 1–2 business days.",
  low_stock: "Low stock.",
  out_of_stock: "Sold out.",
};

/**
 * Price, variant selection, quantity, Add to bag, Buy now, wishlist and
 * availability. Variant choice updates `?variant=` via replaceState so the
 * link is shareable without a navigation; the canonical stays the base URL.
 */
export function PurchasePanel(props: PurchasePanelProps) {
  const router = useRouter();
  const cart = useCart();
  const hasOptions = props.optionName !== undefined && props.options.length > 1;
  const [sku, setSku] = React.useState<string | null>(props.initialSku);
  const [quantity, setQuantity] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  // Sticky bar on phones: shown once the main Add to bag button has scrolled off the top.
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = React.useState(false);
  React.useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!!entry && !entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selected = props.options.find((o) => o.sku === sku) ?? null;
  const display = selected ?? props.options[0] ?? null;
  const anyStock = props.options.some((o) => o.stock > 0);
  const availability: Availability = selected
    ? availabilityOf(selected.stock, props.lowStockThreshold)
    : anyStock
      ? "in_stock"
      : "out_of_stock";
  const max = maxQuantity(selected ? { sku: selected.sku, pricePaise: selected.pricePaise, stock: selected.stock } : null);

  function choose(option: PurchaseOption) {
    if (option.stock <= 0) return;
    setSku(option.sku);
    setQuantity(1);
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", option.sku);
    window.history.replaceState(window.history.state, "", url);
  }

  function ensureSelection(): PurchaseOption | null {
    if (!selected) {
      setError(`Choose a ${props.optionName?.toLowerCase() ?? "variant"} first.`);
      return null;
    }
    if (selected.stock <= 0) {
      setError("This option is sold out.");
      return null;
    }
    return selected;
  }

  function addToBag(): boolean {
    const option = ensureSelection();
    if (!option) return false;
    cart.add(
      {
        sku: option.sku,
        productSlug: props.productSlug,
        name: props.productName,
        optionLabel: hasOptions ? `${props.optionName}: ${option.label}` : undefined,
        unitPricePaise: option.pricePaise,
        image: props.image,
      },
      quantity,
      maxQuantity({ sku: option.sku, pricePaise: option.pricePaise, stock: option.stock }),
    );
    trackAddToCart({
      sku: option.sku,
      productName: props.productName,
      pricePaise: option.pricePaise,
      quantity,
      ...(props.categoryPath ? { categoryPath: props.categoryPath } : {}),
      ...(hasOptions ? { optionLabel: `${props.optionName}: ${option.label}` } : {}),
    });
    return true;
  }

  function onAdd() {
    if (!addToBag()) return;
    toast.success("Added to bag", {
      description: props.productName,
      action: { label: "View bag", onClick: () => router.push("/cart/") },
    });
  }

  function onBuyNow() {
    if (!addToBag()) return;
    router.push("/checkout/");
  }

  return (
    <div className="flex flex-col gap-5">
      {display ? <Price pricePaise={display.pricePaise} compareAtPaise={display.compareAtPaise} size="lg" /> : null}
      <p className="type-small -mt-3 text-ink-subtle">Inclusive of all taxes</p>

      {hasOptions ? (
        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium text-ink">
              {props.optionName}
              {selected ? <span className="ml-1.5 font-normal text-ink-muted">{selected.label}</span> : null}
            </legend>
            {props.sizeGuideHref ? (
              <Link href={props.sizeGuideHref} className="type-small text-brand underline underline-offset-4">
                Size guide
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={props.optionName} aria-describedby={error ? "purchase-error" : undefined}>
            {props.options.map((o) => {
              const out = o.stock <= 0;
              return (
                <button
                  key={o.sku}
                  type="button"
                  role="radio"
                  aria-checked={sku === o.sku}
                  aria-disabled={out}
                  aria-label={out ? `${o.label}, sold out` : o.label}
                  onClick={() => choose(o)}
                  className={cn(
                    "h-11 min-w-14 rounded-sm border px-3 text-sm transition-colors",
                    sku === o.sku ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink hover:border-ink",
                    out && "cursor-not-allowed text-ink-subtle line-through hover:border-line-strong",
                    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <p
        className={cn("type-small", availability === "out_of_stock" ? "text-danger" : availability === "low_stock" ? "text-warning" : "text-success")}
        role="status"
      >
        {availability === "low_stock" && selected ? `Only ${selected.stock} left.` : AVAILABILITY_COPY[availability]}
      </p>

      {error ? (
        <p id="purchase-error" role="alert" className="type-small text-danger">
          {error}
        </p>
      ) : null}

      {availability !== "out_of_stock" ? (
        <div ref={actionsRef} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <QuantityStepper value={quantity} max={Math.max(1, max || 1)} onChange={setQuantity} />
            <Button size="lg" className="flex-1" onClick={onAdd}>
              Add to bag
            </Button>
            <WishlistButton productSlug={props.productSlug} productName={props.productName} pricePaise={display?.pricePaise} className="border border-line" />
          </div>
          <Button size="lg" variant="secondary" fullWidth onClick={onBuyNow}>
            Buy now
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button size="lg" className="flex-1" disabled>
              Sold out
            </Button>
            <WishlistButton productSlug={props.productSlug} productName={props.productName} pricePaise={display?.pricePaise} className="border border-line" />
          </div>
          <p className="type-small text-ink-muted">
            Save it to your wishlist. Back-in-stock alerts arrive with customer accounts; until then the wishlist is the way to keep track.
          </p>
        </div>
      )}

      {availability !== "out_of_stock" ? (
        <div
          aria-hidden={!showSticky}
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur supports-backdrop-filter:bg-bg/85 lg:hidden",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-250 ease-(--ease-standard)",
            showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
          )}
        >
          <div className="container-page flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{props.productName}</p>
              {display ? <Price pricePaise={display.pricePaise} compareAtPaise={display.compareAtPaise} size="sm" /> : null}
            </div>
            <Button size="md" onClick={onAdd} tabIndex={showSticky ? 0 : -1}>
              Add to bag
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
