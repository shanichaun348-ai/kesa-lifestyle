import { formatPaise } from "@/lib/money";
import { site } from "@/lib/site";
import type { AbandonedCart } from "@/modules/abandoned-cart/types";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const base = () => site.url.replace(/\/$/, "");

export function cartResumeUrl(token: string): string {
  return `${base()}/cart/?resume=${token}`;
}

export function cartUnsubscribeUrl(token: string): string {
  return `${base()}/cart/unsubscribe/?token=${token}`;
}

function absolute(src: string): string {
  return /^https?:\/\//.test(src) ? src : `${base()}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Reminder that a bag was left behind; `second` softens the subject for the follow-up. */
export function abandonedCartEmail(cart: AbandonedCart, second: boolean): { subject: string; html: string; text: string } {
  const resume = cartResumeUrl(cart.token);
  const unsubscribe = cartUnsubscribeUrl(cart.token);
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const first = cart.items[0];

  const rows = cart.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px 8px 0;width:64px;"><img src="${esc(absolute(i.image.src))}" alt="" width="64" height="80" style="display:block;width:64px;height:80px;object-fit:cover;border-radius:4px;background:#f3f0ea;"></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:500;color:#1a1a1a;">${esc(i.name)}</div>
          <div style="font-size:13px;color:#777;">${i.optionLabel ? esc(i.optionLabel) + " · " : ""}Qty ${i.quantity}</div>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:#1a1a1a;">${formatPaise(i.unitPricePaise * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;"><div style="font-size:22px;letter-spacing:0.04em;font-weight:600;">${esc(site.name)}</div></div>
    <div style="background:#fff;border:1px solid #e8e4dd;border-radius:8px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${second ? "Still thinking it over?" : "You left something in your bag"}</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">${
        second
          ? "Your bag is saved for a few more days. Pick up where you left off whenever you're ready — no rush."
          : `We've kept ${count === 1 ? "it" : `your ${count} pieces`} safe. Come back and finish your order whenever it suits you.`
      }</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr><td style="padding:10px 0 2px;font-weight:600;border-top:1px solid #eee;">Subtotal</td><td style="padding:10px 0 2px;text-align:right;font-weight:600;border-top:1px solid #eee;">${formatPaise(cart.subtotalPaise)}</td></tr>
        <tr><td colspan="2" style="font-size:12px;color:#999;">Shipping and any discount are confirmed at checkout.</td></tr>
      </table>
      <p style="margin:24px 0 0;"><a href="${esc(resume)}" style="display:inline-block;background:#1a1a1a;color:#fbfaf7;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;">Return to your bag</a></p>
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#999;line-height:1.6;">
      You asked us to remind you about this bag. <a href="${esc(unsubscribe)}" style="color:#999;">Stop these reminders</a>.<br/>
      <a href="${esc(base())}" style="color:#999;">${esc(base().replace(/^https?:\/\//, ""))}</a>
    </p>
  </div>
</body></html>`;

  const text = [
    second ? "Still thinking it over?" : "You left something in your bag",
    "",
    ...cart.items.map((i) => `  • ${i.name}${i.optionLabel ? ` (${i.optionLabel})` : ""} × ${i.quantity} — ${formatPaise(i.unitPricePaise * i.quantity)}`),
    "",
    `Subtotal: ${formatPaise(cart.subtotalPaise)}`,
    "",
    `Return to your bag: ${resume}`,
    "",
    `You asked us to remind you about this bag. Stop these reminders: ${unsubscribe}`,
  ].join("\n");

  const subject = second ? `Still thinking it over? Your ${site.name} bag is saved` : first ? `You left "${first.name}" in your bag` : `You left something in your ${site.name} bag`;
  return { subject, html, text };
}
