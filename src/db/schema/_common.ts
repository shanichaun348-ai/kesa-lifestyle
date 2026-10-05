import { sql, type SQL } from "drizzle-orm";
import { customType, pgPolicy, pgRole, timestamp, uuid, type PgColumn } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

/**
 * Shared column helpers, roles and policy builders.
 *
 * RLS model (ADR-26):
 * - RLS is enabled on every table.
 * - `anon` has no policies anywhere (deny all).
 * - `authenticated` gets narrow self-scoped read policies on customer-owned
 *   tables as defence in depth; the app never relies on them.
 * - `kesa_app` (the server's role) gets an explicit allow-all policy per
 *   table, so access stays policy-governed without BYPASSRLS.
 */

/** Application role used by the Next.js server through the pooler. Created by migrations; password set by the operator. */
export const kesaApp = pgRole("kesa_app");

export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
};

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Full access for the server role. */
export const appAll = () =>
  pgPolicy("kesa_app_all", { as: "permissive", for: "all", to: kesaApp, using: sql`true`, withCheck: sql`true` });

/** `authenticated` may read rows where `column = auth.uid()`. */
export const ownSelect = (column: PgColumn) =>
  pgPolicy("authenticated_select_own", { for: "select", to: authenticatedRole, using: sql`(select auth.uid()) = ${column}` });

/** `authenticated` may read rows whose parent order belongs to them. */
export const ownViaOrder = (orderIdColumn: PgColumn) =>
  pgPolicy("authenticated_select_via_order", {
    for: "select",
    to: authenticatedRole,
    using: sql`exists (select 1 from public.orders o where o.id = ${orderIdColumn} and o.profile_id = (select auth.uid()))`,
  });

/** `authenticated` may read rows whose wishlist belongs to them. */
export const ownViaWishlist = (wishlistIdColumn: PgColumn) =>
  pgPolicy("authenticated_select_via_wishlist", {
    for: "select",
    to: authenticatedRole,
    using: sql`exists (select 1 from public.wishlists w where w.id = ${wishlistIdColumn} and w.profile_id = (select auth.uid()))`,
  });

export const lower = (column: PgColumn): SQL => sql`lower(${column})`;
