import { z } from "zod";

/** Password policy (docs/11 §2): 12+ characters, no leading/trailing spaces, under 128. */
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.")
  .refine((v) => v.trim() === v, "Remove spaces at the start or end.")
  .refine((v) => !/^(.)\1+$/.test(v), "Choose a less repetitive password.");

export const emailSchema = z.email("Enter a valid email address.").max(120).transform((v) => v.trim().toLowerCase());

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().max(60).optional(),
  acceptsMarketing: z.boolean().default(false),
  next: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
