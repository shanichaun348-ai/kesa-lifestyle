import "server-only";

import type { AbandonedCart } from "@/modules/abandoned-cart/types";
import { abandonedCartEmail } from "@/modules/email/abandoned-cart";
import { sendEmail, type SendEmailResult } from "@/modules/email/resend";
import { cartReminderParams, DEFAULT_CART_TEMPLATE } from "@/modules/whatsapp/abandoned-cart";
import { isWhatsAppConfigured, sendWhatsAppTemplate, type SendWhatsAppResult } from "@/modules/whatsapp/cloud-api";
import { DEFAULT_TEMPLATE_LANGUAGE, toWhatsAppNumber } from "@/modules/whatsapp/order-confirmation";

export type CartReminderResult = { email: SendEmailResult; whatsapp: SendWhatsAppResult | null };

/**
 * Send one bag reminder. Email always (the consent covers it); WhatsApp only
 * when a phone was captured, the channel is configured and a template name
 * is set — marketing templates are opt-in on Meta's side too. Never throws.
 */
export async function sendCartReminder(cart: AbandonedCart, second: boolean): Promise<CartReminderResult> {
  if (!cart.email) return { email: { ok: false, error: "No email on the bag.", skipped: true }, whatsapp: null };
  const template = process.env.WHATSAPP_CART_TEMPLATE;
  const to = cart.phone ? toWhatsAppNumber(cart.phone) : null;
  const [email, whatsapp] = await Promise.all([
    sendEmail({ to: cart.email, replyTo: "hello@kesalifestyle.com", ...abandonedCartEmail(cart, second) }),
    to && template && isWhatsAppConfigured()
      ? sendWhatsAppTemplate({ to, template: template || DEFAULT_CART_TEMPLATE, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE, bodyParams: cartReminderParams(cart) })
      : Promise.resolve(null),
  ]);
  return { email, whatsapp };
}
