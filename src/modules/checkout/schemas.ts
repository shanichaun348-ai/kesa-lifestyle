import { z } from "zod";

import { INDIAN_STATES } from "@/lib/india-states";
import { PINCODE_RE } from "@/modules/shipping/types";

const stateCodes = INDIAN_STATES.map((s) => s.code) as [string, ...string[]];

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  stateCode: z.enum(stateCodes),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit pincode"),
});

export const placeOrderSchema = z.object({
  idempotencyKey: z.uuid(),
  contact: z.object({
    email: z.email().max(120),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  }),
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["razorpay", "cod"]),
  giftWrap: z.boolean().default(false),
  giftMessage: z.string().trim().max(200).optional(),
  pincodeCodAvailable: z.boolean().nullable().optional(),
  gaClientId: z.string().max(64).optional(),
});

export type PlaceOrderFormInput = z.input<typeof placeOrderSchema>;

export const confirmPaymentSchema = z.object({
  orderNumber: z.string().regex(/^KL-\d+$/),
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().regex(/^[0-9a-f]{64}$/),
});
