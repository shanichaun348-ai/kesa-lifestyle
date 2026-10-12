-- Cash on delivery: how an order is paid and the COD handling fee folded
-- into total_paise. Existing rows are Razorpay. Additive and idempotent;
-- the status CHECK is untouched (COD orders use CREATED → PROCESSING → …).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_fee_paise BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_valid'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid
      CHECK (payment_method IN ('razorpay', 'cod'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_cod_fee_non_negative'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_cod_fee_non_negative CHECK (cod_fee_paise >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders (payment_method);
