-- ─────────────────────────────────────────────────────────────────────────────
-- Functions, triggers, extensions, grants and role settings.
-- Hand-written companion to 0000_initial_schema (docs/05 §12, docs/11 §6).
-- Every statement is idempotent-safe where Postgres allows it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- ── Application role ─────────────────────────────────────────────────────────
-- The password is NEVER set here. The operator runs, once per environment:
--   alter role kesa_app with password '<long random value>';
ALTER ROLE "kesa_app" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO "kesa_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "kesa_app";--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "kesa_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "kesa_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "kesa_app";--> statement-breakpoint

-- Append-only tables: the server may insert and read, never rewrite history.
REVOKE UPDATE, DELETE ON "inventory_transactions", "order_events", "customer_consents", "audit_logs", "payment_events" FROM "kesa_app";--> statement-breakpoint

-- ── Supabase platform roles ──────────────────────────────────────────────────
-- `anon` gets nothing. `authenticated` gets SELECT only on the tables that carry
-- a self-scoped policy (defence in depth; the app never relies on this path).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "anon";--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM "anon";--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "authenticated";--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO "authenticated";--> statement-breakpoint
GRANT SELECT ON "profiles", "addresses", "customer_consents", "orders", "order_items", "order_addresses", "order_events", "wishlists", "wishlist_items", "reviews", "loyalty_accounts", "loyalty_transactions", "referral_codes", "referrals" TO "authenticated";--> statement-breakpoint
GRANT UPDATE ("first_name", "last_name", "phone", "accepts_marketing") ON "profiles" TO "authenticated";--> statement-breakpoint

-- ── updated_at maintenance ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;--> statement-breakpoint

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', r.table_name);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', r.table_name);
  END LOOP;
END $$;--> statement-breakpoint

-- ── Profiles follow auth.users ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();--> statement-breakpoint

-- ── Product search vector ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.products_refresh_search_vector() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.highlights, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description_md, '')), 'C');
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS products_search_vector ON public.products;--> statement-breakpoint
CREATE TRIGGER products_search_vector BEFORE INSERT OR UPDATE OF name, highlights, short_description, description_md ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_refresh_search_vector();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (name gin_trgm_ops);--> statement-breakpoint

-- ── Primary category is always a member of product_categories ────────────────
CREATE OR REPLACE FUNCTION public.products_ensure_primary_category() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.product_categories (product_id, category_id)
  VALUES (NEW.id, NEW.primary_category_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS products_primary_category ON public.products;--> statement-breakpoint
CREATE TRIGGER products_primary_category AFTER INSERT OR UPDATE OF primary_category_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_ensure_primary_category();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.product_categories_protect_primary() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products p WHERE p.id = OLD.product_id AND p.primary_category_id = OLD.category_id) THEN
    RAISE EXCEPTION 'Cannot remove the primary category % from product %', OLD.category_id, OLD.product_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS product_categories_protect_primary ON public.product_categories;--> statement-breakpoint
CREATE TRIGGER product_categories_protect_primary BEFORE DELETE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.product_categories_protect_primary();--> statement-breakpoint

-- ── Facet aggregate: products.attribute_value_ids ────────────────────────────
CREATE OR REPLACE FUNCTION public.products_refresh_attribute_value_ids() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products p
  SET attribute_value_ids = COALESCE((
    SELECT array_agg(pav.attribute_value_id ORDER BY pav.attribute_value_id)
    FROM public.product_attribute_values pav WHERE pav.product_id = target
  ), '{}'::uuid[])
  WHERE p.id = target;
  RETURN NULL;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS product_attribute_values_refresh ON public.product_attribute_values;--> statement-breakpoint
CREATE TRIGGER product_attribute_values_refresh AFTER INSERT OR UPDATE OR DELETE ON public.product_attribute_values
FOR EACH ROW EXECUTE FUNCTION public.products_refresh_attribute_value_ids();--> statement-breakpoint

-- ── Inventory ledger → inventory.on_hand ─────────────────────────────────────
-- The ledger is the truth; levels are derived. Negative results violate the
-- check constraint on inventory.on_hand, so overselling fails atomically.
CREATE OR REPLACE FUNCTION public.inventory_apply_transaction() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Update first: an INSERT … ON CONFLICT would evaluate the non-negative
  -- check on the proposed row (the bare delta) before conflict resolution.
  UPDATE public.inventory
  SET on_hand = on_hand + NEW.delta
  WHERE variant_id = NEW.variant_id AND location_id = NEW.location_id;
  IF NOT FOUND THEN
    INSERT INTO public.inventory (variant_id, location_id, on_hand)
    VALUES (NEW.variant_id, NEW.location_id, NEW.delta);
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS inventory_apply_transaction ON public.inventory_transactions;--> statement-breakpoint
CREATE TRIGGER inventory_apply_transaction AFTER INSERT ON public.inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.inventory_apply_transaction();--> statement-breakpoint

-- ── Loyalty ledger → loyalty_accounts.balance_points ─────────────────────────
CREATE OR REPLACE FUNCTION public.loyalty_apply_transaction() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.loyalty_accounts (profile_id, balance_points, lifetime_points)
  VALUES (NEW.profile_id, NEW.delta_points, GREATEST(NEW.delta_points, 0))
  ON CONFLICT (profile_id)
  DO UPDATE SET
    balance_points = public.loyalty_accounts.balance_points + EXCLUDED.balance_points,
    lifetime_points = public.loyalty_accounts.lifetime_points + GREATEST(EXCLUDED.balance_points, 0);
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS loyalty_apply_transaction ON public.loyalty_transactions;--> statement-breakpoint
CREATE TRIGGER loyalty_apply_transaction AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.loyalty_apply_transaction();--> statement-breakpoint

-- ── Coupon code usage counter ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.coupon_codes_count_redemption() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code_id IS NOT NULL THEN
    UPDATE public.coupon_codes SET usage_count = usage_count + 1 WHERE id = NEW.code_id;
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS coupon_redemptions_count ON public.coupon_redemptions;--> statement-breakpoint
CREATE TRIGGER coupon_redemptions_count AFTER INSERT ON public.coupon_redemptions
FOR EACH ROW EXECUTE FUNCTION public.coupon_codes_count_redemption();--> statement-breakpoint

-- ── Review aggregates on products (approved reviews only) ────────────────────
CREATE OR REPLACE FUNCTION public.products_refresh_rating() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products p
  SET rating_count = s.cnt,
      rating_avg = s.avg
  FROM (
    SELECT count(*)::int AS cnt, round(avg(rating)::numeric, 2) AS avg
    FROM public.reviews r
    WHERE r.product_id = target AND r.status = 'approved' AND r.deleted_at IS NULL
  ) s
  WHERE p.id = target;
  RETURN NULL;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS reviews_refresh_rating ON public.reviews;--> statement-breakpoint
CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.products_refresh_rating();
