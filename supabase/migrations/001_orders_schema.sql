-- Product variants: tracks inventory atomically.
-- Seeded from the demo catalog; production: synced from the real product catalog.
CREATE TABLE IF NOT EXISTS product_variants (
  sku TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  available_stock INT NOT NULL DEFAULT 0,
  reserved_stock INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_non_negative CHECK (available_stock >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_stock >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number BIGSERIAL UNIQUE,
  status TEXT NOT NULL DEFAULT 'CREATED',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  subtotal_paise BIGINT NOT NULL,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  shipping_paise BIGINT NOT NULL DEFAULT 0,
  gst_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL,
  coupon JSONB,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT status_valid CHECK (status IN (
    'CREATED','PAYMENT_PENDING','PAID','PAYMENT_FAILED',
    'CANCELLED','PROCESSING','SHIPPED','DELIVERED','REFUNDED'
  )),
  CONSTRAINT total_positive CHECK (total_paise > 0)
);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email);

-- Immutable snapshot of items at order creation time.
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_option_value TEXT,
  quantity INT NOT NULL,
  unit_price_paise BIGINT NOT NULL,
  line_total_paise BIGINT NOT NULL,
  gst_rate_bp INT NOT NULL,
  hsn_code TEXT NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT price_positive CHECK (unit_price_paise > 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  amount_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (razorpay_payment_id),
  CONSTRAINT tx_status_valid CHECK (status IN ('pending','captured','failed','refunded'))
);

-- Persistent webhook idempotency store.
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_type TEXT NOT NULL,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON webhook_events (idempotency_key);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  quantity INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, sku),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT reservation_status_valid CHECK (status IN ('reserved','released','fulfilled'))
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  coupon_code TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_code, order_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code ON coupon_redemptions (coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer ON coupon_redemptions (customer_email, coupon_code);

-- Prevents duplicate order creation on network retries.
CREATE TABLE IF NOT EXISTS checkout_idempotency_keys (
  key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
