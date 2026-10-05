CREATE TYPE "public"."cart_status" AS ENUM('active', 'merged', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."shipping_method" AS ENUM('standard', 'express');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_paise_at_add" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_range" CHECK ("cart_items"."quantity" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"coupon_code_id" uuid,
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "shipping_method" SET DATA TYPE "public"."shipping_method" USING "shipping_method"::"public"."shipping_method";--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_code_id_coupon_codes_id_fk" FOREIGN KEY ("coupon_code_id") REFERENCES "public"."coupon_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_idx" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_token_idx" ON "carts" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_active_profile_idx" ON "carts" USING btree ("profile_id") WHERE "carts"."profile_id" is not null and "carts"."status" = 'active';--> statement-breakpoint
CREATE INDEX "carts_status_updated_idx" ON "carts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "cart_items" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "carts" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "carts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "carts"."profile_id");--> statement-breakpoint
-- updated_at maintenance for the tables added in this migration.
DROP TRIGGER IF EXISTS set_updated_at ON public.carts;--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON public.cart_items;--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
GRANT SELECT ON public.carts TO authenticated;
