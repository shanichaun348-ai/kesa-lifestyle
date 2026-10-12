import Image from "next/image";
import Link from "next/link";

import type { DemoImage } from "@/lib/demo/homepage";

type BrandStatementProps = {
  eyebrow: string;
  statement: string;
  body: string;
  link: { label: string; href: string };
  image: DemoImage;
};

/** Editorial brand section: a muted full-width band with one large serif statement. */
export function BrandStatement({ eyebrow, statement, body, link, image }: BrandStatementProps) {
  return (
    <section aria-labelledby="brand-title" className="bg-surface-muted/70 py-14 lg:py-24">
      <div className="container-page reveal grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <p className="type-eyebrow text-ink-subtle">{eyebrow}</p>
          <h2 id="brand-title" className="type-h1 max-w-2xl">
            {statement}
          </h2>
          <p className="type-body max-w-prose text-ink-muted">{body}</p>
          <Link
            href={link.href}
            className="type-small w-fit font-medium text-ink underline decoration-line-strong underline-offset-6 hover:decoration-ink"
          >
            {link.label}
          </Link>
        </div>
        <figure className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface lg:col-span-5 lg:aspect-[4/5]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            unoptimized={image.unoptimized ?? false}
            className="object-cover"
          />
        </figure>
      </div>
    </section>
  );
}
