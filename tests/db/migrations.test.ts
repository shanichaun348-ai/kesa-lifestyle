import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { createMigratedDb, type TestDb } from "./harness";

/**
 * Runs every migration against embedded Postgres and checks the invariants
 * the architecture promises (docs/05, docs/11 §6). If any of these fail the
 * schema is inconsistent and must not ship.
 */

const REQUIRED_TABLES = [
  "profiles",
  "addresses",
  "products",
  "product_variants",
  "product_images",
  "categories",
  "collections",
  "product_categories",
  "product_collections",
  "inventory",
  "inventory_transactions",
  "orders",
  "order_items",
  "payments",
  "coupons",
  "coupon_codes",
  "coupon_redemptions",
  "wishlists",
  "wishlist_items",
  "reviews",
  "review_images",
  "blog_posts",
  "blog_categories",
  "seo_settings",
  "redirects",
  "navigation_menus",
  "navigation_items",
  "homepage_sections",
  "newsletter_subscribers",
  "loyalty_accounts",
  "loyalty_transactions",
  "referrals",
];

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  const created = await createMigratedDb();
  db = created.db;
  close = () => created.client.close();
}, 120_000);

afterAll(async () => {
  await close();
});

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

describe("schema", () => {
  it("creates every required table", async () => {
    const tables = await rows<{ table_name: string }>(sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`);
    const names = new Set(tables.map((t) => t.table_name));
    for (const name of REQUIRED_TABLES) expect(names.has(name), `missing table ${name}`).toBe(true);
  });

  it("enables row level security on every public table", async () => {
    const unprotected = await rows<{ relname: string }>(
      sql`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false`,
    );
    expect(unprotected.map((r) => r.relname)).toEqual([]);
  });

  it("gives kesa_app a policy on every table and anon none", async () => {
    const tables = await rows<{ relname: string }>(sql`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`);
    const policies = await rows<{ tablename: string; roles: string[] }>(sql`select tablename, roles from pg_policies where schemaname = 'public'`);
    const byTable = new Map<string, string[]>();
    for (const p of policies) byTable.set(p.tablename, [...(byTable.get(p.tablename) ?? []), ...p.roles]);
    for (const t of tables) {
      expect(byTable.get(t.relname) ?? [], `no kesa_app policy on ${t.relname}`).toContain("kesa_app");
      expect(byTable.get(t.relname) ?? [], `anon policy on ${t.relname}`).not.toContain("anon");
    }
  });

  it("kesa_app can log in and has no superuser/bypassrls", async () => {
    const [role] = await rows<{ rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean }>(sql`select rolcanlogin, rolsuper, rolbypassrls from pg_roles where rolname = 'kesa_app'`);
    expect(role).toEqual({ rolcanlogin: true, rolsuper: false, rolbypassrls: false });
  });

  it("order numbers come from the sequence with the KL- prefix", async () => {
    const [u] = await rows<{ id: string }>(sql`insert into auth.users (email) values ('order-test@example.com') returning id`);
    if (!u) throw new Error("user not created");
    const [order] = await db
      .insert(schema.orders)
      .values({ profileId: u.id, paymentMethod: "cod", subtotalPaise: 1000, totalPaise: 1000, idempotencyKey: crypto.randomUUID() })
      .returning({ orderNumber: schema.orders.orderNumber });
    expect(order?.orderNumber).toMatch(/^KL-1\d{5}$/);
  });
});

describe("triggers", () => {
  it("creates a profile when an auth user signs up", async () => {
    const [u] = await rows<{ id: string }>(sql`insert into auth.users (email) values ('signup@example.com') returning id`);
    if (!u) throw new Error("user not created");
    const profile = await db.query.profiles.findFirst({ where: (p, { eq }) => eq(p.id, u.id) });
    expect(profile?.email).toBe("signup@example.com");
  });

  it("maintains updated_at", async () => {
    const [cat] = await db
      .insert(schema.categories)
      .values({ path: "women", slug: "women", gender: "women", name: "Women", titleNoun: "Women's Jewellery" })
      .returning({ id: schema.categories.id, updatedAt: schema.categories.updatedAt });
    if (!cat) throw new Error("category not created");
    await new Promise((r) => setTimeout(r, 5));
    const [after] = await db.update(schema.categories).set({ name: "Women " }).where(sql`id = ${cat.id}`).returning({ updatedAt: schema.categories.updatedAt });
    expect(new Date(after?.updatedAt ?? 0).getTime()).toBeGreaterThan(new Date(cat.updatedAt).getTime());
  });

  it("maintains inventory.on_hand from the ledger and rejects negative stock", async () => {
    const [cat] = await db.insert(schema.categories).values({ path: "men", slug: "men", gender: "men", name: "Men", titleNoun: "Men's Jewellery" }).returning({ id: schema.categories.id });
    const [loc] = await db.insert(schema.locations).values({ code: "T1", name: "Test", isDefault: true }).returning({ id: schema.locations.id });
    if (!cat || !loc) throw new Error("fixtures");
    const [product] = await db.insert(schema.products).values({ slug: "ledger-test", name: "Ledger Test", gender: "men", primaryCategoryId: cat.id, status: "active" }).returning({ id: schema.products.id });
    if (!product) throw new Error("product");
    const [variant] = await db.insert(schema.productVariants).values({ productId: product.id, sku: "T-LEDGER", pricePaise: 1000, isDefault: true }).returning({ id: schema.productVariants.id });
    if (!variant) throw new Error("variant");
    await db.insert(schema.inventory).values({ variantId: variant.id, locationId: loc.id });
    await db.insert(schema.inventoryTransactions).values({ variantId: variant.id, locationId: loc.id, delta: 5, reason: "receive" });
    await db.insert(schema.inventoryTransactions).values({ variantId: variant.id, locationId: loc.id, delta: -2, reason: "sale" });
    const level = await db.query.inventory.findFirst({ where: (i, { eq }) => eq(i.variantId, variant.id) });
    expect(level?.onHand).toBe(3);
    expect(level?.available).toBe(3);
    await expect(db.insert(schema.inventoryTransactions).values({ variantId: variant.id, locationId: loc.id, delta: -10, reason: "sale" })).rejects.toThrow();
  });

  it("populates the product search vector and keeps the primary category in product_categories", async () => {
    const product = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.slug, "ledger-test") });
    expect(product?.searchVector).toBeTruthy();
    const membership = await rows<{ count: string }>(sql`select count(*)::text as count from product_categories where product_id = ${product?.id}`);
    expect(Number(membership[0]?.count)).toBe(1);
  });
});

describe("row level security", () => {
  it("authenticated users see only their own profile; anon sees nothing", async () => {
    const [a] = await rows<{ id: string }>(sql`insert into auth.users (email) values ('a@example.com') returning id`);
    await rows(sql`insert into auth.users (email) values ('b@example.com')`);
    if (!a) throw new Error("user a");

    await db.execute(sql`set role authenticated`);
    await db.execute(sql.raw(`select set_config('request.jwt.claim.sub', '${a.id}', false)`));
    const mine = await rows<{ email: string }>(sql`select email from profiles`);
    expect(mine.map((r) => r.email)).toEqual(["a@example.com"]);
    await db.execute(sql`reset role`);

    await db.execute(sql`set role anon`);
    let anonRows: unknown[] = [];
    let denied = false;
    try {
      anonRows = await rows(sql`select email from profiles`);
    } catch {
      denied = true;
    }
    await db.execute(sql`reset role`);
    expect(denied || anonRows.length === 0).toBe(true);
  });
});
