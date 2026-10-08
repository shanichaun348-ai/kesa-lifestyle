import { z } from "zod";

import { INDIAN_STATES } from "@/lib/india-states";
import { PINCODE_RE } from "@/modules/shipping/types";

const stateCodes = INDIAN_STATES.map((s) => s.code) as [string, ...string[]];
const phone10 = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number");

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().max(60).optional(),
  phone: phone10.optional().or(z.literal("")),
});

export const addressSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: phone10,
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  stateCode: z.enum(stateCodes),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit pincode"),
  isDefaultShipping: z.boolean().optional(),
});
