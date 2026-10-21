import type { RazorpayPayment } from "@/lib/razorpay";

import type { OrderRepository } from "./repository";
import { transitionOrder } from "./state-machine";
import type { Order } from "./types";

/** An online order left unpaid this long is treated as abandoned. Razorpay's own checkout expires sooner. */
export const STALE_AFTER_MS = 30 * 60 * 1000;
export const STALE_BATCH = 100;

export type StaleOrdersDeps = {
  repo: Pick<OrderRepository, "listStaleUnpaid" | "update" | "releaseOrderInventory">;
  /** Payments made against a Razorpay order; throws on network failure. */
  fetchPayments: (razorpayOrderId: string) => Promise<RazorpayPayment[]>;
  /** Fired when a stale order turns out to be paid after all. */
  notifyPaid: (order: Order) => Promise<unknown>;
  now?: Date;
};

export type StaleOrdersSummary = { candidates: number; cancelled: number; paid: number; skipped: number; failed: number };

/** A captured payment for exactly the order total, if Razorpay has one. */
export function capturedPaymentFor(order: Pick<Order, "totalPaise">, payments: readonly RazorpayPayment[]): RazorpayPayment | null {
  return payments.find((p) => p.status === "captured" && p.amount === order.totalPaise) ?? null;
}

/**
 * Unpaid online orders hold their stock from the moment they are created.
 * This job looks at every order still unpaid after STALE_AFTER_MS. If
 * Razorpay shows a captured payment for the full amount (the verify call
 * never reached us), the order is marked paid and the customer notified.
 * Otherwise the order is cancelled and its stock released. COD orders are
 * never touched: they go straight to PROCESSING at creation.
 */
export async function reconcileStaleOrders(deps: StaleOrdersDeps): Promise<StaleOrdersSummary> {
  const now = deps.now ?? new Date();
  const summary: StaleOrdersSummary = { candidates: 0, cancelled: 0, paid: 0, skipped: 0, failed: 0 };
  const stale = await deps.repo.listStaleUnpaid(new Date(now.getTime() - STALE_AFTER_MS), STALE_BATCH);
  summary.candidates = stale.length;

  for (const order of stale) {
    try {
      let payments: RazorpayPayment[] = [];
      if (order.razorpayOrderId) {
        payments = await deps.fetchPayments(order.razorpayOrderId);
      }
      const captured = capturedPaymentFor(order, payments);

      if (captured) {
        // Money arrived but the browser never confirmed: finish the order instead of cancelling a paid one.
        let paid = order.status === "PAYMENT_PENDING" ? order : transitionOrder(order, "PAYMENT_PENDING");
        paid = { ...transitionOrder(paid, "PAID"), razorpayPaymentId: captured.id };
        await deps.repo.update(paid);
        await deps.notifyPaid(paid).catch(() => undefined);
        summary.paid += 1;
        continue;
      }

      if (payments.some((p) => p.status === "authorized")) {
        // Authorised but not yet captured: leave it for Razorpay to settle or auto-refund; try again next run.
        summary.skipped += 1;
        continue;
      }

      const cancelled = transitionOrder(order, "CANCELLED");
      await deps.repo.update(cancelled);
      await deps.repo.releaseOrderInventory(order.id);
      summary.cancelled += 1;
    } catch (err) {
      summary.failed += 1;
      console.error(JSON.stringify({ level: "error", event: "job", job: "stale-orders", orderId: order.id, error: err instanceof Error ? err.message : "unknown", ts: now.toISOString() }));
    }
  }

  return summary;
}
