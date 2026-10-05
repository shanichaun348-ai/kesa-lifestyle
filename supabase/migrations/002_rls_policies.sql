-- Enable RLS on all tables. Service role bypasses RLS automatically.
-- Anon/authenticated roles have NO access by default (deny all).
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- product_variants: anon read-only (for stock display on storefront).
-- All writes go through the service role via stored procedures.
CREATE POLICY "anon_read_product_variants"
  ON product_variants FOR SELECT
  TO anon
  USING (true);
