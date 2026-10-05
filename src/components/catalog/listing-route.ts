import "server-only";

import { notFound, permanentRedirect } from "next/navigation";

import { buildFacetVocabulary, parseListingSearchParams, type RawSearchParams } from "@/modules/catalog/facets";
import { getCatalogRepository } from "@/modules/catalog/queries";
import type { ListingParams, ListingResult, ListingScope, SortKey } from "@/modules/catalog/types";

/**
 * Shared request handling for listing routes:
 * - unknown facet keys/values, bad page or sort → 404 (not an empty 200)
 * - `?page=1` → 301 to the base URL
 * - page beyond the last → 404
 */
export async function resolveListing(
  scope: ListingScope,
  basePath: string,
  rawSearchParams: RawSearchParams,
  defaultSort: SortKey,
): Promise<{ params: ListingParams; result: ListingResult; canonicalHref: string }> {
  const repo = getCatalogRepository();
  const vocab = buildFacetVocabulary(await repo.getAttributes());
  const parsed = parseListingSearchParams(rawSearchParams, vocab, basePath, defaultSort);
  if (!parsed.ok) notFound();

  const rawPage = rawSearchParams.page;
  if (rawPage !== undefined && parsed.params.page === 1) {
    permanentRedirect(parsed.canonicalHref);
  }

  const result = await repo.listProducts(scope, parsed.params);
  if (!result) notFound();
  if (parsed.params.page > result.totalPages) notFound();

  return { params: parsed.params, result, canonicalHref: parsed.canonicalHref };
}

/** Metadata-time parse that never throws; returns null when the route will 404. */
export async function parseForMetadata(basePath: string, rawSearchParams: RawSearchParams, defaultSort: SortKey) {
  const repo = getCatalogRepository();
  const vocab = buildFacetVocabulary(await repo.getAttributes());
  const parsed = parseListingSearchParams(rawSearchParams, vocab, basePath, defaultSort);
  return parsed.ok ? parsed : null;
}
