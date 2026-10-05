"use client";

import { HeartIcon } from "lucide-react";
import { toast } from "sonner";

import { useWishlist } from "@/modules/wishlist/use-wishlist";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  productSlug: string;
  productName: string;
  className?: string;
};

/**
 * Toggle button with `aria-pressed`, bound to the wishlist store.
 * Rendered as a sibling of the product link, never inside it (docs/09 §6).
 */
export function WishlistButton({ productSlug, productName, className }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const saved = has(productSlug);

  function handleClick() {
    toggle(productSlug);
    toast(saved ? "Removed from wishlist" : "Saved to wishlist", { description: productName });
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      onClick={handleClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm",
        "transition-colors duration-150 hover:bg-surface",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <HeartIcon
        className={cn("size-5 transition-colors", saved ? "fill-brand text-brand" : "fill-transparent")}
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </button>
  );
}
