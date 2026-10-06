-- Fix: create_order_with_inventory was inserting into inventory_reservations (step 3)
-- before inserting into orders (step 4), violating the FK constraint
-- inventory_reservations_order_id_fkey. Corrected order: create order first, then
-- decrement inventory and insert reservations.
CREATE OR REPLACE FUNCTION create_order_with_inventory(
  p_order_id TEXT,
  p_idempotency_key TEXT,
  p_request_hash TEXT,
  p_customer JSONB,
  p_shipping_address JSONB,
  p_items JSONB,
  p_subtotal_paise BIGINT,
  p_discount_paise BIGINT,
  p_shipping_paise BIGINT,
  p_gst_paise BIGINT,
  p_total_paise BIGINT,
  p_coupon JSONB,
  p_currency TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_order_id TEXT;
  v_existing_hash TEXT;
  v_sku TEXT;
  v_quantity INT;
  v_available INT;
  v_item JSONB;
BEGIN
  -- 1. Idempotency check
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    SELECT order_id, request_hash INTO v_existing_order_id, v_existing_hash
    FROM checkout_idempotency_keys
    WHERE key = p_idempotency_key;

    IF v_existing_order_id IS NOT NULL THEN
      IF v_existing_hash != p_request_hash THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'IDEMPOTENCY_CONFLICT',
          'message', 'Same idempotency key used with different request.'
        );
      END IF;
      RETURN jsonb_build_object('ok', true, 'orderId', v_existing_order_id, 'idempotent', true);
    END IF;
  END IF;

  -- 2. Lock all product_variants rows FOR UPDATE and check stock.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku := v_item->>'sku';
    v_quantity := (v_item->>'quantity')::INT;

    SELECT available_stock INTO v_available
    FROM product_variants
    WHERE sku = v_sku
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'PRODUCT_NOT_FOUND', 'sku', v_sku);
    END IF;

    IF v_available < v_quantity THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'INSUFFICIENT_STOCK',
        'sku', v_sku, 'available', v_available, 'requested', v_quantity
      );
    END IF;
  END LOOP;

  -- 3. Create order row first (inventory_reservations FK requires this to exist).
  INSERT INTO orders (
    id, status, customer_name, customer_email, customer_phone,
    shipping_address, subtotal_paise, discount_paise, shipping_paise,
    gst_paise, total_paise, coupon, currency, created_at, updated_at
  ) VALUES (
    p_order_id, 'CREATED',
    p_customer->>'name', p_customer->>'email', p_customer->>'phone',
    p_shipping_address,
    p_subtotal_paise, p_discount_paise, p_shipping_paise,
    p_gst_paise, p_total_paise,
    p_coupon, p_currency,
    NOW(), NOW()
  );

  -- 4. Decrement inventory and insert reservations (order now exists for FK).
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku := v_item->>'sku';
    v_quantity := (v_item->>'quantity')::INT;

    UPDATE product_variants
    SET
      available_stock = available_stock - v_quantity,
      reserved_stock = reserved_stock + v_quantity,
      updated_at = NOW()
    WHERE sku = v_sku;

    INSERT INTO inventory_reservations (order_id, sku, quantity, status)
    VALUES (p_order_id, v_sku, v_quantity, 'reserved')
    ON CONFLICT (order_id, sku) DO NOTHING;
  END LOOP;

  -- 5. Create order items.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, sku, product_id, product_name, variant_option_value,
      quantity, unit_price_paise, line_total_paise, gst_rate_bp, hsn_code
    ) VALUES (
      p_order_id,
      v_item->>'sku',
      v_item->>'productId',
      v_item->>'productName',
      v_item->>'variantOptionValue',
      (v_item->>'quantity')::INT,
      (v_item->>'unitPricePaise')::BIGINT,
      (v_item->>'lineTotalPaise')::BIGINT,
      (v_item->>'gstRateBp')::INT,
      v_item->>'hsnCode'
    );
  END LOOP;

  -- 6. Record coupon redemption.
  IF p_coupon IS NOT NULL THEN
    INSERT INTO coupon_redemptions (coupon_code, order_id, customer_email)
    VALUES (p_coupon->>'code', p_order_id, p_customer->>'email')
    ON CONFLICT (coupon_code, order_id) DO NOTHING;
  END IF;

  -- 7. Register idempotency key.
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    INSERT INTO checkout_idempotency_keys (key, order_id, request_hash)
    VALUES (p_idempotency_key, p_order_id, p_request_hash)
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'orderId', p_order_id, 'idempotent', false);
END;
$$;
