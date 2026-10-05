import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DemoImage } from "@/lib/demo/homepage";

type HeroProps = {
  eyebrow?: string | undefined;
  title: string;
  lead: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string } | undefined;
  image: DemoImage;
};

/**
 * Editorial hero: image and copy side by side on desktop, stacked on phones.
 * Text never sits on top of the photograph, so contrast does not depend on
 * the image. The image is the LCP element and loads with priority.
 */
export function Hero({ eyebrow, title, lead, primary, secondary, image }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="container-page pt-6 lg:pt-10">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-muted lg:order-2 lg:col-span-7 lg:aspect-[5/6]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1024px) 58vw, 100vw"
            unoptimized={image.unoptimized ?? false}
            className="object-cover"
          />
        </div>

        <div className="flex flex-col items-start gap-5 lg:col-span-5 lg:pr-6">
          {eyebrow ? <p className="type-eyebrow text-ink-subtle">{eyebrow}</p> : null}
          <h1 id="hero-title" className="type-display">
            {title}
          </h1>
          <p className="type-lead max-w-md text-ink-muted">{lead}</p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" asChild>
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            {secondary ? (
              <Button size="lg" variant="secondary" asChild>
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
