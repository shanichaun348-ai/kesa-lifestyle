import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/storefront/section-heading";
import type { DemoImage } from "@/lib/demo/homepage";

type Category = {
  label: string;
  href: string;
  image: DemoImage;
};

/**
 * Shop by category as a row of circular bubbles. Horizontal snap rail on
 * phones, evenly spaced on desktop. Images are decorative (empty alt); the
 * label carries the meaning. The first two tiles load with priority.
 */
export function CategoryTiles({ categories }: { categories: readonly Category[] }) {
  return (
    <section aria-labelledby="categories-title" className="container-page reveal">
      <SectionHeading
        eyebrow="Browse"
        title="Shop by category"
        action={{ label: "All jewellery", href: "/women/" }}
        className="mb-8"
      />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:gap-6 md:overflow-visible md:px-0">
        {categories.map((c, i) => (
          <li key={c.href} className="w-[30vw] shrink-0 snap-start sm:w-[20vw] md:w-auto">
            <Link
              href={c.href}
              className="group/cat flex flex-col items-center gap-3 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-brand focus-visible:[&>span:first-child]:ring-offset-4"
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-surface-muted ring-1 ring-line transition-[transform,box-shadow,ring-color] duration-400 ease-(--ease-standard) motion-safe:group-hover/cat:-translate-y-1.5 group-hover/cat:shadow-(--shadow-float) group-hover/cat:ring-ink/40">
                <Image
                  src={c.image.src}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="(min-width: 768px) 16vw, 30vw"
                  unoptimized={c.image.unoptimized ?? false}
                  className="object-cover transition-transform duration-700 ease-(--ease-standard) motion-safe:group-hover/cat:scale-110"
                />
              </span>
              <span className="relative text-center text-sm font-medium text-ink after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-250 after:ease-(--ease-standard) group-hover/cat:after:w-full">
                {c.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
