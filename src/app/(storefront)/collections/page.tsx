import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { countInScope, getCollections } from "@/modules/catalog/queries";
import { breadcrumbListJsonLd } from "@/modules/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Collections | Kesa Lifestyle" },
  description: "Curated jewellery edits by occasion and mood: new arrivals, bestsellers, wedding, party, daily, office and gifting.",
  alternates: { canonical: "/collections/" },
};

/** Collections index. Collections with fewer than 3 products are hidden (docs/06 §1.2). */
export default async function CollectionsIndexPage() {
  const collections = await getCollections();
  const withCounts = await Promise.all(
    collections.map(async (c) => ({ collection: c, count: await countInScope({ kind: "collection", slug: c.slug }) })),
  );
  const visible = withCounts.filter((c) => c.count >= 3);

  return (
    <Container className="pt-5 pb-16 lg:pb-24">
      <JsonLd data={breadcrumbListJsonLd([{ name: "Home", path: "/" }, { name: "Collections", path: "/collections/" }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
      <header className="mt-5 flex max-w-prose flex-col gap-3 lg:mt-8">
        <h1 className="type-h1">Collections</h1>
        <p className="type-body text-ink-muted">Edits by occasion and mood, curated by our stylists and refreshed through the season.</p>
      </header>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ collection, count }) => (
          <li key={collection.slug}>
            <article className="group/col relative flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface-muted">
                {collection.image ? (
                  <Image src={collection.image.src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={collection.image.unoptimized ?? false} className="object-cover" />
                ) : null}
              </div>
              <h2 className="type-h3 mt-4">
                <Link
                  href={`/collections/${collection.slug}/`}
                  className="outline-none after:absolute after:inset-0 after:rounded-sm after:content-[''] group-hover/col:underline group-hover/col:underline-offset-4 focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                >
                  {collection.name}
                </Link>
              </h2>
              <p className="type-small mt-1 text-ink-muted">{collection.intro}</p>
              <p className="type-small mt-2 text-ink-subtle">{count} pieces</p>
            </article>
          </li>
        ))}
      </ul>
    </Container>
  );
}
