import { z } from "zod";

const shortText = (max: number) => z.string().trim().max(max);

export const cartLineSchema = z.object({
  sku: shortText(64).min(1),
  productSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  name: shortText(200).min(1),
  optionLabel: shortText(80).optional(),
  unitPricePaise: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(10),
  image: z.object({
    src: z.string().trim().max(500).regex(/^(https?:\/\/|\/)/),
    alt: shortText(200),
    unoptimized: z.boolean().optional(),
  }),
});

export const cartSyncSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/).optional(),
  consent: z.boolean().optional(),
});

export type CartSyncPayload = z.infer<typeof cartSyncSchema>;

export const resumeTokenSchema = z.string().regex(/^[a-f0-9]{32}$/);
