import type { Order } from "./types";

export type CreateWithInventoryResult =
  | { kind: "created"; order: Order }
  | { kind: "idempotent"; order: Order }
  | { kind: "out_of_stock"; sku: string; available: number; requested: number }
  | { kind: "product_not_found"; sku: string }
  | { kind: "idempotency_conflict"; message: string };

/**
 * Data-access contract for orders.
 * DemoOrderRepository: in-memory, single-process safe only.
 * SupabaseOrderRepository: production, uses PostgreSQL stored procedures for concurrency safety.
 */
export interface OrderRepository {
  /**
   * Atomically reserve inventory and create the order in a single transaction.
   * In Supabase: calls create_order_with_inventory stored procedure (FOR UPDATE locking).
   * In demo: synchronous check-and-decrement (safe only in single-process Node.js).
   */
  createWithInventory(
    order: Order,
    idempotencyKey?: string,
    requestHash?: string,
  ): Promise<CreateWithInventoryResult>;

  findById(id: string): Promise<Order | null>;
  findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null>;
  /** Online-payment orders still unpaid (CREATED, PAYMENT_PENDING, PAYMENT_FAILED) created before `olderThan`, oldest first. */
  listStaleUnpaid(olderThan: Date, limit: number): Promise<Order[]>;
  update(order: Order): Promise<Order>;

  /**
   * Release all inventory reservations for an order.
   * Called when Razorpay order creation fails or an order is cancelled.
   */
  releaseOrderInventory(orderId: string): Promise<void>;

  /**
   * Record a webhook event for persistent idempotency.
   * Returns true if newly recorded (caller should process the event).
   * Returns false if already seen (caller should skip — duplicate or retry).
   */
  recordWebhookEvent(
    idempotencyKey: string,
    eventType: string,
    orderId: string,
  ): Promise<boolean>;
}
