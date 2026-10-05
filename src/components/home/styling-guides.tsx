import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/storefront/section-heading";
import type { DemoImage } from "@/lib/demo/homepage";

type Guide = {
  title: string;
  excerpt: string;
  href: string;
  image: DemoImage;
};

/** Jewellery styling section: three style-guide cards, one link each. */
export function StylingGuides({ guides }: { guides: readonly Guide[] }) {
  return (
    <section aria-labelledby="styling-title" className="container-page">
      <SectionHeading
        eyebrow="Styling"
        title="How to wear it"
        description="Practical guides from our stylists: what to pair, what to skip and how to make a piece work harder."
        action={{ label: "All style guides", href: "/style-guides/" }}
        className="mb-6"
      />
      <ul className="grid gap-6 sm:grid-cols-3">
        {guides.map((g) => (
          <li key={g.href}>
            <article className="group/guide relative flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface-muted">
                <Image
                  src={g.image.src}
                  alt={g.image.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  unoptimized={g.image.unoptimized ?? false}
                  className="object-cover"
                />
              </div>
              <h3 className="type-h3 mt-4">
                <Link
                  href={g.href}
                  className="outline-none after:absolute after:inset-0 after:rounded-sm after:content-[''] group-hover/guide:underline group-hover/guide:underline-offset-4 focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                >
                  {g.title}
                </Link>
              </h3>
              <p className="type-small mt-1 text-ink-muted">{g.excerpt}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
