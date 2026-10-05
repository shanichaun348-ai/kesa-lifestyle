import "server-only";

import { getServerEnv, publicEnv } from "@/lib/env";

import type { PaymentGateway } from "./gateway";
import { RazorpayGateway } from "./razorpay";

let cached: PaymentGateway | null = null;

/** Returns the configured gateway or null when Razorpay keys are absent. */
export function getPaymentGateway(): PaymentGateway | null {
  if (cached) return cached;
  const env = getServerEnv();
  const keyId = publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) return null;
  cached = new RazorpayGateway({ keyId, keySecret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET });
  return cached;
}
