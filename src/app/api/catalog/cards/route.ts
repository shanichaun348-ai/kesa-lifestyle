import { NextResponse, type NextRequest } from "next/server";
import { MAX_SLUG_LENGTH } from "@/modules/catalog/slug";

import { toCardData } from "@/modules/catalog/presenters";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

const SLUG = new RegExp(`^[a-z0-9-]{1,${MAX_SLUG_LENGTH}}$`);
const MAX = 100;

/**
 * GET /api/catalog/cards/?slugs=a,b,c
 * Resolves product slugs (wishlist, recently viewed) to card view models.
 * Read-only, public catalogue data; validated and capped. Unknown or
 * archived slugs are simply omitted.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  if (slugs.length === 0 || slugs.length > MAX || slugs.some((s) => !SLUG.test(s))) {
    return NextResponse.json({ error: "Invalid slugs" }, { status: 400 });
  }
  const repo = getCatalogRepository();
  const products = await repo.getProductsBySlugs(slugs);
  const order = new Map(slugs.map((s, i) => [s, i]));
  const items = await Promise.all(
    products
      .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
      .map(async (p) => toCardData(p, { now: SEED_NOW, siblings: await repo.getFamilySiblings(p) })),
  );
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
