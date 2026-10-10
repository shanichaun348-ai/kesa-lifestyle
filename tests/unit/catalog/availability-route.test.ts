/**
 * GET /api/catalog/availability/ — the bag's view of what can still be bought.
 * Public read-only route: validates the SKU list, returns only live SKUs with
 * their current price and stock, and never caches (stock moves).
 */
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type { Product, ProductVariant } from "@/modules/catalog/types";

vi.mock("@/modules/catalog/queries", () => ({ getCatalogRepository: vi.fn() }));

import { getCatalogRepository } from "@/modules/catalog/queries";

import { GET } from "../../../src/app/api/catalog/availability/route";

function request(skus: string) {
  return new NextRequest(`http://localhost/api/catalog/availability/?skus=${encodeURIComponent(skus)}`);
}

const variant: ProductVariant = { sku: "M-198", pricePaise: 29900, stock: 4 };
const product = { id: "p1", slug: "mangalsutra", name: "Mangalsutra", status: "active" } as Product;

describe("GET /api/catalog/availability/", () => {
  it("returns price and stock for live SKUs and omits the rest", async () => {
    vi.mocked(getCatalogRepository).mockReturnValue({
      getProductsBySku: vi.fn(async () => new Map([["M-198", { product, variant }]])),
    } as never);

    const res = await GET(request("M-198,NECKLACE-76-77"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      items: [{ sku: "M-198", name: "Mangalsutra", productSlug: "mangalsutra", unitPricePaise: 29900, stock: 4 }],
    });
  });

  it("rejects an empty, oversized or malformed SKU list before touching the catalogue", async () => {
    const repo = { getProductsBySku: vi.fn() };
    vi.mocked(getCatalogRepository).mockReturnValue(repo as never);

    expect((await GET(request(""))).status).toBe(400);
    expect((await GET(request("has space,OK-1"))).status).toBe(400);
    expect((await GET(request(Array.from({ length: 51 }, (_, i) => `S-${i}`).join(",")))).status).toBe(400);
    expect(repo.getProductsBySku).not.toHaveBeenCalled();
  });
});
