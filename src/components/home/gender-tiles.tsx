import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import type { DemoImage } from "@/lib/demo/homepage";

type GenderTile = {
  title: string;
  description: string;
  href: string;
  image: DemoImage;
};

/** Two large editorial entry points: Shop Women, Shop Men. */
export function GenderTiles({ tiles }: { tiles: readonly GenderTile[] }) {
  return (
    <section aria-labelledby="gender-title" className="container-page">
      <h2 id="gender-title" className="sr-only">
        Shop by gender
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="group/tile block rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-muted sm:aspect-[3/4]">
                <Image
                  src={tile.image.src}
                  alt={tile.image.alt}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(min-width: 640px) 50vw, 100vw"
                  unoptimized={tile.image.unoptimized ?? false}
                  className="object-cover transition-transform duration-400 ease-(--ease-standard) motion-safe:group-hover/tile:scale-[1.02]"
                />
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="type-h3">Shop {tile.title}</h3>
                  <p className="type-small mt-1 text-ink-muted">{tile.description}</p>
                </div>
                <ArrowRightIcon
                  className="mb-1 size-5 shrink-0 text-ink transition-transform duration-250 ease-(--ease-standard) motion-safe:group-hover/tile:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
