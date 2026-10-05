import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/storefront/price";
import type { ProductCardData } from "@/components/storefront/product-card";
import type { DemoImage } from "@/lib/demo/homepage";

type ShopTheLookProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: DemoImage;
  products: ProductCardData[];
  href: string;
};

/**
 * One editorial photograph with the pieces listed beside it. The list is
 * plain links with thumbnails: no hotspots, so it works on every input.
 */
export function ShopTheLook({ eyebrow, title, description, image, products, href }: ShopTheLookProps) {
  return (
    <section aria-labelledby="look-title" className="container-page">
      <div className="reveal grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <figure className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-muted lg:col-span-7">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            unoptimized={image.unoptimized ?? false}
            className="object-cover"
          />
        </figure>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-2">
            <p className="type-eyebrow text-ink-subtle">{eyebrow}</p>
            <h2 id="look-title" className="type-h2">
              {title}
            </h2>
            <p className="type-body text-ink-muted">{description}</p>
          </div>

          <ul className="divide-y divide-line border-y border-line" aria-label="Pieces in this look">
            {products.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/products/${p.slug}/`}
                  className="group/piece flex items-center gap-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                    <Image
                      src={p.image.src}
                      alt=""
                      fill
                      sizes="56px"
                      unoptimized={p.image.unoptimized ?? false}
                      className="object-cover"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm text-ink group-hover/piece:underline group-hover/piece:underline-offset-4">
                      {p.name}
                    </span>
                    <Price pricePaise={p.pricePaise} compareAtPaise={p.compareAtPaise} size="sm" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Button variant="secondary" className="self-start" asChild>
            <Link href={href}>Shop the full look</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
