import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { seed, type SeedSummary } from "@/db/seed/seed";
import { seedProducts } from "@/lib/demo/seed-catalog";

import { createMigratedDb, type TestDb } from "./harness";

let db: TestDb;
let close: () => Promise<void>;
let summary: SeedSummary;

beforeAll(async () => {
  const created = await createMigratedDb();
  db = created.db;
  close = () => created.client.close();
  summary = await seed(db);
}, 180_000);

afterAll(async () => {
  await close();
});

describe("development seed", () => {
  it("loads the demo catalogue consistently", () => {
    expect(summary.products).toBe(seedProducts.length);
    expect(summary.variants).toBe(seedProducts.reduce((n, p) => n + p.variants.length, 0));
    expect(summary.images).toBe(seedProducts.reduce((n, p) => n + p.images.length, 0));
    expect(summary.categories).toBe(13);
    expect(summary.collections).toBe(7);
    expect(summary.navigationItems).toBeGreaterThan(20);
  });

  it("every active product has a primary image, a category membership and stock rows", async () => {
    const missing = await db.execute(sql`
      select p.slug from products p
      where p.status = 'active' and (
        not exists (select 1 from product_images i where i.product_id = p.id and i.role = 'primary')
        or not exists (select 1 from product_categories c where c.product_id = p.id and c.category_id = p.primary_category_id)
        or not exists (select 1 from product_variants v join inventory inv on inv.variant_id = v.id where v.product_id = p.id)
      )`);
    expect(missing.rows).toEqual([]);
  });

  it("stock in the ledger matches the seed and derived columns are maintained", async () => {
    const expected = seedProducts.reduce((n, p) => n + p.variants.reduce((m, v) => m + v.stock, 0), 0);
    const [total] = (await db.execute(sql`select coalesce(sum(on_hand), 0)::int as total from inventory`)).rows as Array<{ total: number }>;
    expect(total?.total).toBe(expected);

    const [facets] = (await db.execute(sql`select count(*)::int as n from products where cardinality(attribute_value_ids) = 0 or search_vector is null`)).rows as Array<{ n: number }>;
    expect(facets?.n).toBe(0);
  });

  it("seeds no ratings, reviews, customers or orders", async () => {
    const counts = (
      await db.execute(sql`
        select (select count(*) from reviews)::int as reviews,
               (select count(*) from profiles)::int as profiles,
               (select count(*) from orders)::int as orders,
               (select count(*) from products where rating_count > 0 or rating_avg is not null)::int as rated`)
    ).rows as Array<{ reviews: number; profiles: number; orders: number; rated: number }>;
    expect(counts[0]).toEqual({ reviews: 0, profiles: 0, orders: 0, rated: 0 });
  });

  it("coupon codes are unique case-insensitively", async () => {
    const [found] = await db.select({ code: schema.couponCodes.code }).from(schema.couponCodes).where(sql`lower(code) = lower('welcome10')`);
    expect(found?.code).toBe("WELCOME10");
    const [welcome] = await db.select({ couponId: schema.couponCodes.couponId }).from(schema.couponCodes);
    if (!welcome) throw new Error("coupon");
    await expect(db.insert(schema.couponCodes).values({ couponId: welcome.couponId, code: "welcome10" })).rejects.toThrow();
  });

  it("is idempotent-safe: running twice fails loudly instead of duplicating", async () => {
    await expect(seed(db)).rejects.toThrow();
  });
});
