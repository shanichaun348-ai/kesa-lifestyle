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
 * Shop by category. Horizontal snap rail on phones, six-up grid on desktop.
 * Category images are decorative (empty alt); the label carries the meaning.
 * First two tiles are always visible in the initial viewport and get priority.
 */
export function CategoryTiles({ categories }: { categories: readonly Category[] }) {
  return (
    <section aria-labelledby="categories-title" className="container-page">
      <SectionHeading
        eyebrow="Browse"
        title="Shop by category"
        action={{ label: "All women's jewellery", href: "/women/" }}
        className="mb-6"
      />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0">
        {categories.map((c, i) => (
          <li key={c.href} className="w-[38vw] shrink-0 snap-start sm:w-[26vw] md:w-auto">
            <Link
              href={c.href}
              className="group/cat block rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-muted">
                <Image
                  src={c.image.src}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="(min-width: 768px) 16vw, 38vw"
                  unoptimized={c.image.unoptimized ?? false}
                  className="object-cover"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-ink underline-offset-4 group-hover/cat:underline">{c.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
