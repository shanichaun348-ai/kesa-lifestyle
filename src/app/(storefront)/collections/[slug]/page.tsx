import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingPage } from "@/components/catalog/listing-page";
import { parseForMetadata, resolveListing } from "@/components/catalog/listing-route";
import { getCollectionBySlug, getCollections } from "@/modules/catalog/queries";
import { listingMetadata } from "@/modules/seo/metadata";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  const basePath = `/collections/${collection.slug}/`;
  const parsed = await parseForMetadata(basePath, searchParams, collection.defaultSort);
  if (!parsed) return {};
  return listingMetadata({
    baseTitle: collection.name,
    seoTitle: collection.seoTitle,
    description: collection.seoDescription ?? collection.intro,
    basePath,
    params: parsed.params,
    canonicalHref: parsed.canonicalHref,
  });
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const basePath = `/collections/${collection.slug}/`;
  const { params, result } = await resolveListing({ kind: "collection", slug: collection.slug }, basePath, searchParams, collection.defaultSort);
  const others = (await getCollections()).filter((c) => c.slug !== collection.slug).slice(0, 6);

  return (
    <ListingPage
      basePath={basePath}
      title={collection.heading ?? collection.name}
      intro={collection.intro}
      body={collection.body}
      faq={collection.faq}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections/" }, { label: collection.name }]}
      related={others.map((c) => ({ label: c.name, href: `/collections/${c.slug}/` }))}
      result={result}
      params={params}
      defaultSort={collection.defaultSort}
      now={SEED_NOW}
    />
  );
}
