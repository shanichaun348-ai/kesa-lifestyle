import "server-only";

import type { Order } from "@/modules/orders/types";

import { adminNewOrderEmail, customerConfirmationEmail } from "./order-confirmation";
import { sendEmail, type SendEmailResult } from "./resend";

export type OrderPaidNotifyResult = { customer: SendEmailResult; admin: SendEmailResult | null };

/**
 * Send the customer confirmation and (if ORDER_NOTIFY_EMAIL is set) an
 * internal new-order alert. Callers invoke this exactly once, right after the
 * order transitions to PAID. Never throws.
 */
export async function notifyOrderPaid(order: Order, opts: { customerOnly?: boolean } = {}): Promise<OrderPaidNotifyResult> {
  const customerMail = customerConfirmationEmail(order);
  const notifyTo = process.env.ORDER_NOTIFY_EMAIL;

  const [customer, admin] = await Promise.all([
    sendEmail({ to: order.customer.email, replyTo: "hello@kesalifestyle.com", ...customerMail }),
    !opts.customerOnly && notifyTo ? sendEmail({ to: notifyTo, replyTo: order.customer.email, ...adminNewOrderEmail(order) }) : Promise.resolve(null),
  ]);

  return { customer, admin };
}
