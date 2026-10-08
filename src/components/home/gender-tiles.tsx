import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import type { DemoImage } from "@/lib/demo/homepage";
import { cn } from "@/lib/utils";

type GenderTile = {
  title: string;
  description: string;
  href: string;
  image: DemoImage;
};

/**
 * Large editorial entry points with the title set over the photograph.
 * Two tiles sit side by side; a single tile becomes a wide banner.
 */
export function GenderTiles({ tiles }: { tiles: readonly GenderTile[] }) {
  const single = tiles.length === 1;
  return (
    <section aria-labelledby="gender-title" className="container-page reveal">
      <h2 id="gender-title" className="sr-only">
        Shop by range
      </h2>
      <ul className={cn("grid gap-4 sm:gap-6", !single && "sm:grid-cols-2")}>
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="group/tile relative block overflow-hidden rounded-md bg-ink text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <div className={cn("relative aspect-[4/5]", single ? "sm:aspect-[16/9] lg:aspect-[21/9]" : "sm:aspect-[3/4] lg:aspect-[4/5]")}>
                <Image
                  src={tile.image.src}
                  alt={tile.image.alt}
                  fill
                  priority
                  fetchPriority="high"
                  sizes={single ? "100vw" : "(min-width: 640px) 50vw, 100vw"}
                  unoptimized={tile.image.unoptimized ?? false}
                  className="object-cover object-[50%_30%] transition-transform duration-700 ease-(--ease-standard) motion-safe:group-hover/tile:scale-105"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent transition-opacity duration-400 group-hover/tile:opacity-90" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 lg:p-8">
                <div>
                  <p className="type-eyebrow mb-2 text-bg/70">Shop</p>
                  <h3 className="type-h1 text-bg">{tile.title}</h3>
                  <p className="type-small mt-2 max-w-xs text-bg/80">{tile.description}</p>
                </div>
                <span className="mb-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-bg/60 text-bg transition-[background-color,color,transform] duration-250 ease-(--ease-standard) group-hover/tile:bg-bg group-hover/tile:text-ink motion-safe:group-hover/tile:translate-x-1">
                  <ArrowRightIcon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
