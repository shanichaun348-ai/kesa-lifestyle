import { isCod, type Order, type OrderStatus } from "./types";

/**
 * Valid order status transitions.
 * Any transition not listed here is illegal and will throw.
 *
 * Online payment: CREATED → PAYMENT_PENDING → PAID → PROCESSING → SHIPPED → DELIVERED.
 * Cash on delivery skips the payment states: CREATED → PROCESSING → SHIPPED →
 * DELIVERED, and may be cancelled while still PROCESSING (nothing has been
 * charged). The admin actions restrict that cancel to COD orders.
 */
const VALID_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  CREATED: ["PAYMENT_PENDING", "PROCESSING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PAYMENT_FAILED: ["PAYMENT_PENDING", "CANCELLED"], // retry allowed; the stale-order job cancels abandoned retries
  CANCELLED: [],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (VALID_TRANSITIONS[from] as readonly string[]).includes(to);
}

/**
 * Return a new Order with `status` updated to `to`.
 * Throws if the transition is invalid (prevents corrupted state in DB).
 * Sets `paidAt` when payment is received: on PAID for online orders, on
 * DELIVERED for cash on delivery (the courier collected the cash). Stamps
 * `shippedAt`, `deliveredAt` and `cancelledAt` on the matching transitions.
 */
export function transitionOrder(order: Order, to: OrderStatus): Order {
  if (!canTransition(order.status, to)) {
    throw new Error(`Invalid order transition: ${order.status} → ${to} (order ${order.id})`);
  }
  const now = new Date().toISOString();
  const paidNow = to === "PAID" || (to === "DELIVERED" && isCod(order));
  return {
    ...order,
    status: to,
    updatedAt: now,
    ...(paidNow && { paidAt: now }),
    ...(to === "SHIPPED" && { shippedAt: now }),
    ...(to === "DELIVERED" && { deliveredAt: now }),
    ...(to === "CANCELLED" && { cancelledAt: now }),
  };
}
