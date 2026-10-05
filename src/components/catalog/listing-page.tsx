import Image from "next/image";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { FilterForm } from "@/components/catalog/filter-form";
import { ListingToolbar } from "@/components/catalog/listing-toolbar";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { EmptyState } from "@/components/storefront/empty-state";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductGrid } from "@/components/storefront/product-grid";
import { StorePagination } from "@/components/storefront/store-pagination";
import { buildListingHref, withPage } from "@/modules/catalog/facets";
import { toCardData } from "@/modules/catalog/presenters";
import { siblingsFor } from "@/modules/catalog/queries";
import type { FaqItem, ImageRef, ListingParams, ListingResult, SortKey } from "@/modules/catalog/types";
import { breadcrumbListJsonLd, collectionPageJsonLd, faqPageJsonLd, type JsonLdObject } from "@/modules/seo/structured-data";

export type ListingTile = { label: string; href: string; image?: ImageRef | undefined };

export type ListingPageProps = {
  basePath: string;
  title: string;
  intro: string;
  body?: string[] | undefined;
  faq?: FaqItem[] | undefined;
  breadcrumbs: Crumb[];
  /** Child category tiles (gender landing pages). */
  tiles?: ListingTile[] | undefined;
  result: ListingResult;
  params: ListingParams;
  defaultSort: SortKey;
  now: Date;
  /** Sibling listings to link from the body (sibling categories / related collections). */
  related?: Array<{ label: string; href: string }> | undefined;
};

/**
 * Product listing template shared by category, gender and collection routes.
 * Server Component: the grid, copy, FAQ and structured data are in the HTML;
 * the filter form, sort select and quick view are the only client islands.
 */
export async function ListingPage(props: ListingPageProps) {
  const { basePath, result, params, defaultSort } = props;
  const siblings = await siblingsFor(result.items);
  const cards = result.items.map((p) => toCardData(p, { now: props.now, siblings: siblings.get(p.slug), quickView: true }));
  const hrefFor = (page: number) => buildListingHref(basePath, withPage(params, page));

  const jsonLd: JsonLdObject[] = [
    breadcrumbListJsonLd(props.breadcrumbs.map((c) => ({ name: c.label, path: c.href ?? basePath }))),
    collectionPageJsonLd({
      name: props.title,
      path: basePath,
      description: props.intro,
      productPaths: result.items.map((p) => `/products/${p.slug}/`),
    }),
  ];
  if (props.faq && props.faq.length > 0) jsonLd.push(faqPageJsonLd(props.faq));

  return (
    <Container className="pt-5 pb-16 lg:pb-24">
      <JsonLd data={jsonLd} />

      <Breadcrumbs items={props.breadcrumbs} />

      <header className="mt-5 flex max-w-prose flex-col gap-3 lg:mt-8">
        <h1 className="type-h1">{props.title}</h1>
        <p className="type-body text-ink-muted">{props.intro}</p>
      </header>

      {props.tiles && props.tiles.length > 0 ? (
        <nav aria-label="Categories" className="mt-8">
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
            {props.tiles.map((tile) => (
              <li key={tile.href} className="w-[34vw] shrink-0 snap-start sm:w-[22vw] md:w-auto">
                <Link
                  href={tile.href}
                  className="group/tile block rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-sm bg-surface-muted">
                    {tile.image ? (
                      <Image src={tile.image.src} alt="" fill sizes="(min-width: 768px) 16vw, 34vw" unoptimized={tile.image.unoptimized ?? false} className="object-cover" />
                    ) : null}
                  </span>
                  <span className="mt-2 block text-sm font-medium text-ink underline-offset-4 group-hover/tile:underline">{tile.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24">
            <FilterForm
              key={buildListingHref(basePath, params)}
              basePath={basePath}
              params={params}
              facets={result.facets}
              total={result.total}
              idPrefix="d"
              mode="instant"
            />
          </div>
        </aside>

        <div className="min-w-0">
          <ListingToolbar
            basePath={basePath}
            params={params}
            facets={result.facets}
            total={result.total}
            defaultSort={defaultSort}
            currentSort={result.sort}
          />
          <ActiveFilters basePath={basePath} params={params} facets={result.facets} />

          {cards.length > 0 ? (
            <ProductGrid className="mt-4 xl:grid-cols-3 2xl:grid-cols-4">
              {cards.map((card, i) => (
                <li key={card.slug}>
                  <ProductCard product={card} priority={i < 4 && params.page === 1} />
                </li>
              ))}
            </ProductGrid>
          ) : (
            <EmptyState
              icon={<SearchXIcon strokeWidth={1.5} />}
              title="No pieces match these filters"
              description="Try removing a filter, or browse the full selection."
              action={
                <Button variant="secondary" asChild>
                  <Link href={basePath} rel="nofollow">
                    Clear filters
                  </Link>
                </Button>
              }
            />
          )}

          <StorePagination currentPage={result.page} totalPages={result.totalPages} hrefFor={hrefFor} className="mt-12" />
        </div>
      </div>

      {(props.body && props.body.length > 0) || (props.faq && props.faq.length > 0) || (props.related && props.related.length > 0) ? (
        <section aria-labelledby="about-listing" className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="about-listing" className="type-h2">
              About {props.title.toLowerCase()}
            </h2>
            {props.body?.map((para, i) => (
              <p key={i} className="type-body mt-4 max-w-prose text-ink-muted">
                {para}
              </p>
            ))}
            {props.related && props.related.length > 0 ? (
              <div className="mt-6">
                <p className="type-eyebrow mb-3 text-ink-subtle">Explore more</p>
                <ul className="flex flex-wrap gap-2">
                  {props.related.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-3 text-sm text-ink hover:border-ink">
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {props.faq && props.faq.length > 0 ? (
            <div className="lg:col-span-5">
              <h3 className="type-h3 mb-2">Questions</h3>
              <Accordion type="single" collapsible>
                {props.faq.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger>{f.question}</AccordionTrigger>
                    <AccordionContent>{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : null}
        </section>
      ) : null}
    </Container>
  );
}
