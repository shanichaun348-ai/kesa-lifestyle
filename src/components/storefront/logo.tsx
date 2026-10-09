import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Kesa Lifestyle logo (crown mark and wordmark, transparent background) linking
 * home. Black on the light theme, gold on the dark theme: the two files share
 * one alpha mask, so they swap without any shift in size or position.
 */
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
        className="h-12 w-auto lg:h-16 dark:hidden"
      />
      <Image
        src="/images/brand/kesa-logo-gold.png"
        alt="Kesa Lifestyle"
        width={1000}
        height={865}
        sizes="(min-width: 1024px) 74px, 56px"
        className="hidden h-12 w-auto lg:h-16 dark:block"
      />
    </Link>
  );
}
