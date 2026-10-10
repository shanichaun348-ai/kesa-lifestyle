import "server-only";

import { adminNewOrderEmail, customerConfirmationEmail } from "@/modules/email/order-confirmation";
import { sendEmail, type SendEmailResult } from "@/modules/email/resend";
import type { Order } from "@/modules/orders/types";
import { sendWhatsAppTemplate, type SendWhatsAppResult } from "@/modules/whatsapp/cloud-api";
import { DEFAULT_ORDER_TEMPLATE, DEFAULT_TEMPLATE_LANGUAGE, orderConfirmedParams, toWhatsAppNumber } from "@/modules/whatsapp/order-confirmation";

export type OrderPaidNotifyResult = {
  /** Customer confirmation email. */
  customer: SendEmailResult;
  /** Internal new-order alert; null when not requested or ORDER_NOTIFY_EMAIL is unset. */
  admin: SendEmailResult | null;
  /** Customer WhatsApp confirmation; null when not requested. */
  whatsapp: SendWhatsAppResult | null;
};

export type NotifyOptions = {
  /** Send to the customer only (no internal alert). Implied by `only`. */
  customerOnly?: boolean;
  /** Restrict to one customer channel, e.g. when an admin re-sends it. */
  only?: "email" | "whatsapp";
};

const NOT_SENT: SendEmailResult = { ok: false, error: "Not requested.", skipped: true };

/** The WhatsApp order confirmation for one order; skipped when the number is unusable. */
export async function sendOrderConfirmedWhatsApp(order: Order): Promise<SendWhatsAppResult> {
  const to = toWhatsAppNumber(order.customer.phone);
  if (!to) return { ok: false, error: `"${order.customer.phone}" is not a mobile number WhatsApp can deliver to.`, skipped: true };
  return sendWhatsAppTemplate({
    to,
    template: process.env.WHATSAPP_ORDER_TEMPLATE || DEFAULT_ORDER_TEMPLATE,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE,
    bodyParams: orderConfirmedParams(order),
  });
}

/**
 * Tell the customer their order is confirmed, by email and WhatsApp, and
 * (unless customer-only) alert the shop inbox. Callers invoke this exactly
 * once, right after the order transitions to PAID. Each channel is
 * independent and unconfigured channels are skipped. Never throws.
 */
export async function notifyOrderPaid(order: Order, opts: NotifyOptions = {}): Promise<OrderPaidNotifyResult> {
  const wantEmail = opts.only !== "whatsapp";
  const wantWhatsApp = opts.only !== "email";
  const wantAdmin = !opts.customerOnly && !opts.only && !!process.env.ORDER_NOTIFY_EMAIL;

  const [customer, admin, whatsapp] = await Promise.all([
    wantEmail ? sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...customerConfirmationEmail(order) }) : Promise.resolve(NOT_SENT),
    wantAdmin ? sendEmail({ to: process.env.ORDER_NOTIFY_EMAIL!, replyTo: order.customer.email, ...adminNewOrderEmail(order) }) : Promise.resolve(null),
    wantWhatsApp ? sendOrderConfirmedWhatsApp(order) : Promise.resolve(null),
  ]);

  return { customer, admin, whatsapp };
}
