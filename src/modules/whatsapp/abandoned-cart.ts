/**
 * Bag reminder WhatsApp message: pure helper turning a saved bag into
 * template parameters. The template must be approved in Meta Business
 * Manager (category: Marketing) under WHATSAPP_CART_TEMPLATE.
 *
 * 3 parameters: items summary, subtotal, resume link:
 *   You left {{1}} in your Kesa Lifestyle bag ({{2}}). It's saved for a few
 *   days — finish your order here: {{3}}. Reply STOP to opt out.
 */
import type { AbandonedCart } from "@/modules/abandoned-cart/types";
import { cartResumeUrl } from "@/modules/email/abandoned-cart";
import { formatPaise } from "@/lib/money";

export const DEFAULT_CART_TEMPLATE = "cart_reminder";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function cartReminderParams(cart: AbandonedCart): [items: string, subtotal: string, resumeUrl: string] {
  const first = cart.items[0];
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const items = !first ? "your pieces" : count === 1 ? first.name : `${first.name} and ${count - 1} more`;
  return [clean(items).slice(0, 80), formatPaise(cart.subtotalPaise), cartResumeUrl(cart.token)];
}
