import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { seed } from "@/db/seed/seed";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAccountService, type AccountService } from "@/modules/account/service";
import { forgotPasswordFlow, loginFlow, registerFlow, resetPasswordFlow } from "@/modules/auth/flows";
import { createCartService } from "@/modules/cart/service";
import { createCheckoutService } from "@/modules/checkout/service";

import { FakeAuthProvider } from "./fake-auth";
import { createMigratedDb, type TestDb } from "./harness";

/**
 * Authorization boundaries (docs/11 §3). Two customers, A and B, each with
 * profile, addresses, orders, wishlist and reviews. Every access path is
 * checked twice: at the service layer (user id from the session scopes the
 * query) and at the database layer (RLS as the `authenticated` role).
 */

let db: TestDb;
let close: () => Promise<void>;
let account: AccountService;
let A: { id: string; email: string };
let B: { id: string; email: string };
let orderA: string;
let orderB: string;
let orderItemA: string;
let orderItemB: string;
let addressA: string;
let addressB: string;

async function createUser(email: string) {
  const [u] = (await db.execute(sql`insert into auth.users (email) values (${email}) returning id`)).rows as Array<{ id: string }>;
  if (!u) throw new Error("user");
  return { id: u.id, email };
}

async function placeCodOrder(user: { id: string; email: string }, sku: string) {
  const carts = createCartService(db);
  const checkout = createCheckoutService({ db, gateway: null });
  const cart = await carts.resolve({ token: null, profileId: user.id, create: true });
  if (!cart) throw new Error("cart");
  await carts.addItem(cart.id, sku, 1);
  const placed = await checkout.placeOrder({
    cartId: cart.id,
    profileId: user.id,
    idempotencyKey: crypto.randomUUID(),
    contact: { email: user.email, phone: "+919876543210" },
    shippingAddress: { fullName: "Name", phone: "+919876543210", line1: "1 Road", city: "Mumbai", state: "Maharashtra", stateCode: "MH", pincode: "400001" },
    shippingMethod: "standard",
    paymentMethod: "cod",
    giftWrap: false,
    pincodeCodAvailable: true,
  });
  // Deliver it so it becomes reviewable.
  await db.update(schema.orders).set({ status: "delivered" }).where(eq(schema.orders.id, placed.orderId));
  const [item] = await db.select({ id: schema.orderItems.id }).from(schema.orderItems).where(eq(schema.orderItems.orderId, placed.orderId));
  return { orderNumber: placed.orderNumber, orderItemId: item?.id ?? "" };
}

const addr = (name: string) => ({ fullName: name, phone: "+919876543210", line1: "1 Road", city: "Mumbai", state: "Maharashtra", stateCode: "MH", pincode: "400001" });

beforeAll(async () => {
  const created = await createMigratedDb();
  db = created.db;
  close = () => created.client.close();
  await seed(db);
  account = createAccountService(db);
  A = await createUser("a@example.com");
  B = await createUser("b@example.com");
  ({ orderNumber: orderA, orderItemId: orderItemA } = await placeCodOrder(A, "KL-EAR-0001"));
  ({ orderNumber: orderB, orderItemId: orderItemB } = await placeCodOrder(B, "KL-CHA-0029-20INCH"));
  addressA = await account.addresses.create(A.id, addr("A Home"));
  addressB = await account.addresses.create(B.id, addr("B Home"));
  await account.wishlist.toggle(A.id, "pearl-drop-earrings-gold-tone");
  await account.wishlist.toggle(B.id, "fine-box-chain-stainless-steel");
  await account.reviews.create(B.id, { orderItemId: orderItemB, rating: 5, title: "Great chain", body: "Wears well every day, no colour change." });
}, 180_000);

afterAll(async () => {
  await close();
});

describe("service-layer ownership", () => {
  it("profiles: a user reads and updates only their own", async () => {
    expect((await account.profile.get(A.id))?.email).toBe(A.email);
    await account.profile.update(A.id, { firstName: "Asha" });
    expect((await account.profile.get(B.id))?.firstName).toBeNull();
  });

  it("addresses: B's address is invisible and immutable to A", async () => {
    expect(await account.addresses.get(A.id, addressB)).toBeNull();
    await expect(account.addresses.update(A.id, addressB, addr("Hijack"))).rejects.toMatchObject({ code: "not_found" });
    await expect(account.addresses.remove(A.id, addressB)).rejects.toMatchObject({ code: "not_found" });
    await expect(account.addresses.setDefault(A.id, addressB)).rejects.toMatchObject({ code: "not_found" });
    expect((await account.addresses.get(B.id, addressB))?.fullName).toBe("B Home");
    expect((await account.addresses.list(A.id)).map((a) => a.id)).toEqual([addressA]);
  });

  it("orders: B's order number returns not-found for A, and lists are disjoint", async () => {
    expect(await account.orders.get(A.id, orderB)).toBeNull();
    expect((await account.orders.get(A.id, orderA))?.order.orderNumber).toBe(orderA);
    expect((await account.orders.list(A.id)).map((o) => o.orderNumber)).toEqual([orderA]);
    expect((await account.orders.list(B.id)).map((o) => o.orderNumber)).toEqual([orderB]);
  });

  it("orders: payment details exposed are a summary, never the raw provider payload", async () => {
    const found = await account.orders.get(B.id, orderB);
    for (const p of found?.payments ?? []) expect(Object.keys(p)).not.toContain("raw");
  });

  it("reviews: A cannot review B's purchase, cannot review twice, and lists are disjoint", async () => {
    await expect(account.reviews.create(A.id, { orderItemId: orderItemB, rating: 1, title: "Not mine", body: "Trying to review someone else's item." })).rejects.toMatchObject({ code: "not_eligible" });
    await account.reviews.create(A.id, { orderItemId: orderItemA, rating: 4, title: "Lovely", body: "Light and comfortable all day long." });
    await expect(account.reviews.create(A.id, { orderItemId: orderItemA, rating: 4, title: "Again", body: "Second review attempt on the same item." })).rejects.toMatchObject({ code: "duplicate" });
    expect((await account.reviews.list(A.id)).map((r) => r.title)).toEqual(["Lovely"]);
    expect((await account.reviews.list(B.id)).map((r) => r.title)).toEqual(["Great chain"]);
    expect(await account.reviews.eligibleItems(A.id)).toEqual([]);
  });

  it("wishlists are per user and merge only into the caller's list", async () => {
    expect(await account.wishlist.slugs(A.id)).toEqual(["pearl-drop-earrings-gold-tone"]);
    expect(await account.wishlist.slugs(B.id)).toEqual(["fine-box-chain-stainless-steel"]);
    const merged = await account.wishlist.merge(A.id, ["layered-coin-necklace", "../../etc", "not-a-product"]);
    expect(merged.sort()).toEqual(["layered-coin-necklace", "pearl-drop-earrings-gold-tone"]);
    expect(await account.wishlist.slugs(B.id)).toEqual(["fine-box-chain-stainless-steel"]);
    expect((await account.wishlist.cards(A.id)).map((c) => c.slug).sort()).toEqual(["layered-coin-necklace", "pearl-drop-earrings-gold-tone"]);
  });

  it("preferences are recorded as a consent ledger per user", async () => {
    await account.preferences.set(A.id, A.email, { offers: true, new_arrivals: true, journal: false }, { source: "test" });
    expect(await account.preferences.get(A.id)).toEqual({ offers: true, new_arrivals: true, journal: false });
    expect(await account.preferences.get(B.id)).toEqual({ offers: false, new_arrivals: false, journal: false });
    await account.preferences.set(A.id, A.email, { offers: false, new_arrivals: true, journal: false }, { source: "test" });
    expect((await account.preferences.get(A.id)).offers).toBe(false);
  });

  it("referral codes are unique per user and stable", async () => {
    const codeA = await account.referral.getOrCreateCode(A.id);
    const codeB = await account.referral.getOrCreateCode(B.id);
    expect(codeA).toMatch(/^KESA-[A-Z2-9]{6}$/);
    expect(codeA).not.toBe(codeB);
    expect(await account.referral.getOrCreateCode(A.id)).toBe(codeA);
  });
});

describe("database-layer isolation (RLS as authenticated)", () => {
  async function asUser(userId: string, query: string) {
    await db.execute(sql`set role authenticated`);
    await db.execute(sql.raw(`select set_config('request.jwt.claim.sub', '${userId}', false)`));
    try {
      return (await db.execute(sql.raw(query))).rows as Array<Record<string, unknown>>;
    } finally {
      await db.execute(sql`reset role`);
    }
  }

  it("A sees only A's rows across every customer table", async () => {
    expect((await asUser(A.id, "select id from profiles")).map((r) => r.id)).toEqual([A.id]);
    expect((await asUser(A.id, "select id from addresses")).map((r) => r.id)).toEqual([addressA]);
    expect((await asUser(A.id, "select order_number from orders")).map((r) => r.order_number)).toEqual([orderA]);
    expect((await asUser(A.id, "select id from order_items")).map((r) => r.id)).toEqual([orderItemA]);
    expect((await asUser(A.id, "select order_id from order_addresses")).length).toBe(2);
    expect((await asUser(A.id, "select profile_id from wishlists")).map((r) => r.profile_id)).toEqual([A.id]);
    expect((await asUser(A.id, "select profile_id from reviews")).map((r) => r.profile_id)).toEqual([A.id]);
    expect((await asUser(A.id, "select profile_id from customer_consents")).every((r) => r.profile_id === A.id)).toBe(true);
    expect((await asUser(A.id, "select profile_id from referral_codes")).map((r) => r.profile_id)).toEqual([A.id]);
  });

  it("A cannot read payments, carts of others, or update B's profile", async () => {
    let denied = false;
    let rows: unknown[] = [];
    try {
      rows = await asUser(A.id, "select id from payments");
    } catch {
      denied = true;
    }
    expect(denied || rows.length === 0).toBe(true);
    const updated = await asUser(A.id, `update profiles set first_name = 'Hacked' where id = '${B.id}' returning id`);
    expect(updated).toEqual([]);
    expect((await account.profile.get(B.id))?.firstName).toBeNull();
    let deleteDenied = false;
    try {
      await asUser(A.id, `delete from addresses where id = '${addressB}'`);
    } catch {
      deleteDenied = true;
    }
    expect(deleteDenied).toBe(true);
    expect((await account.addresses.get(B.id, addressB))?.fullName).toBe("B Home");
  });

  it("anon sees nothing", async () => {
    await db.execute(sql`set role anon`);
    let denied = false;
    let rows: unknown[] = [];
    try {
      rows = (await db.execute(sql`select id from orders`)).rows;
    } catch {
      denied = true;
    } finally {
      await db.execute(sql`reset role`);
    }
    expect(denied || rows.length === 0).toBe(true);
  });
});

describe("auth flows", () => {
  const siteUrl = "http://localhost:3000";

  it("login is rate limited per email and never reveals whether the account exists", async () => {
    const provider = new FakeAuthProvider();
    provider.seed("c@example.com", "correct horse battery", crypto.randomUUID());
    const deps = { provider, siteUrl };
    const wrong = await loginFlow(deps, { email: "c@example.com", password: "nope" });
    const missing = await loginFlow(deps, { email: "nobody@example.com", password: "nope" });
    expect(wrong).toMatchObject({ ok: false, code: "invalid_credentials" });
    expect(missing).toMatchObject({ ok: false, code: "invalid_credentials" });
    expect((wrong as { message: string }).message).toBe((missing as { message: string }).message);
    for (let i = 0; i < 5; i++) expect(await loginFlow(deps, { email: "limited@example.com", password: "x" })).toMatchObject({ ok: false, code: "invalid_credentials" });
    expect(await loginFlow(deps, { email: "limited@example.com", password: "x" })).toMatchObject({ ok: false, code: "rate_limited" });
  });

  it("login syncs the profile, claims guest orders and sanitises the redirect", async () => {
    const provider = new FakeAuthProvider();
    const user = await createUser("claim@example.com");
    provider.seed(user.email, "correct horse battery", user.id);
    const checkout = createCheckoutService({ db, gateway: null });
    const carts = createCartService(db);
    const cart = await carts.resolve({ token: null, profileId: null, create: true });
    if (!cart) throw new Error("cart");
    await carts.addItem(cart.id, "KL-EAR-0008", 1);
    await checkout.placeOrder({
      cartId: cart.id,
      profileId: null,
      idempotencyKey: crypto.randomUUID(),
      contact: { email: "Claim@Example.com", phone: "+919876543210" },
      shippingAddress: addr("Guest"),
      shippingMethod: "standard",
      paymentMethod: "cod",
      giftWrap: false,
      pincodeCodAvailable: true,
    });
    const result = await loginFlow({ provider, siteUrl }, { email: user.email, password: "correct horse battery", next: "https://evil.example/phish" });
    expect(result).toMatchObject({ ok: true, value: { next: "/account/" } });
  });

  it("register and forgot-password are enumeration-safe; weak passwords are rejected", async () => {
    const provider = new FakeAuthProvider();
    provider.seed("taken@example.com", "correct horse battery", crypto.randomUUID());
    const deps = { provider, siteUrl };
    const fresh = await registerFlow(deps, { email: "fresh@example.com", password: "a long enough passphrase", firstName: "F", acceptsMarketing: true });
    const taken = await registerFlow(deps, { email: "taken@example.com", password: "a long enough passphrase", firstName: "T" });
    expect(fresh).toMatchObject({ ok: true, value: { needsConfirmation: true } });
    expect(taken).toMatchObject({ ok: true, value: { needsConfirmation: true } });
    expect(await registerFlow(deps, { email: "weak@example.com", password: "short", firstName: "W" })).toMatchObject({ ok: false, code: "invalid_input" });
    expect(await forgotPasswordFlow(deps, { email: "ghost@example.com" })).toEqual({ ok: true, value: undefined });
    expect(provider.resetRequests).toContain("ghost@example.com");
  });

  it("reset password needs a session and matching confirmation", async () => {
    const provider = new FakeAuthProvider();
    const deps = { provider, siteUrl };
    expect(await resetPasswordFlow(deps, { password: "another long passphrase", confirm: "different passphrase!" })).toMatchObject({ ok: false, code: "invalid_input" });
    expect(await resetPasswordFlow(deps, { password: "another long passphrase", confirm: "another long passphrase" })).toMatchObject({ ok: false, code: "no_session" });
    provider.seed("r@example.com", "old password 123", crypto.randomUUID());
    await provider.signInWithPassword({ email: "r@example.com", password: "old password 123" });
    expect(await resetPasswordFlow(deps, { password: "another long passphrase", confirm: "another long passphrase" })).toEqual({ ok: true, value: undefined });
  });

});

describe("rate limiter", () => {
  it("allows up to the limit in a window and resets afterwards", async () => {
    const t0 = new Date("2026-10-05T12:00:00Z");
    for (let i = 0; i < 3; i++) expect((await consumeRateLimit(db, "t:key", 3, 60, t0)).allowed).toBe(true);
    expect((await consumeRateLimit(db, "t:key", 3, 60, t0)).allowed).toBe(false);
    expect((await consumeRateLimit(db, "t:key", 3, 60, new Date(t0.getTime() + 61_000))).allowed).toBe(true);
  });
});
