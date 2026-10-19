import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Kesa Lifestyle home"
      className={cn("inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand", className)}
    >
      <span className="flex flex-col items-center leading-none">
        <span className="font-display text-2xl font-semibold tracking-[0.12em] text-ink uppercase lg:text-3xl">
          Kesa
        </span>
        <span className="font-sans text-[0.55rem] font-light tracking-[0.35em] text-ink-muted uppercase lg:text-[0.6rem]">
          Lifestyle
        </span>
      </span>
    </Link>
  );
}
