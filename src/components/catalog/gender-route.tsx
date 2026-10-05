import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingPage, type ListingTile } from "@/components/catalog/listing-page";
import { parseForMetadata, resolveListing } from "@/components/catalog/listing-route";
import type { RawSearchParams } from "@/modules/catalog/facets";
import { getCategoryByPath, getCategoryTree } from "@/modules/catalog/queries";
import type { CategoryGender } from "@/modules/catalog/types";
import { listingMetadata } from "@/modules/seo/metadata";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

/**
 * `/women/` and `/men/` with an optional single category segment.
 * Depth > 1 is a 404 (docs/04 §1.4); the taxonomy is deliberately shallow.
 */

function resolvePath(gender: CategoryGender, segments: string[] | undefined): { path: string; basePath: string } | null {
  if (!segments || segments.length === 0) return { path: gender, basePath: `/${gender}/` };
  if (segments.length > 1) return null;
  const [slug] = segments;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  return { path: `${gender}/${slug}`, basePath: `/${gender}/${slug}/` };
}

export async function genderRouteMetadata(gender: CategoryGender, segments: string[] | undefined, raw: RawSearchParams): Promise<Metadata> {
  const resolved = resolvePath(gender, segments);
  if (!resolved) return {};
  const category = await getCategoryByPath(resolved.path);
  if (!category) return {};
  const parsed = await parseForMetadata(resolved.basePath, raw, "featured");
  if (!parsed) return {};
  return listingMetadata({
    baseTitle: category.parentPath === null ? category.titleNoun : `${category.titleNoun} – Buy Online`,
    seoTitle: category.seoTitle,
    description: category.seoDescription ?? category.intro,
    basePath: resolved.basePath,
    params: parsed.params,
    canonicalHref: parsed.canonicalHref,
  });
}

export async function renderGenderRoute(gender: CategoryGender, segments: string[] | undefined, raw: RawSearchParams) {
  const resolved = resolvePath(gender, segments);
  if (!resolved) notFound();
  const category = await getCategoryByPath(resolved.path);
  if (!category) notFound();

  const { params, result } = await resolveListing({ kind: "category", path: category.path }, resolved.basePath, raw, "featured");
  const tree = await getCategoryTree();
  const root = tree.roots.find((r) => r.gender === gender);
  const children = tree.childrenOf(gender);

  const isRoot = category.parentPath === null;
  const tiles: ListingTile[] | undefined = isRoot
    ? children.map((c) => ({ label: c.name, href: `/${c.path}/`, image: c.image }))
    : undefined;

  const related = isRoot
    ? undefined
    : children.filter((c) => c.path !== category.path).map((c) => ({ label: c.name, href: `/${c.path}/` }));

  const breadcrumbs = isRoot
    ? [{ label: "Home", href: "/" }, { label: category.name }]
    : [{ label: "Home", href: "/" }, { label: root?.name ?? gender, href: `/${gender}/` }, { label: category.name }];

  return (
    <ListingPage
      basePath={resolved.basePath}
      title={category.titleNoun}
      intro={category.intro}
      body={category.body}
      faq={category.faq}
      breadcrumbs={breadcrumbs}
      tiles={tiles}
      related={related}
      result={result}
      params={params}
      defaultSort="featured"
      now={SEED_NOW}
    />
  );
}
