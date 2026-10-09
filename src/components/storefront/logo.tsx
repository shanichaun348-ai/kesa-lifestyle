import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Kesa Lifestyle logo (black mark with crown and wordmark, transparent background) linking home. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Kesa Lifestyle home"
      className={cn("inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand", className)}
    >
      <Image
        src="/images/brand/kesa-logo-black.png"
        alt="Kesa Lifestyle"
        width={1000}
        height={865}
        priority
        sizes="(min-width: 1024px) 74px, 56px"
        className="h-12 w-auto lg:h-16"
      />
    </Link>
  );
}
