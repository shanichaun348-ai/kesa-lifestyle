import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

import { appAll, id, lower, ownSelect, timestamps } from "./_common";
import { adminRoleEnum, consentChannelEnum, consentStatusEnum, consentTopicEnum, subscriberStatusEnum } from "./enums";

/**
 * `users` are Supabase `auth.users` (managed by Supabase Auth). `profiles`
 * is the application-side row, created by trigger on sign-up.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    phone: text("phone"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    notesInternal: text("notes_internal"),
    isBlocked: boolean("is_blocked").notNull().default(false),
    riskFlags: text("risk_flags").array().notNull().default(sql`'{}'::text[]`),
    ordersCount: integer("orders_count").notNull().default(0),
    totalSpentPaise: bigint("total_spent_paise", { mode: "number" }).notNull().default(0),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true, mode: "string" }),
    /** Soft delete / anonymisation marker (DPDP erasure keeps financial records). */
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("profiles_email_lower_idx").on(lower(t.email)),
    check("profiles_phone_format", sql`${t.phone} is null or ${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
    appAll(),
    ownSelect(t.id),
    pgPolicy("authenticated_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = ${t.id}`,
      withCheck: sql`(select auth.uid()) = ${t.id}`,
    }),
  ],
).enableRLS();

export const addresses = pgTable(
  "addresses",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    label: text("label"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    landmark: text("landmark"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    stateCode: text("state_code"),
    pincode: text("pincode").notNull(),
    country: text("country").notNull().default("IN"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    index("addresses_profile_idx").on(t.profileId),
    uniqueIndex("addresses_one_default_shipping_idx")
      .on(t.profileId)
      .where(sql`${t.isDefaultShipping} = true and ${t.deletedAt} is null`),
    uniqueIndex("addresses_one_default_billing_idx")
      .on(t.profileId)
      .where(sql`${t.isDefaultBilling} = true and ${t.deletedAt} is null`),
    check("addresses_pincode_format", sql`${t.country} <> 'IN' or ${t.pincode} ~ '^[1-9][0-9]{5}$'`),
    appAll(),
    ownSelect(t.profileId),
  ],
).enableRLS();

/** Append-only consent ledger (DPDP). Current state is the latest row per (email, channel, topic). */
export const customerConsents = pgTable(
  "customer_consents",
  {
    id: id(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    channel: consentChannelEnum("channel").notNull(),
    topic: consentTopicEnum("topic").notNull(),
    status: consentStatusEnum("status").notNull(),
    source: text("source").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("customer_consents_email_idx").on(lower(t.email), t.channel, t.topic, t.recordedAt), appAll(), ownSelect(t.profileId)],
).enableRLS();

/** Footer/newsletter captures, including guests. Double opt-in via `confirmed_at`. */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull(),
    status: subscriberStatusEnum("status").notNull().default("pending"),
    source: text("source").notNull().default("footer"),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    confirmToken: uuid("confirm_token").notNull().defaultRandom(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: "string" }),
    ipHash: text("ip_hash"),
    ...timestamps,
  },
  (t) => [uniqueIndex("newsletter_subscribers_email_lower_idx").on(lower(t.email)), uniqueIndex("newsletter_subscribers_token_idx").on(t.confirmToken), appAll()],
).enableRLS();

/** Only rows here may access the admin. Roles per docs/08 §14. */
export const adminUsers = pgTable(
  "admin_users",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: adminRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  () => [appAll()],
).enableRLS();
