import { z } from "zod";

/**
 * Environment validation (docs/11 §9). Two schemas:
 * - `serverEnv`: secrets and connection strings. Only importable from
 *   server code; never reaches the browser bundle because nothing under
 *   `NEXT_PUBLIC_` is read here and the module is never imported by client
 *   components (enforced by tests/unit/secrets-boundary.test.ts).
 * - `publicEnv`: values that are safe to inline into the client bundle.
 *
 * Every variable is optional at build time so the app builds without a
 * database (demo repositories). Features that need a value call
 * `requireServerEnv()` and fail with a clear message at runtime.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Postgres connection for the `kesa_app` role via the Supabase pooler (transaction mode). */
  DATABASE_URL: z.url().optional(),
  /** Direct (non-pooled) connection used only by migrations and seeds. */
  DATABASE_DIRECT_URL: z.url().optional(),
  /** Supabase project URL (e.g. https://xyzabc.supabase.co). Required in production. */
  SUPABASE_URL: z.url().optional(),
  /** Service-role key. Server only. Used for Storage admin and auth admin calls, never for data queries. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  /** Razorpay API key ID. Server-side only (also set NEXT_PUBLIC_RAZORPAY_KEY_ID for the browser modal). */
  RAZORPAY_KEY_ID: z.string().min(10).optional(),
  /** Razorpay API key secret. Server only. */
  RAZORPAY_KEY_SECRET: z.string().min(10).optional(),
  /** Razorpay webhook signing secret, set in the Razorpay dashboard. Server only. */
  RAZORPAY_WEBHOOK_SECRET: z.string().min(10).optional(),
  /** Shared secret for cron-invoked job routes. */
  CRON_SECRET: z.string().min(16).optional(),
  /** Resend API key for transactional email. Server only. */
  RESEND_API_KEY: z.string().min(10).optional(),
  /** Verified sender, e.g. "Kesa Lifestyle <orders@kesalifestyle.com>". */
  EMAIL_FROM: z.string().min(3).optional(),
  /** Internal inbox that receives a copy of every new paid order. */
  ORDER_NOTIFY_EMAIL: z.email().optional(),
  /** WhatsApp Business Platform (Meta Cloud API) system-user token. Server only. */
  WHATSAPP_ACCESS_TOKEN: z.string().min(20).optional(),
  /** Phone number ID of the sender number in WhatsApp Manager (digits). */
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d{5,}$/).optional(),
  /** Approved template name for the order confirmation. Defaults to "order_confirmed". */
  WHATSAPP_ORDER_TEMPLATE: z.string().min(1).optional(),
  /** Approved Utility template for cash-on-delivery confirmations (same 4 parameters; "pay on delivery" wording). */
  WHATSAPP_COD_ORDER_TEMPLATE: z.string().min(1).optional(),
  /** Approved Utility template: order shipped (first name, order ref, courier, tracking). */
  WHATSAPP_SHIPPED_TEMPLATE: z.string().min(1).optional(),
  /** Approved Utility template: order delivered (first name, order ref). */
  WHATSAPP_DELIVERED_TEMPLATE: z.string().min(1).optional(),
  /** Approved Marketing template: bag reminder (items, subtotal, resume link). Unset = email only. */
  WHATSAPP_CART_TEMPLATE: z.string().min(1).optional(),
  /** Language code the template was approved in. Defaults to "en". */
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().min(2).optional(),
  /** Graph API version. Defaults to v21.0. */
  WHATSAPP_API_VERSION: z.string().regex(/^v\d+\.\d+$/).optional(),
  /** Allows the seed script to run against a non-local database. Never set in production. */
  ALLOW_SEED: z.enum(["1"]).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  /** Razorpay key id (public; used by the hosted checkout in the browser). */
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(10).optional(),
  /** Meta Pixel id (Events Manager → Data sources). Digits only; it is interpolated into an inline script. */
  NEXT_PUBLIC_META_PIXEL_ID: z.string().regex(/^\d{5,20}$/).optional(),
  /** Microsoft Clarity project id (clarity.microsoft.com → Settings → Overview). */
  NEXT_PUBLIC_CLARITY_PROJECT_ID: z.string().regex(/^[a-z0-9]{4,24}$/i).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function parse<T>(schema: z.ZodType<T>, input: Record<string, string | undefined>, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid ${label} environment:\n${issues}`);
  }
  return result.data;
}

/** Public values. `process.env.NEXT_PUBLIC_*` must be referenced literally so Next can inline them. */
export const publicEnv: PublicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_CLARITY_PROJECT_ID: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  },
  "public",
);

let cachedServerEnv: ServerEnv | null = null;

/** Server-side values. Call only from server code. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() was called in the browser. Server secrets must never reach the client.");
  }
  // Re-parse on every call in test so vi.stubEnv changes are reflected.
  if (process.env.NODE_ENV === "test") {
    return parse(serverSchema, process.env, "server");
  }
  cachedServerEnv ??= parse(serverSchema, process.env, "server");
  return cachedServerEnv;
}

/** Fetch a server variable or fail with an actionable message. */
export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];
  if (value === undefined || value === null) {
    throw new Error(`${key} is not set. Copy .env.example to .env.local and fill it in (see README → Environment variables).`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

/**
 * Asserts that all variables required for production are present.
 * Call this at application startup in production to fail fast with a clear message
 * instead of silently falling back to demo/in-memory implementations.
 *
 * No-ops in development and test environments.
 */
export function assertProductionConfig(): void {
  const env = getServerEnv();
  if (env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.RAZORPAY_KEY_ID) missing.push("RAZORPAY_KEY_ID");
  if (!env.RAZORPAY_KEY_SECRET) missing.push("RAZORPAY_KEY_SECRET");
  if (!env.RAZORPAY_WEBHOOK_SECRET) missing.push("RAZORPAY_WEBHOOK_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Production startup failure: the following required environment variables are not set:\n` +
        missing.map((k) => `  - ${k}`).join("\n") + "\n" +
        "See docs/PRODUCTION_CONFIGURATION.md for setup instructions.",
    );
  }
}
