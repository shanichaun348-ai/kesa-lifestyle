import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { seedOccasionPages } from "@/lib/demo/seed-occasion";

export const metadata: Metadata = {
  title: { absolute: "Jewellery by Occasion | Kesa Lifestyle" },
  description: "Shop jewellery curated for weddings, office, festive celebrations and gifting.",
  alternates: { canonical: "/occasion/" },
  robots: { index: true, follow: true },
};

export default function OccasionIndexPage() {
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "By Occasion" }]} />

      <header className="mt-6 mb-10">
        <h1 className="type-h1">Shop by Occasion</h1>
        <p className="mt-3 max-w-xl type-body text-ink-muted">
          Curated jewellery for every event, from office mornings to wedding weekends.
        </p>
      </header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {seedOccasionPages.map((occasion) => (
          <li key={occasion.slug}>
            <Link
              href={`/occasion/${occasion.slug}/`}
              className="group flex flex-col rounded-md border border-line bg-surface overflow-hidden hover:border-ink transition-colors"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                <Image
                  src={occasion.image.src}
                  alt={occasion.image.alt}
                  width={600}
                  height={450}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  {...(occasion.image.unoptimized ? { unoptimized: true } : {})}
                />
              </div>
              <div className="p-4">
                <h2 className="type-h3 group-hover:text-brand transition-colors">{occasion.name}</h2>
                <p className="mt-1 type-small text-ink-muted line-clamp-2">{occasion.intro}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
