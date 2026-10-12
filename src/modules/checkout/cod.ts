/**
 * Cash on delivery rules. Pure and dependency-free so the checkout form can
 * preview the fee in the browser while the order route re-derives it from
 * server-side pricing — the client preview is never trusted.
 */
import { formatPaise } from "@/lib/money";

export type PaymentMethod = "razorpay" | "cod";

/** Handling fee added to the order total when paying cash on delivery. */
export const COD_FEE_PAISE = 4900; // ₹49
/** Merchandise value (after discount) from which the COD fee is waived. */
export const COD_FEE_WAIVER_PAISE = 199900; // ₹1,999
/** Largest merchandise value (after discount) accepted for COD. */
export const COD_MAX_TOTAL_PAISE = 500000; // ₹5,000

export type CodAvailability =
  | { allowed: true; feePaise: number }
  | { allowed: false; feePaise: 0; reason: string };

/** Whether COD can be offered for a given merchandise value, and what it costs. */
export function codAvailability(subtotalAfterDiscountPaise: number): CodAvailability {
  if (!Number.isInteger(subtotalAfterDiscountPaise) || subtotalAfterDiscountPaise <= 0) {
    return { allowed: false, feePaise: 0, reason: "Add something to your bag to pay on delivery." };
  }
  if (subtotalAfterDiscountPaise > COD_MAX_TOTAL_PAISE) {
    return { allowed: false, feePaise: 0, reason: `Cash on delivery is available on orders up to ${formatPaise(COD_MAX_TOTAL_PAISE)}. Please pay online for this order.` };
  }
  return { allowed: true, feePaise: subtotalAfterDiscountPaise >= COD_FEE_WAIVER_PAISE ? 0 : COD_FEE_PAISE };
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "razorpay" || value === "cod";
}
