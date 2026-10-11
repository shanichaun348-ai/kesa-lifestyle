import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { RevealGroup } from "@/components/motion/reveal-group";
import { Tilt } from "@/components/motion/tilt";
import { SectionHeading } from "@/components/storefront/section-heading";
import type { DemoImage } from "@/lib/demo/homepage";

type Category = {
  label: string;
  href: string;
  image: DemoImage;
};

/**
 * Shop by category as a row of tall arches (rounded top, square base).
 * Horizontal snap rail on phones, evenly spaced on desktop. Images are decorative (empty alt); the
 * label carries the meaning. The first two tiles load with priority.
 */
export function CategoryTiles({ categories }: { categories: readonly Category[] }) {
  return (
    <section aria-labelledby="categories-title" className="container-page">
      <SectionHeading
        eyebrow="Browse"
        title="Shop by category"
        action={{ label: "All jewellery", href: "/women/" }}
        className="reveal mb-8"
      />
      <RevealGroup>
      <ul
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-[repeat(var(--cols),minmax(0,1fr))] md:gap-8 md:overflow-visible md:px-0 lg:gap-10"
        style={{ "--cols": categories.length } as CSSProperties}
      >
        {categories.map((c, i) => (
          <li key={c.href} className="roll-in-item w-[38vw] shrink-0 snap-start sm:w-[24vw] md:w-auto" style={{ "--i": i } as CSSProperties}>
            <Link
              href={c.href}
              className="group/cat flex flex-col items-center gap-3 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-brand focus-visible:[&>span:first-child]:ring-offset-4"
            >
              <Tilt as="span" max={6} className="sheen relative aspect-[4/5] w-full overflow-hidden rounded-t-full rounded-b-md bg-surface-muted ring-1 ring-line group-hover/cat:shadow-(--shadow-float) group-hover/cat:ring-ink/40">
                <Image
                  src={c.image.src}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="(min-width: 1280px) 220px, (min-width: 768px) 18vw, 38vw"
                  unoptimized={c.image.unoptimized ?? false}
                  className="object-cover transition-transform duration-700 ease-(--ease-standard) motion-safe:group-hover/cat:scale-110"
                />
              </Tilt>
              <span className="relative text-center text-sm font-medium text-ink after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-250 after:ease-(--ease-standard) group-hover/cat:after:w-full">
                {c.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      </RevealGroup>
    </section>
  );
}
