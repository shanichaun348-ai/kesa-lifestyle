import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appAll, id, ownSelect, ownViaWishlist, timestamps } from "./_common";
import { mediaAssets, productVariants, products } from "./catalog";
import { orderItems, orders } from "./commerce";
import { profiles } from "./customers";
import { loyaltyTierEnum, loyaltyTxKindEnum, referralStatusEnum, reviewStatusEnum } from "./enums";

/* --------------------------------------------------------------- wishlist */

export const wishlists = pgTable(
  "wishlists",
  {
    id: id(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    /** Guest cookie token; merged into the profile wishlist on login. */
    token: uuid("token").notNull().defaultRandom(),
    shareSlug: text("share_slug"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("wishlists_token_idx").on(t.token),
    uniqueIndex("wishlists_profile_idx").on(t.profileId).where(sql`${t.profileId} is not null`),
    uniqueIndex("wishlists_share_slug_idx").on(t.shareSlug).where(sql`${t.shareSlug} is not null`),
    appAll(),
    ownSelect(t.profileId),
  ],
).enableRLS();

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.wishlistId, t.productId] }), index("wishlist_items_product_idx").on(t.productId), appAll(), ownViaWishlist(t.wishlistId)],
).enableRLS();

/* ---------------------------------------------------------------- reviews */

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    /** One review per purchased line; null for non-purchase reviews if ever allowed. */
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
    rating: smallint("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
    status: reviewStatusEnum("status").notNull().default("pending"),
    adminReply: text("admin_reply"),
    adminReplyAt: timestamp("admin_reply_at", { withTimezone: true, mode: "string" }),
    helpfulCount: integer("helpful_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    index("reviews_product_status_idx").on(t.productId, t.status, t.createdAt),
    index("reviews_profile_idx").on(t.profileId),
    uniqueIndex("reviews_order_item_idx").on(t.orderItemId).where(sql`${t.orderItemId} is not null`),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
    check("reviews_body_length", sql`length(${t.body}) between 10 and 2000`),
    appAll(),
    ownSelect(t.profileId),
  ],
).enableRLS();

export const reviewImages = pgTable(
  "review_images",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("review_images_review_idx").on(t.reviewId), appAll()],
).enableRLS();

/* ---------------------------------------------------------------- loyalty */

/** Balance is denormalised from the ledger; the ledger is the truth. */
export const loyaltyAccounts = pgTable(
  "loyalty_accounts",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    balancePoints: integer("balance_points").notNull().default(0),
    lifetimePoints: integer("lifetime_points").notNull().default(0),
    tier: loyaltyTierEnum("tier").notNull().default("member"),
    updatedAt: timestamps.updatedAt,
  },
  (t) => [check("loyalty_accounts_balance_non_negative", sql`${t.balancePoints} >= 0`), appAll(), ownSelect(t.profileId)],
).enableRLS();

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    deltaPoints: integer("delta_points").notNull(),
    kind: loyaltyTxKindEnum("kind").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    note: text("note"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("loyalty_transactions_profile_idx").on(t.profileId, t.createdAt), check("loyalty_transactions_delta_nonzero", sql`${t.deltaPoints} <> 0`), appAll(), ownSelect(t.profileId)],
).enableRLS();

/* -------------------------------------------------------------- referrals */

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("referral_codes_profile_idx").on(t.profileId), uniqueIndex("referral_codes_code_idx").on(t.code), appAll(), ownSelect(t.profileId)],
).enableRLS();

export const referrals = pgTable(
  "referrals",
  {
    id: id(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    refereeId: uuid("referee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    refereeOrderId: uuid("referee_order_id").references(() => orders.id, { onDelete: "set null" }),
    status: referralStatusEnum("status").notNull().default("pending"),
    rewardedAt: timestamp("rewarded_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("referrals_referee_idx").on(t.refereeId),
    index("referrals_referrer_idx").on(t.referrerId),
    check("referrals_not_self", sql`${t.referrerId} <> ${t.refereeId}`),
    appAll(),
    ownSelect(t.referrerId),
  ],
).enableRLS();
