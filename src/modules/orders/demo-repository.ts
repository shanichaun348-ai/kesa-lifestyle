import "server-only";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DEMO ONLY — NOT FOR PRODUCTION USE                              ║
 * ║                                                                  ║
 * ║  Known production limitations:                                   ║
 * ║                                                                  ║
 * ║  1. Orders are NOT persisted across server restarts.             ║
 * ║     Replace with SupabaseOrderRepository.                        ║
 * ║                                                                  ║
 * ║  2. Inventory reservation is safe ONLY in a single-process       ║
 * ║     deployment. For auto-scaling / Vercel serverless, each       ║
 * ║     function instance has its own Map — two instances can        ║
 * ║     simultaneously oversell the last unit.                       ║
 * ║     Production fix: create_order_with_inventory stored proc      ║
 * ║     uses FOR UPDATE locking inside a PostgreSQL transaction.     ║
 * ║                                                                  ║
 * ║  3. Webhook idempotency is per-process (in-memory Set).          ║
 * ║     Production fix: webhook_events table with UNIQUE constraint  ║
 * ║     on idempotency_key, written via record_webhook_event RPC.    ║
 * ║                                                                  ║
 * ║  4. Replace this file before production deployment.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { seedProducts } from "@/lib/demo/seed-catalog";

import type { CreateWithInventoryResult, OrderRepository } from "./repository";
import type { Order } from "./types";

export class DemoOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();
  private readonly razorpayIndex = new Map<string, string>(); // razorpayOrderId → orderId
  private readonly reservations = new Map<string, Array<{ sku: string; quantity: number }>>();
  private readonly processedWebhooks = new Set<string>();
  private inventory: Map<string, number> | null = null;

  private getInventory(): Map<string, number> {
    if (this.inventory) return this.inventory;
    const inv = new Map<string, number>();
    for (const product of seedProducts) {
      for (const variant of product.variants) {
        inv.set(variant.sku, variant.stock);
      }
    }
    this.inventory = inv;
    return this.inventory;
  }

  async createWithInventory(
    order: Order,
    _idempotencyKey?: string,
    _requestHash?: string,
  ): Promise<CreateWithInventoryResult> {
    const inv = this.getInventory();
    const reserved: Array<{ sku: string; quantity: number }> = [];

    for (const item of order.items) {
      const available = inv.get(item.sku);
      if (available === undefined) {
        for (const r of reserved) inv.set(r.sku, (inv.get(r.sku) ?? 0) + r.quantity);
        return { kind: "product_not_found", sku: item.sku };
      }
      if (available < item.quantity) {
        for (const r of reserved) inv.set(r.sku, (inv.get(r.sku) ?? 0) + r.quantity);
        return { kind: "out_of_stock", sku: item.sku, available, requested: item.quantity };
      }
      inv.set(item.sku, available - item.quantity);
      reserved.push({ sku: item.sku, quantity: item.quantity });
    }

    this.reservations.set(order.id, reserved);
    this.orders.set(order.id, order);
    if (order.razorpayOrderId) this.razorpayIndex.set(order.razorpayOrderId, order.id);
    return { kind: "created", order };
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    const orderId = this.razorpayIndex.get(razorpayOrderId);
    if (!orderId) return null;
    return this.orders.get(orderId) ?? null;
  }

  async listStaleUnpaid(olderThan: Date, limit: number): Promise<Order[]> {
    const cutoff = olderThan.toISOString();
    return [...this.orders.values()]
      .filter((o) => ["CREATED", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(o.status) && o.paymentMethod !== "cod" && o.createdAt < cutoff)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }

  async update(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    if (order.razorpayOrderId) this.razorpayIndex.set(order.razorpayOrderId, order.id);
    return order;
  }

  async releaseOrderInventory(orderId: string): Promise<void> {
    const inv = this.getInventory();
    const reserved = this.reservations.get(orderId) ?? [];
    for (const r of reserved) {
      inv.set(r.sku, (inv.get(r.sku) ?? 0) + r.quantity);
    }
    this.reservations.delete(orderId);
  }

  async recordWebhookEvent(
    idempotencyKey: string,
    _eventType: string,
    _orderId: string,
  ): Promise<boolean> {
    if (this.processedWebhooks.has(idempotencyKey)) return false;
    this.processedWebhooks.add(idempotencyKey);
    return true;
  }
}
