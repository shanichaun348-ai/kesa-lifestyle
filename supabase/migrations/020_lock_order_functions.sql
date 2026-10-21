-- The order procedures run as SECURITY DEFINER and were callable with the
-- public (anon) key: anyone could release another order's stock or insert a
-- webhook-dedupe row. Only the server, through the service role, may call
-- them. Additive; idempotent.

REVOKE EXECUTE ON FUNCTION public.create_order_with_inventory(
  TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, JSONB, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(
  TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, JSONB, TEXT
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.release_order_inventory(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_order_inventory(TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_webhook_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_webhook_event(TEXT, TEXT, TEXT) TO service_role;

-- Functions created from now on in public are private by default; grant per function.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
