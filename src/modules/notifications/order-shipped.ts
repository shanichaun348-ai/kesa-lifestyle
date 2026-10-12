import "server-only";

import { orderShippedEmail } from "@/modules/email/order-shipped";
import { sendEmail, type SendEmailResult } from "@/modules/email/resend";
import type { Order } from "@/modules/orders/types";
import { sendWhatsAppTemplate, type SendWhatsAppResult } from "@/modules/whatsapp/cloud-api";
import { DEFAULT_TEMPLATE_LANGUAGE, toWhatsAppNumber } from "@/modules/whatsapp/order-confirmation";
import { DEFAULT_SHIPPED_TEMPLATE, orderShippedParams } from "@/modules/whatsapp/order-status";

export type StatusNotifyResult = { email: SendEmailResult; whatsapp: SendWhatsAppResult };

/**
 * Tell the customer the parcel is on its way, by email and WhatsApp. Called
 * once when the order is marked shipped. Channels are independent and
 * unconfigured ones are skipped; never throws.
 */
export async function notifyOrderShipped(order: Order): Promise<StatusNotifyResult> {
  const to = toWhatsAppNumber(order.customer.phone);
  const [email, whatsapp] = await Promise.all([
    sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...orderShippedEmail(order) }),
    to
      ? sendWhatsAppTemplate({
          to,
          template: process.env.WHATSAPP_SHIPPED_TEMPLATE || DEFAULT_SHIPPED_TEMPLATE,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE,
          bodyParams: orderShippedParams(order),
        })
      : Promise.resolve<SendWhatsAppResult>({ ok: false, error: `"${order.customer.phone}" is not a mobile number WhatsApp can deliver to.`, skipped: true }),
  ]);
  return { email, whatsapp };
}
