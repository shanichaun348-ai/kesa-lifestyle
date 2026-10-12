import "server-only";

import type { AdminSession } from "./types";

export type AuditAction =
  | "admin.login"
  | "admin.login_failed"
  | "admin.logout"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.archive"
  | "product.publish"
  | "product.unpublish"
  | "order.update_status"
  | "order.ship"
  | "order.cancel"
  | "order.resend_email"
  | "order.resend_whatsapp"
  | "order.refund"
  | "customer.update"
  | "customer.suspend"
  | "customer.reinstate"
  | "coupon.create"
  | "coupon.update"
  | "coupon.delete"
  | "review.approve"
  | "review.reject"
  | "review.delete"
  | "order.review_request"
  | "content.update"
  | "seo.update"
  | "redirect.create"
  | "redirect.delete";

/**
 * Writes a structured audit log entry.
 * Consumed by Vercel log drain / pino (ADR-16).
 * Will write to outbox_events / audit_log table once Postgres (D10) is set up.
 */
export function auditLog(
  session: AdminSession,
  action: AuditAction,
  details?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    level: "info",
    event: "admin_audit",
    action,
    adminId: session.userId,
    adminEmail: session.email,
    adminRole: session.role,
    ts: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(entry));
}
