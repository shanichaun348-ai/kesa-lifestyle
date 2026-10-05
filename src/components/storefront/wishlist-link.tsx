"use client";

import Link from "next/link";
import { HeartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWishlist } from "@/modules/wishlist/use-wishlist";

/** Header wishlist icon with a live count badge. */
export function WishlistLink({ className }: { className?: string }) {
  const { count } = useWishlist();
  return (
    <Button variant="ghost" size="icon" asChild className={className}>
      <Link href="/wishlist/" aria-label={count > 0 ? `Wishlist, ${count} saved` : "Wishlist"} className="relative">
        <HeartIcon strokeWidth={1.5} aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] leading-4 font-medium text-bg"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
