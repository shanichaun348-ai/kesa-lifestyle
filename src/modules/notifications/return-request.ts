import "server-only";

import { sendEmail, type SendEmailResult } from "@/modules/email/resend";
import { returnEventEmail, returnStoreAlertEmail, type ReturnEmailEvent } from "@/modules/email/return-request";
import type { Order } from "@/modules/orders/types";
import type { ReturnRequest } from "@/modules/returns/types";

/**
 * Email the customer about a return/exchange stage; on submission also alert
 * the store inbox (ORDER_NOTIFY_EMAIL). Never throws; unconfigured email is
 * skipped by sendEmail.
 */
export async function notifyReturnEvent(event: ReturnEmailEvent, request: ReturnRequest, order: Order): Promise<{ customer: SendEmailResult; store: SendEmailResult | null }> {
  const storeTo = event === "submitted" ? process.env.ORDER_NOTIFY_EMAIL : undefined;
  const [customer, store] = await Promise.all([
    sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...returnEventEmail(event, request, order) }),
    storeTo ? sendEmail({ to: storeTo, replyTo: order.customer.email, ...returnStoreAlertEmail(request, order) }) : Promise.resolve(null),
  ]);
  return { customer, store };
}
