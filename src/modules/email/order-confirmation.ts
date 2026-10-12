import { formatPaise } from "@/lib/money";
import { site } from "@/lib/site";
import { isCod, type Order } from "@/modules/orders/types";

export function orderReference(order: Pick<Order, "id" | "orderNumber">): string {
  return order.orderNumber ? `KL-${order.orderNumber}` : order.id;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function addressLines(order: Order): string[] {
  const a = order.shippingAddress;
  return [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, a.phone].filter((l): l is string => !!l && l.trim() !== "");
}

export function customerConfirmationEmail(order: Order): { subject: string; html: string; text: string } {
  const ref = orderReference(order);
  const cod = isCod(order);
  const codFee = order.codFeePaise ?? 0;
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? "there";
  const lines = addressLines(order);

  const intro = cod
    ? `Your order is confirmed and we're getting your jewellery ready. Please keep ${formatPaise(order.totalPaise)} ready to pay in cash when it arrives. We'll email you again when it ships.`
    : "We've received your payment and are getting your jewellery ready. We'll email you again when it ships.";
  const totalLabel = cod ? "To pay on delivery" : "Total paid";

  const itemRowsHtml = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:500;color:#1a1a1a;">${esc(i.productName)}</div>
            <div style="font-size:13px;color:#777;">${i.variantOptionValue ? esc(i.variantOptionValue) + " · " : ""}Qty ${i.quantity}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:#1a1a1a;">${formatPaise(i.lineTotalPaise)}</td>
        </tr>`,
    )
    .join("");

  const totalsRows: Array<[string, string, string?]> = [
    ["Subtotal", formatPaise(order.subtotalPaise)],
    ...(order.discountPaise > 0 ? [[`Discount${order.coupon ? ` (${order.coupon.code})` : ""}`, `− ${formatPaise(order.discountPaise)}`, "#2f7d4f"] as [string, string, string]] : []),
    ["Shipping", order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)],
    ...(cod ? [["Cash on delivery fee", codFee === 0 ? "Waived" : formatPaise(codFee)] as [string, string]] : []),
  ];

  const totalsHtml = totalsRows
    .map(([label, value, color]) => `<tr><td style="padding:4px 0;color:#777;">${esc(label)}</td><td style="padding:4px 0;text-align:right;color:${color ?? "#1a1a1a"};">${value}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;letter-spacing:0.04em;font-weight:600;">${esc(site.name)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e8e4dd;border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">Order ${esc(ref)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Thank you, ${esc(firstName)} — your order is confirmed</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">${esc(intro)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemRowsHtml}</table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        ${totalsHtml}
        <tr><td style="padding:10px 0 2px;font-weight:600;border-top:1px solid #eee;">${esc(totalLabel)}</td><td style="padding:10px 0 2px;text-align:right;font-weight:600;border-top:1px solid #eee;">${formatPaise(order.totalPaise)}</td></tr>
        <tr><td colspan="2" style="font-size:12px;color:#999;">Includes ${formatPaise(order.gstPaise)} GST.${cod ? " Payment: cash on delivery." : ""}</td></tr>
      </table>

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;font-size:14px;">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999;">Delivering to</p>
        ${lines.map((l) => `<div style="color:#555;">${esc(l)}</div>`).join("")}
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
    `Thank you, ${firstName} — your order is confirmed.`,
    intro,
    ``,
    `Items:`,
    ...order.items.map((i) => `  • ${i.productName}${i.variantOptionValue ? ` (${i.variantOptionValue})` : ""} × ${i.quantity} — ${formatPaise(i.lineTotalPaise)}`),
    ``,
    `Subtotal: ${formatPaise(order.subtotalPaise)}`,
    ...(order.discountPaise > 0 ? [`Discount: − ${formatPaise(order.discountPaise)}`] : []),
    `Shipping: ${order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}`,
    ...(cod ? [`Cash on delivery fee: ${codFee === 0 ? "Waived" : formatPaise(codFee)}`] : []),
    `${totalLabel}: ${formatPaise(order.totalPaise)} (includes ${formatPaise(order.gstPaise)} GST)`,
    ``,
    `Delivering to:`,
    ...lines.map((l) => `  ${l}`),
    ``,
    `Questions? Reply to this email or write to hello@kesalifestyle.com.`,
  ].join("\n");

  const subject = cod ? `Order ${ref} confirmed — pay ${formatPaise(order.totalPaise)} on delivery — ${site.name}` : `Order ${ref} confirmed — ${site.name}`;
  return { subject, html, text };
}

export function adminNewOrderEmail(order: Order): { subject: string; html: string; text: string } {
  const ref = orderReference(order);
  const cod = isCod(order);
  const adminUrl = `${site.url.replace(/\/$/, "")}/admin/orders/${order.id}/`;
  const lines = addressLines(order);
  const itemsText = order.items.map((i) => `  • ${i.productName}${i.variantOptionValue ? ` (${i.variantOptionValue})` : ""} × ${i.quantity} — ${i.sku}`);
  const heading = cod ? `New cash-on-delivery order ${ref} — collect ${formatPaise(order.totalPaise)}` : `New paid order ${ref} — ${formatPaise(order.totalPaise)}`;
  const paymentLine = cod
    ? `Payment: cash on delivery (fee ${(order.codFeePaise ?? 0) === 0 ? "waived" : formatPaise(order.codFeePaise ?? 0)})`
    : `Razorpay payment: ${order.razorpayPaymentId ?? "—"}`;

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.5;">
    <h2 style="margin:0 0 8px;">${esc(heading)}</h2>
    <p style="margin:0 0 16px;"><a href="${esc(adminUrl)}">Open in admin →</a></p>
    <p style="margin:0 0 4px;"><strong>Customer:</strong> ${esc(order.customer.name)} · ${esc(order.customer.email)} · ${esc(order.customer.phone)}</p>
    <p style="margin:0 0 12px;"><strong>Ship to:</strong> ${lines.map(esc).join(", ")}</p>
    <p style="margin:0 0 4px;"><strong>Items:</strong></p>
    <ul style="margin:0 0 12px;padding-left:18px;">${order.items.map((i) => `<li>${esc(i.productName)}${i.variantOptionValue ? ` (${esc(i.variantOptionValue)})` : ""} × ${i.quantity} — <code>${esc(i.sku)}</code></li>`).join("")}</ul>
    <p style="margin:0;color:#777;">${esc(paymentLine)}</p>
  </body></html>`;

  const text = [
    heading,
    adminUrl,
    ``,
    `Customer: ${order.customer.name} · ${order.customer.email} · ${order.customer.phone}`,
    `Ship to: ${lines.join(", ")}`,
    ``,
    `Items:`,
    ...itemsText,
    ``,
    paymentLine,
  ].join("\n");

  return { subject: `${cod ? "New COD order" : "New order"} ${ref} — ${formatPaise(order.totalPaise)} — ${order.customer.name}`, html, text };
}
