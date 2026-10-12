import { site } from "@/lib/site";
import type { Order } from "@/modules/orders/types";

import { orderReference } from "./order-confirmation";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type ReviewRequestItem = { name: string; slug: string; image?: string | undefined };

/** "How did we do?" — sent once an order is delivered, one row per product. */
export function reviewRequestEmail(order: Order, items: ReviewRequestItem[]): { subject: string; html: string; text: string } {
  const ref = orderReference(order);
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? "there";
  const base = site.url.replace(/\/$/, "");
  const link = (slug: string) => `${base}/products/${slug}/?review=1#reviews`;

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
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">How did we do, ${esc(firstName)}?</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">Your order has been delivered. A quick review helps other shoppers choose — and a photo of you wearing it is even better.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rowsHtml}</table>
      <p style="margin:20px 0 0;font-size:13px;color:#777;line-height:1.5;">Reviews from verified buyers are published straight away. Not happy with something? Reply to this email and we'll sort it out first.</p>
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#999;"><a href="${esc(site.url)}" style="color:#999;">${esc(site.url.replace(/^https?:\/\//, ""))}</a></p>
  </div>
</body></html>`;

  const text = [
    `${site.name} — Order ${ref}`,
    ``,
    `How did we do, ${firstName}? Your order has been delivered. A quick review helps other shoppers choose.`,
    ``,
    ...items.map((i) => `  • ${i.name}: ${link(i.slug)}`),
    ``,
    `Not happy with something? Reply to this email and we'll sort it out first.`,
  ].join("\n");

  return { subject: `How did we do? Review your ${items.length === 1 ? "piece" : "pieces"} from ${site.name}`, html, text };
}
