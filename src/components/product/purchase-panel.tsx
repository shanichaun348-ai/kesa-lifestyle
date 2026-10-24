"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Price } from "@/components/storefront/price";
import { WhatsAppIcon } from "@/components/storefront/whatsapp-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { formatPaise } from "@/lib/money";
import { site, whatsappHref } from "@/lib/site";
import { localCartStore } from "@/modules/cart/store";
import { useCart } from "@/modules/cart/use-cart";
import { discountPercent } from "@/modules/catalog/pdp";
import { availabilityOf, maxQuantity, type Availability } from "@/modules/catalog/variants";
import { trackAddToCart, trackBeginCheckout } from "@/modules/analytics/events";
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
  // Brief "adding" state so the button visibly acknowledges the tap; the add itself is synchronous.
  const [adding, setAdding] = React.useState(false);
  const addingTimer = React.useRef<number | null>(null);
  React.useEffect(() => () => { if (addingTimer.current) window.clearTimeout(addingTimer.current); }, []);

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

  /**
   * "add" stacks on whatever is already in the bag (Add to bag). "ensure" is
   * Buy now: the line must be in the bag at the chosen quantity, but a shopper
   * who already added it must not end up with a second copy at checkout.
   */
  function addToBag(mode: "add" | "ensure"): boolean {
    const option = ensureSelection();
    if (!option) return false;
    const alreadyInBag = cart.lines.some((l) => l.sku === option.sku);
    const line = {
      sku: option.sku,
      productSlug: props.productSlug,
      name: props.productName,
      optionLabel: hasOptions ? `${props.optionName}: ${option.label}` : undefined,
      unitPricePaise: option.pricePaise,
      image: props.image,
    };
    const limit = maxQuantity({ sku: option.sku, pricePaise: option.pricePaise, stock: option.stock });
    if (mode === "ensure") cart.ensure(line, quantity, limit);
    else cart.add(line, quantity, limit);
    // Nothing new went into the bag, so there is no add_to_cart to report.
    if (mode === "ensure" && alreadyInBag) return true;
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
    if (!addToBag("add")) return;
    setAdding(true);
    if (addingTimer.current) window.clearTimeout(addingTimer.current);
    addingTimer.current = window.setTimeout(() => setAdding(false), 500);
    toast.success("Added to bag", {
      description: props.productName,
      action: { label: "View bag", onClick: () => router.push("/cart/") },
    });
  }

  const saving = display ? discountPercent(display.pricePaise, display.compareAtPaise) : null;

  function onBuyNow() {
    if (!addToBag("ensure")) return;
    // Buy now skips the bag, so report the checkout start here with the bag
    // as it is right now (the store snapshot, not this render's stale lines).
    trackBeginCheckout(
      localCartStore.getSnapshot().map((l) => ({
        sku: l.sku,
        name: l.name,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        ...(l.optionLabel ? { optionLabel: l.optionLabel } : {}),
      })),
    );
    router.push("/checkout/");
  }

  return (
    <div className="flex flex-col gap-5">
      {display ? (
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="type-price font-display text-4xl text-ink dark:text-highlight">{formatPaise(display.pricePaise)}</span>
            {saving !== null && display.compareAtPaise !== undefined ? (
              <>
                <s className="type-price text-lg font-normal text-ink-subtle">
                  <span className="sr-only">Original price </span>
                  {formatPaise(display.compareAtPaise)}
                </s>
                <span className="inline-flex h-6 items-center rounded-full bg-success/15 px-2.5 text-xs font-medium text-success">{saving}% off</span>
              </>
            ) : null}
          </p>
          <p className="type-small text-ink-subtle">Inclusive of all taxes</p>
        </div>
      ) : null}

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
                    "min-h-11 min-w-14 rounded-xl border px-4 text-sm transition-[border-color,background-color,box-shadow] duration-150",
                    sku === o.sku
                      ? "border-highlight bg-highlight/10 font-medium text-ink ring-1 ring-highlight/60"
                      : "border-line-strong bg-surface text-ink hover:border-highlight",
                    out && "cursor-not-allowed border-line text-ink-subtle line-through hover:border-line",
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
        className={cn(
          "type-small inline-flex items-center gap-2",
          availability === "out_of_stock" ? "text-danger" : availability === "low_stock" ? "text-warning" : "text-success",
        )}
        role="status"
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
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
            <QuantityStepper value={quantity} max={Math.max(1, max || 1)} onChange={setQuantity} className="h-13 rounded-xl" />
            <Button
              size="lg"
              className="flex-1 rounded-xl shadow-(--shadow-float) dark:border-transparent dark:bg-gradient-to-b dark:from-highlight dark:to-brand dark:text-cta-foreground dark:hover:from-highlight dark:hover:to-highlight"
              onClick={onAdd}
              loading={adding}
            >
              <ShoppingBagIcon className="size-5" aria-hidden="true" />
              Add to bag
            </Button>
            <WishlistButton productSlug={props.productSlug} productName={props.productName} pricePaise={display?.pricePaise} className="lux-hairline size-13 rounded-full" />
          </div>
          <Button size="lg" variant="secondary" fullWidth className="rounded-xl border-highlight/70 hover:border-highlight" onClick={onBuyNow}>
            Buy now
          </Button>
          <a
            href={whatsappHref(`Hi Kesa, I have a question about "${props.productName}" — ${site.url.replace(/\/$/, "")}/products/${props.productSlug}/`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <WhatsAppIcon className="size-4 text-[#25D366]" />
            Ask about this piece on WhatsApp
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button size="lg" className="flex-1 rounded-xl" disabled>
              Sold out
            </Button>
            <WishlistButton productSlug={props.productSlug} productName={props.productName} pricePaise={display?.pricePaise} className="lux-hairline size-13 rounded-full" />
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
            "fixed inset-x-0 bottom-0 z-30 border-t border-highlight/30 bg-bg/95 backdrop-blur supports-backdrop-filter:bg-bg/85 lg:hidden",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-(--shadow-overlay) transition-[transform,opacity] duration-250 ease-(--ease-standard)",
            showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
          )}
        >
          <div className="container-page flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base text-ink">{props.productName}</p>
              {display ? <Price pricePaise={display.pricePaise} compareAtPaise={display.compareAtPaise} size="sm" /> : null}
            </div>
            <Button size="md" className="rounded-xl" onClick={onAdd} loading={adding} tabIndex={showSticky ? 0 : -1}>
              Add to bag
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
