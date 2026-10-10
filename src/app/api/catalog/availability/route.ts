import { NextResponse, type NextRequest } from "next/server";

import { MAX_SKUS_PER_CHECK, SKU_PATTERN, type AvailabilityItem } from "@/modules/cart/availability";
import { getCatalogRepository } from "@/modules/catalog/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/availability/?skus=A,B,C
 * Tells the browser-held bag which of its SKUs can still be bought: live
 * product, current price and stock. SKUs that are not on sale any more are
 * simply left out. Public, read-only, never cached (stock moves).
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("skus") ?? "";
  const skus = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  if (skus.length === 0 || skus.length > MAX_SKUS_PER_CHECK || skus.some((s) => !SKU_PATTERN.test(s))) {
    return NextResponse.json({ error: "Invalid skus" }, { status: 400 });
  }
  const found = await getCatalogRepository().getProductsBySku(skus);
  const items: AvailabilityItem[] = [...found.values()].map(({ product, variant }) => ({
    sku: variant.sku,
    name: product.name,
    productSlug: product.slug,
    unitPricePaise: variant.pricePaise,
    stock: variant.stock,
  }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
