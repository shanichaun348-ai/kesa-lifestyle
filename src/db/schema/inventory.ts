import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appAll, id, timestamps } from "./_common";
import { productVariants } from "./catalog";
import { inventoryReasonEnum } from "./enums";

/** One warehouse at launch; the dimension exists now because retrofitting it is painful. */
export const locations = pgTable(
  "locations",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: jsonb("address").$type<Record<string, string>>(),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("locations_code_idx").on(t.code),
    uniqueIndex("locations_one_default_idx")
      .on(t.isDefault)
      .where(sql`${t.isDefault} = true`),
    appAll(),
  ],
).enableRLS();

/** Stock levels. `on_hand` is maintained from the `inventory_transactions` ledger by trigger. */
export const inventory = pgTable(
  "inventory",
  {
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    available: integer("available").generatedAlwaysAs(sql`on_hand - reserved`),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    trackInventory: boolean("track_inventory").notNull().default(true),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    updatedAt: timestamps.updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.locationId] }),
    check("inventory_on_hand_non_negative", sql`${t.onHand} >= 0`),
    check("inventory_reserved_non_negative", sql`${t.reserved} >= 0`),
    check("inventory_reserved_within_stock", sql`${t.reserved} <= ${t.onHand} or ${t.allowBackorder}`),
    appAll(),
  ],
).enableRLS();

/** Append-only ledger. UPDATE/DELETE are revoked from `kesa_app` in the grants migration. */
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: inventoryReasonEnum("reason").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    note: text("note"),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_transactions_variant_idx").on(t.variantId, t.createdAt),
    check("inventory_transactions_delta_nonzero", sql`${t.delta} <> 0`),
    appAll(),
  ],
).enableRLS();
