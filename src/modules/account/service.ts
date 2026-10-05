/**
 * Customer account data access. Every function takes the authenticated
 * user's id and scopes every query to it, so another customer's rows are
 * indistinguishable from "not found" (no IDOR, docs/11 §3). RLS remains a
 * backstop underneath.
 */
import { randomBytes } from "node:crypto";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { isUniqueViolation, type Db } from "@/db/types";
import type { ProductCardData } from "@/components/storefront/product-card";

export class AccountError extends Error {
  constructor(
    readonly code: "not_found" | "forbidden" | "invalid" | "duplicate" | "not_eligible",
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}

export type AddressInput = {
  label?: string | undefined;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | undefined;
  landmark?: string | undefined;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  isDefaultShipping?: boolean | undefined;
};

export type ProfileInput = { firstName?: string | undefined; lastName?: string | undefined; phone?: string | null | undefined };

export type PreferenceTopic = "offers" | "new_arrivals" | "journal";
export const PREFERENCE_TOPICS: PreferenceTopic[] = ["offers", "new_arrivals", "journal"];

const REVIEWABLE_STATUSES = ["delivered", "completed"] as const;

function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `KESA-${out}`;
}

export function createAccountService(db: Db, clock: () => Date = () => new Date()) {
  const addressCols = {
    id: schema.addresses.id,
    label: schema.addresses.label,
    fullName: schema.addresses.fullName,
    phone: schema.addresses.phone,
    line1: schema.addresses.line1,
    line2: schema.addresses.line2,
    landmark: schema.addresses.landmark,
    city: schema.addresses.city,
    state: schema.addresses.state,
    stateCode: schema.addresses.stateCode,
    pincode: schema.addresses.pincode,
    isDefaultShipping: schema.addresses.isDefaultShipping,
  };

  async function ownedOrderId(userId: string, orderNumber: string): Promise<string | null> {
    const [row] = await db.select({ id: schema.orders.id }).from(schema.orders).where(and(eq(schema.orders.orderNumber, orderNumber), eq(schema.orders.profileId, userId))).limit(1);
    return row?.id ?? null;
  }

  return {
    profile: {
      async get(userId: string) {
        const [row] = await db
          .select({ id: schema.profiles.id, email: schema.profiles.email, firstName: schema.profiles.firstName, lastName: schema.profiles.lastName, phone: schema.profiles.phone, ordersCount: schema.profiles.ordersCount, createdAt: schema.profiles.createdAt })
          .from(schema.profiles)
          .where(and(eq(schema.profiles.id, userId), isNull(schema.profiles.deletedAt)))
          .limit(1);
        return row ?? null;
      },
      async update(userId: string, input: ProfileInput) {
        const [row] = await db
          .update(schema.profiles)
          .set({ firstName: input.firstName ?? null, lastName: input.lastName ?? null, phone: input.phone ?? null })
          .where(eq(schema.profiles.id, userId))
          .returning({ id: schema.profiles.id });
        if (!row) throw new AccountError("not_found", "Profile not found.");
      },
    },

    addresses: {
      async list(userId: string) {
        return db
          .select(addressCols)
          .from(schema.addresses)
          .where(and(eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt)))
          .orderBy(desc(schema.addresses.isDefaultShipping), desc(schema.addresses.createdAt));
      },
      async get(userId: string, id: string) {
        const [row] = await db
          .select(addressCols)
          .from(schema.addresses)
          .where(and(eq(schema.addresses.id, id), eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt)))
          .limit(1);
        return row ?? null;
      },
      async create(userId: string, input: AddressInput) {
        return db.transaction(async (tx) => {
          const existing = await tx.select({ id: schema.addresses.id }).from(schema.addresses).where(and(eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt)));
          const makeDefault = input.isDefaultShipping || existing.length === 0;
          if (makeDefault) await tx.update(schema.addresses).set({ isDefaultShipping: false }).where(eq(schema.addresses.profileId, userId));
          const [row] = await tx
            .insert(schema.addresses)
            .values({ ...toRow(input), profileId: userId, isDefaultShipping: makeDefault })
            .returning({ id: schema.addresses.id });
          if (!row) throw new AccountError("invalid", "Address could not be saved.");
          return row.id;
        });
      },
      async update(userId: string, id: string, input: AddressInput) {
        return db.transaction(async (tx) => {
          if (input.isDefaultShipping) await tx.update(schema.addresses).set({ isDefaultShipping: false }).where(eq(schema.addresses.profileId, userId));
          const [row] = await tx
            .update(schema.addresses)
            .set({ ...toRow(input), ...(input.isDefaultShipping ? { isDefaultShipping: true } : {}) })
            .where(and(eq(schema.addresses.id, id), eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt)))
            .returning({ id: schema.addresses.id });
          if (!row) throw new AccountError("not_found", "Address not found.");
        });
      },
      async remove(userId: string, id: string) {
        const [row] = await db
          .update(schema.addresses)
          .set({ deletedAt: clock().toISOString(), isDefaultShipping: false, isDefaultBilling: false })
          .where(and(eq(schema.addresses.id, id), eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt)))
          .returning({ id: schema.addresses.id });
        if (!row) throw new AccountError("not_found", "Address not found.");
      },
      async setDefault(userId: string, id: string) {
        return db.transaction(async (tx) => {
          const [target] = await tx.select({ id: schema.addresses.id }).from(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.profileId, userId), isNull(schema.addresses.deletedAt))).limit(1);
          if (!target) throw new AccountError("not_found", "Address not found.");
          await tx.update(schema.addresses).set({ isDefaultShipping: false }).where(eq(schema.addresses.profileId, userId));
          await tx.update(schema.addresses).set({ isDefaultShipping: true }).where(eq(schema.addresses.id, id));
        });
      },
    },

    orders: {
      async list(userId: string, limit = 20) {
        return db
          .select({
            orderNumber: schema.orders.orderNumber,
            status: schema.orders.status,
            paymentStatus: schema.orders.paymentStatus,
            paymentMethod: schema.orders.paymentMethod,
            totalPaise: schema.orders.totalPaise,
            placedAt: schema.orders.placedAt,
            itemCount: sql<number>`(select coalesce(sum(quantity), 0)::int from order_items oi where oi.order_id = ${schema.orders.id})`,
          })
          .from(schema.orders)
          .where(eq(schema.orders.profileId, userId))
          .orderBy(desc(schema.orders.placedAt))
          .limit(limit);
      },
      async get(userId: string, orderNumber: string) {
        const id = await ownedOrderId(userId, orderNumber);
        if (!id) return null;
        const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
        if (!order) return null;
        const [items, addresses, events, payments] = await Promise.all([
          db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)),
          db.select().from(schema.orderAddresses).where(eq(schema.orderAddresses.orderId, id)),
          db.select({ type: schema.orderEvents.type, createdAt: schema.orderEvents.createdAt, actorType: schema.orderEvents.actorType }).from(schema.orderEvents).where(eq(schema.orderEvents.orderId, id)).orderBy(schema.orderEvents.createdAt),
          // Payment summary only: never the raw provider payload.
          db.select({ provider: schema.payments.provider, status: schema.payments.status, method: schema.payments.method, amountPaise: schema.payments.amountPaise, createdAt: schema.payments.createdAt }).from(schema.payments).where(eq(schema.payments.orderId, id)).orderBy(desc(schema.payments.createdAt)),
        ]);
        return { order, items, addresses, events, payments };
      },
    },

    wishlist: {
      async ensure(userId: string) {
        const [existing] = await db.select({ id: schema.wishlists.id }).from(schema.wishlists).where(eq(schema.wishlists.profileId, userId)).limit(1);
        if (existing) return existing.id;
        const [created] = await db.insert(schema.wishlists).values({ profileId: userId }).returning({ id: schema.wishlists.id });
        if (!created) throw new AccountError("invalid", "Wishlist unavailable.");
        return created.id;
      },
      async slugs(userId: string): Promise<string[]> {
        const rows = await db
          .select({ slug: schema.products.slug })
          .from(schema.wishlistItems)
          .innerJoin(schema.wishlists, eq(schema.wishlists.id, schema.wishlistItems.wishlistId))
          .innerJoin(schema.products, eq(schema.products.id, schema.wishlistItems.productId))
          .where(eq(schema.wishlists.profileId, userId))
          .orderBy(desc(schema.wishlistItems.createdAt));
        return rows.map((r) => r.slug);
      },
      async toggle(userId: string, slug: string): Promise<{ saved: boolean }> {
        const wishlistId = await this.ensure(userId);
        const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.slug, slug), eq(schema.products.status, "active"))).limit(1);
        if (!product) throw new AccountError("not_found", "Product not found.");
        const removed = await db.delete(schema.wishlistItems).where(and(eq(schema.wishlistItems.wishlistId, wishlistId), eq(schema.wishlistItems.productId, product.id))).returning({ id: schema.wishlistItems.productId });
        if (removed.length > 0) return { saved: false };
        await db.insert(schema.wishlistItems).values({ wishlistId, productId: product.id }).onConflictDoNothing();
        return { saved: true };
      },
      /** Union of the device wishlist and the account wishlist; returns the merged slugs. */
      async merge(userId: string, slugs: string[]): Promise<string[]> {
        const wishlistId = await this.ensure(userId);
        const clean = [...new Set(slugs.filter((s) => /^[a-z0-9-]{1,120}$/.test(s)))].slice(0, 100);
        if (clean.length > 0) {
          const products = await db.select({ id: schema.products.id }).from(schema.products).where(and(inArray(schema.products.slug, clean), eq(schema.products.status, "active")));
          if (products.length > 0) await db.insert(schema.wishlistItems).values(products.map((p) => ({ wishlistId, productId: p.id }))).onConflictDoNothing();
        }
        return this.slugs(userId);
      },
      async cards(userId: string): Promise<ProductCardData[]> {
        const rows = await db
          .select({
            slug: schema.products.slug,
            name: schema.products.name,
            productId: schema.products.id,
            status: schema.products.status,
            pricePaise: sql<number>`(select min(v.price_paise) from product_variants v where v.product_id = ${schema.products.id} and v.status = 'active')`,
            compareAtPaise: sql<number | null>`(select max(v.compare_at_price_paise) from product_variants v where v.product_id = ${schema.products.id} and v.status = 'active')`,
            imagePath: sql<string | null>`(select m.storage_path from product_images i join media_assets m on m.id = i.media_asset_id where i.product_id = ${schema.products.id} and i.role = 'primary' limit 1)`,
            imageAlt: sql<string | null>`(select i.alt_text from product_images i where i.product_id = ${schema.products.id} and i.role = 'primary' limit 1)`,
            available: sql<number>`(select coalesce(sum(inv.available), 0)::int from inventory inv join product_variants v on v.id = inv.variant_id where v.product_id = ${schema.products.id})`,
          })
          .from(schema.wishlistItems)
          .innerJoin(schema.wishlists, eq(schema.wishlists.id, schema.wishlistItems.wishlistId))
          .innerJoin(schema.products, eq(schema.products.id, schema.wishlistItems.productId))
          .where(eq(schema.wishlists.profileId, userId))
          .orderBy(desc(schema.wishlistItems.createdAt));
        return rows.map((r) => ({
          slug: r.slug,
          name: r.name,
          pricePaise: Number(r.pricePaise ?? 0),
          compareAtPaise: r.compareAtPaise !== null && Number(r.compareAtPaise) > Number(r.pricePaise) ? Number(r.compareAtPaise) : undefined,
          image: r.imagePath ? { src: `/media/${r.imagePath}`, alt: r.imageAlt ?? r.name, unoptimized: r.imagePath.endsWith(".svg") } : { src: "", alt: r.name },
          soldOut: r.status !== "active" || Number(r.available) <= 0,
        }));
      },
    },

    reviews: {
      async list(userId: string) {
        return db
          .select({ id: schema.reviews.id, rating: schema.reviews.rating, title: schema.reviews.title, body: schema.reviews.body, status: schema.reviews.status, createdAt: schema.reviews.createdAt, productName: schema.products.name, productSlug: schema.products.slug })
          .from(schema.reviews)
          .innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId))
          .where(and(eq(schema.reviews.profileId, userId), isNull(schema.reviews.deletedAt)))
          .orderBy(desc(schema.reviews.createdAt));
      },
      /** Delivered order items without a review yet. */
      async eligibleItems(userId: string) {
        return db
          .select({ orderItemId: schema.orderItems.id, orderNumber: schema.orders.orderNumber, productName: schema.orderItems.productName, productId: schema.orderItems.productId, deliveredAt: schema.orders.completedAt })
          .from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
          .where(
            and(
              eq(schema.orders.profileId, userId),
              inArray(schema.orders.status, [...REVIEWABLE_STATUSES]),
              sql`not exists (select 1 from reviews r where r.order_item_id = ${schema.orderItems.id})`,
            ),
          )
          .orderBy(desc(schema.orders.placedAt));
      },
      async create(userId: string, input: { orderItemId: string; rating: number; title: string; body: string }) {
        const [item] = await db
          .select({ id: schema.orderItems.id, productId: schema.orderItems.productId })
          .from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
          .where(and(eq(schema.orderItems.id, input.orderItemId), eq(schema.orders.profileId, userId), inArray(schema.orders.status, [...REVIEWABLE_STATUSES])))
          .limit(1);
        if (!item || !item.productId) throw new AccountError("not_eligible", "You can review items from delivered orders only.");
        try {
          const [row] = await db
            .insert(schema.reviews)
            .values({ productId: item.productId, profileId: userId, orderItemId: item.id, rating: input.rating, title: input.title, body: input.body, isVerifiedPurchase: true, status: "pending" })
            .returning({ id: schema.reviews.id });
          return row?.id ?? null;
        } catch (error) {
          if (isUniqueViolation(error)) throw new AccountError("duplicate", "You have already reviewed this item.");
          throw error;
        }
      },
    },

    preferences: {
      async get(userId: string): Promise<Record<PreferenceTopic, boolean>> {
        const rows = await db
          .select({ topic: schema.customerConsents.topic, status: schema.customerConsents.status, recordedAt: schema.customerConsents.recordedAt })
          .from(schema.customerConsents)
          .where(and(eq(schema.customerConsents.profileId, userId), eq(schema.customerConsents.channel, "email")))
          .orderBy(desc(schema.customerConsents.recordedAt));
        const out: Record<PreferenceTopic, boolean> = { offers: false, new_arrivals: false, journal: false };
        const seen = new Set<string>();
        for (const r of rows) {
          if (seen.has(r.topic) || !PREFERENCE_TOPICS.includes(r.topic as PreferenceTopic)) continue;
          seen.add(r.topic);
          out[r.topic as PreferenceTopic] = r.status === "opted_in";
        }
        return out;
      },
      async set(userId: string, email: string, prefs: Record<PreferenceTopic, boolean>, meta: { source: string; ipHash?: string | undefined; userAgent?: string | undefined }) {
        const current = await this.get(userId);
        const changes = PREFERENCE_TOPICS.filter((t) => current[t] !== prefs[t]);
        if (changes.length === 0) return;
        await db.insert(schema.customerConsents).values(
          changes.map((topic) => ({ profileId: userId, email, channel: "email" as const, topic, status: prefs[topic] ? ("opted_in" as const) : ("opted_out" as const), source: meta.source, ipHash: meta.ipHash ?? null, userAgent: meta.userAgent ?? null })),
        );
        await db.update(schema.profiles).set({ acceptsMarketing: prefs.offers || prefs.new_arrivals }).where(eq(schema.profiles.id, userId));
      },
    },

    loyalty: {
      async summary(userId: string) {
        const [account] = await db.select().from(schema.loyaltyAccounts).where(eq(schema.loyaltyAccounts.profileId, userId)).limit(1);
        const transactions = await db
          .select({ id: schema.loyaltyTransactions.id, deltaPoints: schema.loyaltyTransactions.deltaPoints, kind: schema.loyaltyTransactions.kind, note: schema.loyaltyTransactions.note, createdAt: schema.loyaltyTransactions.createdAt, expiresAt: schema.loyaltyTransactions.expiresAt })
          .from(schema.loyaltyTransactions)
          .where(eq(schema.loyaltyTransactions.profileId, userId))
          .orderBy(desc(schema.loyaltyTransactions.createdAt))
          .limit(20);
        return { balancePoints: account?.balancePoints ?? 0, lifetimePoints: account?.lifetimePoints ?? 0, tier: account?.tier ?? "member", transactions };
      },
    },

    referral: {
      async getOrCreateCode(userId: string): Promise<string> {
        const [existing] = await db.select({ code: schema.referralCodes.code }).from(schema.referralCodes).where(eq(schema.referralCodes.profileId, userId)).limit(1);
        if (existing) return existing.code;
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateReferralCode();
          try {
            const [row] = await db.insert(schema.referralCodes).values({ profileId: userId, code }).onConflictDoNothing({ target: schema.referralCodes.profileId }).returning({ code: schema.referralCodes.code });
            if (row) return row.code;
            const [raced] = await db.select({ code: schema.referralCodes.code }).from(schema.referralCodes).where(eq(schema.referralCodes.profileId, userId)).limit(1);
            if (raced) return raced.code;
          } catch (error) {
            if (!isUniqueViolation(error)) throw error;
          }
        }
        throw new AccountError("invalid", "Could not create a referral code.");
      },
      async stats(userId: string) {
        const rows = await db.select({ status: schema.referrals.status }).from(schema.referrals).where(eq(schema.referrals.referrerId, userId));
        return { invited: rows.length, rewarded: rows.filter((r) => r.status === "rewarded").length };
      },
    },
  };
}

function toRow(input: AddressInput) {
  return {
    label: input.label ?? null,
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? null,
    landmark: input.landmark ?? null,
    city: input.city,
    state: input.state,
    stateCode: input.stateCode,
    pincode: input.pincode,
    country: "IN",
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
