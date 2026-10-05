import type { Order, OrderStatus } from "./types";

/**
 * Valid order status transitions.
 * Any transition not listed here is illegal and will throw.
 */
const VALID_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PAYMENT_FAILED: ["PAYMENT_PENDING"], // retry allowed
  CANCELLED: [],
  PROCESSING: ["SHIPPED", "REFUNDED"],
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
 * Sets `paidAt` when transitioning to PAID.
 */
export function transitionOrder(order: Order, to: OrderStatus): Order {
  if (!canTransition(order.status, to)) {
    throw new Error(`Invalid order transition: ${order.status} → ${to} (order ${order.id})`);
  }
  const now = new Date().toISOString();
  return {
    ...order,
    status: to,
    updatedAt: now,
    ...(to === "PAID" && { paidAt: now }),
  };
}
