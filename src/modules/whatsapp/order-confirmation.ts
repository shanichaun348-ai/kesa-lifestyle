/**
 * Order-confirmed WhatsApp message: pure helpers that turn an order into the
 * template parameters, so they can be unit-tested without the network.
 *
 * The template must be approved in Meta Business Manager under the name set
 * in WHATSAPP_ORDER_TEMPLATE (category: Utility). Suggested body:
 *
 *   Hi {{1}}, thank you for shopping with Kesa Lifestyle. Your order {{2}}
 *   is confirmed and we have received your payment of {{3}} for {{4}}.
 *   We will message you again when it ships.
 *
 * Parameters, in order: first name, order reference, total paid, items.
 *
 * Cash-on-delivery orders use a second template (WHATSAPP_COD_ORDER_TEMPLATE)
 * with the same four parameters, worded for payment at the door:
 *
 *   Hi {{1}}, thank you for shopping with Kesa Lifestyle. Your order {{2}}
 *   is confirmed. Please keep {{3}} ready to pay in cash when {{4}} arrives.
 *   We will message you again when it ships.
 */
import { formatPaise } from "@/lib/money";
import { orderReference } from "@/modules/email/order-confirmation";
import type { Order } from "@/modules/orders/types";

export const DEFAULT_ORDER_TEMPLATE = "order_confirmed";
export const DEFAULT_COD_ORDER_TEMPLATE = "order_confirmed_cod";
export const DEFAULT_TEMPLATE_LANGUAGE = "en";

/** Longest a single template parameter is allowed to be; keeps the message readable. */
const MAX_ITEMS_PARAM = 200;

/**
 * Normalises the mobile number captured at checkout to the international
 * form the WhatsApp API expects (country code, digits only, no "+").
 * Returns null when the number cannot be an Indian mobile.
 */
export function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("091")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return /^91[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Template parameters may not contain line breaks or runs of spaces. */
function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function itemsSummary(order: Order): string {
  const parts = order.items.map((i) => `${i.productName}${i.variantOptionValue ? ` (${i.variantOptionValue})` : ""} × ${i.quantity}`);
  let summary = parts.join(", ");
  if (summary.length > MAX_ITEMS_PARAM) {
    const shown: string[] = [];
    for (const part of parts) {
      const next = [...shown, part].join(", ");
      if (next.length > MAX_ITEMS_PARAM - 20) break;
      shown.push(part);
    }
    const rest = parts.length - shown.length;
    summary = shown.length > 0 ? `${shown.join(", ")} and ${rest} more` : `${parts.length} items`;
  }
  return clean(summary);
}

/** Values for {{1}}…{{4}} of the order-confirmed template. */
export function orderConfirmedParams(order: Order): [firstName: string, reference: string, totalPaid: string, items: string] {
  const firstName = clean(order.customer.name).split(" ")[0] || "there";
  return [firstName, orderReference(order), formatPaise(order.totalPaise), itemsSummary(order)];
}
