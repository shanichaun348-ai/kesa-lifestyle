/**
 * Matching rules for the public order lookup: the shopper supplies the order
 * number plus the email or phone used at checkout. Pure, unit-tested.
 */

export const ORDER_REF_RE = /^\s*(?:KL-?)?(\d{1,12})\s*$/i;

/** "KL-123", "kl123", " 123 " → 123; anything else → null. */
export function parseOrderReference(input: string): number | null {
  const m = ORDER_REF_RE.exec(input);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Last 10 digits of an Indian mobile, ignoring +91 / 0 prefixes and punctuation. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** True when the contact the shopper typed matches the order's email or phone. */
export function contactMatches(order: { customerEmail: string; customerPhone: string; shippingPhone?: string | null }, contact: string): boolean {
  const c = contact.trim();
  if (!c) return false;
  if (c.includes("@")) return c.toLowerCase() === order.customerEmail.trim().toLowerCase();
  const typed = normalisePhone(c);
  if (typed.length < 10) return false;
  return typed === normalisePhone(order.customerPhone) || (!!order.shippingPhone && typed === normalisePhone(order.shippingPhone));
}

/** "priya.sharma@gmail.com" → "p•••••a@gmail.com" — enough to reassure, not enough to leak. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  if (!domain) return "•••";
  if (user.length <= 2) return `${user[0] ?? "•"}•@${domain}`;
  return `${user[0]}${"•".repeat(Math.min(5, user.length - 2))}${user[user.length - 1]}@${domain}`;
}
