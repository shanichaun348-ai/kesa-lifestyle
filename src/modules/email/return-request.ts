import { formatPaise } from "@/lib/money";
import { site } from "@/lib/site";
import type { Order } from "@/modules/orders/types";
import { kindLabel, RETURN_REASONS, type ReturnRequest } from "@/modules/returns/types";

import { orderReference } from "./order-confirmation";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type ReturnEmailEvent = "submitted" | "approved" | "rejected" | "received" | "refunded" | "exchanged";

type Mail = { subject: string; html: string; text: string };

function layout(ref: string, heading: string, paragraphs: string[], extraHtml = ""): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;"><div style="font-size:22px;letter-spacing:0.04em;font-weight:600;">${esc(site.name)}</div></div>
    <div style="background:#fff;border:1px solid #e8e4dd;border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">Order ${esc(ref)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${esc(heading)}</h1>
      ${paragraphs.map((p) => `<p style="margin:0 0 14px;color:#555;line-height:1.5;">${esc(p)}</p>`).join("")}
      ${extraHtml}
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#999;line-height:1.6;">
      Questions? Reply to this email or write to <a href="mailto:hello@kesalifestyle.com" style="color:#999;">hello@kesalifestyle.com</a>.
    </p>
  </div>
</body></html>`;
}

function itemsHtml(req: ReturnRequest): string {
  return `<ul style="margin:0 0 14px;padding-left:18px;color:#555;font-size:14px;">${req.items
    .map((i) => `<li>${esc(i.productName)} × ${i.quantity} — ${esc(RETURN_REASONS[i.reason])}</li>`)
    .join("")}</ul>`;
}

function itemsText(req: ReturnRequest): string[] {
  return req.items.map((i) => `  • ${i.productName} × ${i.quantity} — ${RETURN_REASONS[i.reason]}`);
}

/** Customer-facing email for each stage of a return or exchange. */
export function returnEventEmail(event: ReturnEmailEvent, req: ReturnRequest, order: Order): Mail {
  const ref = orderReference(order);
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? "there";
  const kind = kindLabel(req.kind).toLowerCase();
  const note = req.adminNote?.trim() ?? "";
  const base = site.url.replace(/\/$/, "");
  const where = `${base}/track-order/`;

  let heading: string;
  let paragraphs: string[];
  let subject: string;

  switch (event) {
    case "submitted":
      subject = `We've received your ${kind} request — order ${ref}`;
      heading = `Thanks, ${firstName} — your ${kind} request is in`;
      paragraphs = [
        `We've received your ${kind} request and our team will review it within 2 business days.`,
        "Once approved we'll email you pickup or return instructions. Please keep the pieces unworn and in their original packaging until then.",
        `You can follow the request at ${where} with your order number.`,
      ];
      break;
    case "approved":
      subject = `Your ${kind} is approved — order ${ref}`;
      heading = `Your ${kind} is approved, ${firstName}`;
      paragraphs = [note || "Please pack the pieces in their original packaging. We'll arrange collection and keep you posted.", "We'll let you know as soon as the parcel reaches us."];
      break;
    case "rejected":
      subject = `About your ${kind} request — order ${ref}`;
      heading = `We couldn't approve this ${kind}`;
      paragraphs = [note || "The request doesn't fall within our returns policy.", "If you think we've got this wrong, just reply to this email and a person will take a look."];
      break;
    case "received":
      subject = `We've received your parcel — order ${ref}`;
      heading = `Your parcel has reached us, ${firstName}`;
      paragraphs = [
        req.kind === "exchange" ? "We're checking the pieces and will dispatch your exchange shortly." : "We're checking the pieces and will process your refund within 5–7 business days.",
      ];
      break;
    case "refunded":
      subject = `Refund of ${formatPaise(req.refundPaise ?? 0)} issued — order ${ref}`;
      heading = `Your refund is on its way`;
      paragraphs = [
        `We've refunded ${formatPaise(req.refundPaise ?? 0)} to ${order.paymentMethod === "cod" ? "the bank account you shared" : "your original payment method"}. It usually appears within 5–7 business days depending on your bank.`,
        ...(note ? [note] : []),
      ];
      break;
    case "exchanged":
      subject = `Your exchange has been dispatched — order ${ref}`;
      heading = `Your exchange is on its way, ${firstName}`;
      paragraphs = [note || "Your replacement has been dispatched and should reach you within 3–7 days.", `Track it at ${where} with your order number.`];
      break;
  }

  const html = layout(ref, heading, paragraphs, itemsHtml(req));
  const text = [`${site.name} — Order ${ref}`, ``, heading, ``, ...paragraphs, ``, `Items:`, ...itemsText(req), ``, `Questions? Reply to this email or write to hello@kesalifestyle.com.`].join("\n");
  return { subject, html, text };
}

/** Short internal alert when a customer raises a request. */
export function returnStoreAlertEmail(req: ReturnRequest, order: Order): Mail {
  const ref = orderReference(order);
  const adminUrl = `${site.url.replace(/\/$/, "")}/admin/returns/${req.id}/`;
  const subject = `${kindLabel(req.kind)} request — order ${ref} — ${order.customer.name}`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.5;">
    <h2 style="margin:0 0 8px;">${esc(kindLabel(req.kind))} request on order ${esc(ref)}</h2>
    <p style="margin:0 0 12px;"><a href="${esc(adminUrl)}">Open in admin →</a></p>
    <p style="margin:0 0 4px;"><strong>Customer:</strong> ${esc(order.customer.name)} · ${esc(order.customer.email)} · ${esc(order.customer.phone)}</p>
    ${itemsHtml(req)}
    ${req.details ? `<p style="margin:0 0 12px;white-space:pre-line;">${esc(req.details)}</p>` : ""}
    ${req.photos.length ? `<p style="margin:0;">${req.photos.map((p, i) => `<a href="${esc(p.src)}">Photo ${i + 1}</a>`).join(" · ")}</p>` : ""}
  </body></html>`;
  const text = [`${kindLabel(req.kind)} request on order ${ref}`, adminUrl, ``, `Customer: ${order.customer.name} · ${order.customer.email} · ${order.customer.phone}`, ``, ...itemsText(req), ``, req.details ?? "", ...req.photos.map((p, i) => `Photo ${i + 1}: ${p.src}`)].join("\n");
  return { subject, html, text };
}
