import { inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";

import * as schema from "@/db/schema";

/**
 * Non-secret store configuration, read from the `settings` table and
 * validated against defaults. Values marked "pending" in the seed depend on
 * owner decisions D4 and D7 and must be confirmed before launch.
 */
const paise = z.number().int().nonnegative();

export const storeSettingsSchema = z.object({
  shipping: z
    .object({
      freeShippingThresholdPaise: paise.default(99900),
      flatRatePaise: paise.default(7900),
      expressSurchargePaise: paise.default(9900),
      originPincode: z.string().default("400001"),
      originStateCode: z.string().length(2).default("MH"),
    })
    .prefault({}),
  cod: z
    .object({
      enabled: z.boolean().default(true),
      capPaise: paise.default(250000),
      feePaise: paise.default(4900),
    })
    .prefault({}),
  giftWrap: z
    .object({
      enabled: z.boolean().default(true),
      feePaise: paise.default(4900),
    })
    .prefault({}),
  tax: z
    .object({
      /** Place of supply for CGST/SGST vs IGST. */
      originStateCode: z.string().length(2).default("MH"),
    })
    .prefault({}),
  returns: z.object({ windowDays: z.number().int().positive().default(7) }).prefault({}),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_STORE_SETTINGS: StoreSettings = storeSettingsSchema.parse({});

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const KEYS = ["shipping", "cod", "giftWrap", "tax", "returns"] as const;

export async function loadStoreSettings(db: Db): Promise<StoreSettings> {
  const rows = await db.select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings).where(inArray(schema.settings.key, [...KEYS]));
  const raw: Record<string, unknown> = {};
  for (const row of rows) raw[row.key] = row.value;
  const parsed = storeSettingsSchema.safeParse(raw);
  // Invalid rows fall back to defaults rather than breaking checkout; the
  // admin surfaces the validation error separately.
  return parsed.success ? parsed.data : DEFAULT_STORE_SETTINGS;
}
