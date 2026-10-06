-- Grant table access to the roles used by PostgREST.
--
-- service_role: server-side only (bypasses RLS). Needs ALL for order management.
-- anon: storefront browser client (subject to RLS). Only product_variants SELECT
--       is allowed — the RLS policy in 002 further restricts to true.
-- authenticated: future customer accounts (subject to RLS). Placeholder; no
--               policies exist yet so effective access is deny-all.
--
-- Without these grants the PostgREST REST API returns 403 even for service_role,
-- because disabling "Automatically expose new tables" suppresses the default grants.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  orders,
  order_items,
  payment_transactions,
  webhook_events,
  inventory_reservations,
  coupon_redemptions,
  checkout_idempotency_keys,
  product_variants
TO service_role;

-- Allow anon to read product stock on the storefront.
-- RLS policy "anon_read_product_variants" (002_rls_policies.sql) applies on top.
GRANT SELECT ON TABLE product_variants TO anon;

-- Sequences: service_role needs USAGE so order_number BIGSERIAL increments work.
GRANT USAGE, SELECT ON SEQUENCE orders_order_number_seq TO service_role;
