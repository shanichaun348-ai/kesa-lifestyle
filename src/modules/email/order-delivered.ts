import { site } from "@/lib/site";
import { formatPaise } from "@/lib/money";
import { isCod, type Order } from "@/modules/orders/types";

import { orderReference } from "./order-confirmation";
import type { ReviewRequestItem } from "./review-request";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * "Delivered — how did we do?" One email per delivery: confirms the parcel
 * arrived (and, for COD, that the cash was received) and asks for a review of
 * each piece, so the customer is not messaged twice for the same event.
 */
export function orderDeliveredEmail(order: Order, items: ReviewRequestItem[]): { subject: string; html: string; text: string } {
  const ref = orderReference(order);
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? "there";
  const base = site.url.replace(/\/$/, "");
  const link = (slug: string) => `${base}/products/${slug}/?review=1#reviews`;
  const codLine = isCod(order) ? `Thank you for the ${formatPaise(order.totalPaise)} paid on delivery — your order is complete.` : "";

  const rowsHtml = items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;width:64px;">
          ${i.image ? `<img src="${esc(i.image)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #eee;" />` : ""}
        </td>
        <td style="padding:12px 12px;border-bottom:1px solid #eee;color:#1a1a1a;">${esc(i.name)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
          <a href="${esc(link(i.slug))}" style="display:inline-block;background:#1a1a1a;color:#fbfaf7;text-decoration:none;padding:9px 14px;border-radius:6px;font-size:13px;">Write a review</a>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;"><div style="font-size:22px;letter-spacing:0.04em;font-weight:600;">${esc(site.name)}</div></div>
    <div style="background:#fff;border:1px solid #e8e4dd;border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">Order ${esc(ref)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Delivered — enjoy, ${esc(firstName)}!</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">Your parcel has arrived. ${esc(codLine)} A quick review helps other shoppers choose — and a photo of you wearing it is even better.</p>
      ${items.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">${rowsHtml}</table>` : ""}
      <p style="margin:20px 0 0;font-size:13px;color:#777;line-height:1.5;">Something not right with the piece? Reply to this email within 7 days and we'll sort out an exchange or return.</p>
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#999;"><a href="${esc(site.url)}" style="color:#999;">${esc(site.url.replace(/^https?:\/\//, ""))}</a></p>
  </div>
</body></html>`;

  const text = [
    `${site.name} — Order ${ref}`,
    ``,
    `Delivered — enjoy, ${firstName}! Your parcel has arrived. ${codLine}`.trim(),
    ``,
    ...(items.length > 0 ? [`Tell us how it looks:`, ...items.map((i) => `  • ${i.name}: ${link(i.slug)}`), ``] : []),
    `Something not right? Reply to this email within 7 days and we'll sort out an exchange or return.`,
  ].join("\n");

  return { subject: `Order ${ref} delivered — how did we do?`, html, text };
}
