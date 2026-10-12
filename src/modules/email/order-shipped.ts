import { site } from "@/lib/site";
import type { Order } from "@/modules/orders/types";
import { courierName } from "@/modules/shipping/couriers";

import { orderReference } from "./order-confirmation";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const ETA_TEXT = "Delivery usually takes 3–7 days depending on your location.";

/** "Your order is on its way" with the courier, consignment number and link. */
export function orderShippedEmail(order: Order): { subject: string; html: string; text: string } {
  const ref = orderReference(order);
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? "there";
  const courier = courierName(order.courier) ?? "our courier partner";
  const number = order.trackingNumber ?? "";
  const url = order.trackingUrl ?? null;
  const base = site.url.replace(/\/$/, "");
  const trackHere = `${base}/track-order/`;

  const itemsHtml = order.items
    .map((i) => `<li style="margin:0 0 4px;">${esc(i.productName)}${i.variantOptionValue ? ` (${esc(i.variantOptionValue)})` : ""} × ${i.quantity}</li>`)
    .join("");

  const trackingHtml = number
    ? `<p style="margin:0 0 6px;"><strong>Courier:</strong> ${esc(courier)}</p>
       <p style="margin:0 0 14px;"><strong>Tracking number:</strong> <span style="font-family:ui-monospace,Menlo,monospace;">${esc(number)}</span></p>
       ${url ? `<a href="${esc(url)}" style="display:inline-block;background:#1a1a1a;color:#fbfaf7;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:14px;">Track your parcel</a>` : `<a href="${esc(trackHere)}" style="display:inline-block;background:#1a1a1a;color:#fbfaf7;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:14px;">Track on our site</a>`}`
    : `<p style="margin:0 0 14px;">We'll share the tracking number as soon as the courier scans it in.</p>`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;"><div style="font-size:22px;letter-spacing:0.04em;font-weight:600;">${esc(site.name)}</div></div>
    <div style="background:#fff;border:1px solid #e8e4dd;border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">Order ${esc(ref)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Your order is on its way, ${esc(firstName)}</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">${esc(ETA_TEXT)}</p>
      <div style="font-size:14px;line-height:1.5;">${trackingHtml}</div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;font-size:14px;">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">In this parcel</p>
        <ul style="margin:0;padding-left:18px;color:#555;">${itemsHtml}</ul>
      </div>
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#999;line-height:1.6;">
      Questions? Reply to this email or write to <a href="mailto:hello@kesalifestyle.com" style="color:#999;">hello@kesalifestyle.com</a>.<br/>
      <a href="${esc(site.url)}" style="color:#999;">${esc(site.url.replace(/^https?:\/\//, ""))}</a>
    </p>
  </div>
</body></html>`;

  const text = [
    `${site.name} — Order ${ref}`,
    ``,
    `Your order is on its way, ${firstName}. ${ETA_TEXT}`,
    ``,
    ...(number ? [`Courier: ${courier}`, `Tracking number: ${number}`, ...(url ? [`Track: ${url}`] : [`Track on our site: ${trackHere}`])] : [`We'll share the tracking number as soon as the courier scans it in.`]),
    ``,
    `In this parcel:`,
    ...order.items.map((i) => `  • ${i.productName}${i.variantOptionValue ? ` (${i.variantOptionValue})` : ""} × ${i.quantity}`),
    ``,
    `Questions? Reply to this email or write to hello@kesalifestyle.com.`,
  ].join("\n");

  return { subject: `Order ${ref} is on its way — ${site.name}`, html, text };
}
