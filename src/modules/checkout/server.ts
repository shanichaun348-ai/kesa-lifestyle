import "server-only";

import { getDb } from "@/db/client";
import { getServerEnv } from "@/lib/env";
import { getPaymentGateway } from "@/modules/payments/server";

import { createCheckoutService, type CheckoutService } from "./service";

let cached: CheckoutService | null = null;

/** Checkout service wired to the real database and gateway, or null without a database. */
export function getCheckoutService(): CheckoutService | null {
  if (!getServerEnv().DATABASE_URL) return null;
  cached ??= createCheckoutService({ db: getDb(), gateway: getPaymentGateway() });
  return cached;
}
