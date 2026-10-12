import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseServiceClient } from "@/lib/supabase";

import type { CreateWithInventoryResult, OrderRepository } from "./repository";
import type { Order } from "./types";

/**
 * Production Supabase-backed order repository.
 * All concurrency-sensitive operations run inside PostgreSQL stored procedures
 * to guarantee atomicity across multiple serverless instances.
 */
export class SupabaseOrderRepository implements OrderRepository {
  private get db() {
    return getSupabaseServiceClient();
  }

  async createWithInventory(
    order: Order,
    idempotencyKey?: string,
    requestHash?: string,
  ): Promise<CreateWithInventoryResult> {
    const hash =
      requestHash ??
      createHash("sha256")
        .update(JSON.stringify({ items: order.items, total: order.totalPaise }))
        .digest("hex");

    const items = order.items.map((item) => ({
      sku: item.sku,
      productId: item.productId,
      productName: item.productName,
      ...(item.variantOptionValue !== undefined && {
        variantOptionValue: item.variantOptionValue,
      }),
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      lineTotalPaise: item.lineTotalPaise,
      gstRateBp: item.gstRateBp,
      hsnCode: item.hsnCode,
    }));

    const { data, error } = await this.db.rpc("create_order_with_inventory", {
      p_order_id: order.id,
      p_idempotency_key: idempotencyKey ?? "",
      p_request_hash: hash,
      p_customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
      },
      p_shipping_address: order.shippingAddress,
      p_items: items,
      p_subtotal_paise: order.subtotalPaise,
      p_discount_paise: order.discountPaise,
      p_shipping_paise: order.shippingPaise,
      p_gst_paise: order.gstPaise,
      p_total_paise: order.totalPaise,
      p_coupon: order.coupon,
      p_currency: order.currency,
    });

    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "db",
          action: "create_order",
          error: error.message,
          ts: new Date().toISOString(),
        }),
      );
      throw new Error("Order creation failed. Please try again.");
    }

    const result = data as {
      ok: boolean;
      error?: string;
      orderId?: string;
      idempotent?: boolean;
      sku?: string;
      available?: number;
      requested?: number;
    };

    if (!result.ok) {
      switch (result.error) {
        case "PRODUCT_NOT_FOUND":
          return { kind: "product_not_found", sku: result.sku! };
        case "INSUFFICIENT_STOCK":
          return {
            kind: "out_of_stock",
            sku: result.sku!,
            available: result.available!,
            requested: result.requested!,
          };
        case "IDEMPOTENCY_CONFLICT":
          return { kind: "idempotency_conflict", message: "Idempotency key conflict." };
        default:
          throw new Error("Unexpected error from order creation.");
      }
    }

    if (result.idempotent) {
      const existing = await this.findById(result.orderId!);
      if (!existing) throw new Error("Idempotent order not found after creation.");
      return { kind: "idempotent", order: existing };
    }

    const created = await this.findById(order.id);
    if (!created) throw new Error("Order not found after creation.");
    return { kind: "created", order: created };
  }

  async findById(id: string): Promise<Order | null> {
    const { data: row, error } = await this.db
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();
    if (error ?? !row) return null;
    return this.rowToOrder(row as Record<string, unknown>);
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    const { data: row, error } = await this.db
      .from("orders")
      .select("*, order_items(*)")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();
    if (error ?? !row) return null;
    return this.rowToOrder(row as Record<string, unknown>);
  }

  async update(order: Order): Promise<Order> {
    const { error } = await this.db
      .from("orders")
      .update({
        status: order.status,
        razorpay_order_id: order.razorpayOrderId,
        ...(order.razorpayPaymentId !== undefined && {
          razorpay_payment_id: order.razorpayPaymentId,
        }),
        ...(order.paymentMethod !== undefined && { payment_method: order.paymentMethod }),
        ...(order.codFeePaise !== undefined && { cod_fee_paise: order.codFeePaise }),
        ...(order.paidAt !== undefined && { paid_at: order.paidAt }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "db",
          action: "update_order",
          orderId: order.id,
          error: error.message,
          ts: new Date().toISOString(),
        }),
      );
      throw new Error("Failed to update order.");
    }
    return order;
  }

  async releaseOrderInventory(orderId: string): Promise<void> {
    const { error } = await this.db.rpc("release_order_inventory", {
      p_order_id: orderId,
    });
    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "db",
          action: "release_inventory",
          orderId,
          error: error.message,
          ts: new Date().toISOString(),
        }),
      );
    }
  }

  async recordWebhookEvent(
    idempotencyKey: string,
    eventType: string,
    orderId: string,
  ): Promise<boolean> {
    const { data, error } = await this.db.rpc("record_webhook_event", {
      p_idempotency_key: idempotencyKey,
      p_event_type: eventType,
      p_order_id: orderId,
    });
    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "db",
          action: "record_webhook",
          error: error.message,
          ts: new Date().toISOString(),
        }),
      );
      return false; // fail-safe: don't process if we can't record idempotency
    }
    return data as boolean;
  }

  private rowToOrder(row: Record<string, unknown>): Order {
    const items = (row.order_items as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      id: row.id as string,
      ...(row.order_number !== null && row.order_number !== undefined && { orderNumber: Number(row.order_number) }),
      status: row.status as Order["status"],
      customer: {
        name: row.customer_name as string,
        email: row.customer_email as string,
        phone: row.customer_phone as string,
      },
      shippingAddress: row.shipping_address as Order["shippingAddress"],
      items: items.map((item) => ({
        sku: item.sku as string,
        productId: item.product_id as string,
        productName: item.product_name as string,
        ...(item.variant_option_value !== null &&
          item.variant_option_value !== undefined && {
            variantOptionValue: item.variant_option_value as string,
          }),
        quantity: item.quantity as number,
        unitPricePaise: item.unit_price_paise as number,
        lineTotalPaise: item.line_total_paise as number,
        gstRateBp: item.gst_rate_bp as number,
        hsnCode: item.hsn_code as string,
      })),
      subtotalPaise: row.subtotal_paise as number,
      discountPaise: row.discount_paise as number,
      shippingPaise: row.shipping_paise as number,
      gstPaise: row.gst_paise as number,
      totalPaise: row.total_paise as number,
      coupon: row.coupon as Order["coupon"],
      ...(row.payment_method === "cod" || row.payment_method === "razorpay"
        ? { paymentMethod: row.payment_method }
        : {}),
      ...(row.cod_fee_paise !== null && row.cod_fee_paise !== undefined && { codFeePaise: Number(row.cod_fee_paise) }),
      razorpayOrderId: row.razorpay_order_id as string,
      ...(row.razorpay_payment_id !== null &&
        row.razorpay_payment_id !== undefined && {
          razorpayPaymentId: row.razorpay_payment_id as string,
        }),
      currency: "INR",
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      ...(row.paid_at !== null &&
        row.paid_at !== undefined && { paidAt: row.paid_at as string }),
    };
  }
}
