import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { canTransition } from "@/modules/orders/state-machine";
import type { Order, OrderStatus, ShippingAddress } from "@/modules/orders/types";

export type AdminOrder = Order & { orderNumber: number };

export type AdminCustomer = {
  /** URL-safe key: the customer's email, lower-cased. */
  key: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpentPaise: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export const PAID_STATUSES: ReadonlySet<OrderStatus> = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
export const NEEDS_ACTION_STATUSES: ReadonlySet<OrderStatus> = new Set(["PAID", "PROCESSING"]);

export function paymentStatusOf(status: OrderStatus): "paid" | "pending" | "failed" | "refunded" | "cancelled" {
  if (PAID_STATUSES.has(status)) return "paid";
  if (status === "REFUNDED") return "refunded";
  if (status === "PAYMENT_FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  return "pending";
}

export function formatOrderNumber(n: number): string {
  return `KL-${n}`;
}

function rowToAdminOrder(row: Record<string, unknown>): AdminOrder {
  const items = (row.order_items as Array<Record<string, unknown>> | null) ?? [];
  return {
    id: row.id as string,
    orderNumber: Number(row.order_number),
    status: row.status as OrderStatus,
    customer: {
      name: row.customer_name as string,
      email: row.customer_email as string,
      phone: row.customer_phone as string,
    },
    shippingAddress: row.shipping_address as ShippingAddress,
    items: items.map((i) => ({
      sku: i.sku as string,
      productId: i.product_id as string,
      productName: i.product_name as string,
      ...(i.variant_option_value ? { variantOptionValue: i.variant_option_value as string } : {}),
      quantity: Number(i.quantity),
      unitPricePaise: Number(i.unit_price_paise),
      lineTotalPaise: Number(i.line_total_paise),
      gstRateBp: Number(i.gst_rate_bp),
      hsnCode: i.hsn_code as string,
    })),
    subtotalPaise: Number(row.subtotal_paise),
    discountPaise: Number(row.discount_paise),
    shippingPaise: Number(row.shipping_paise),
    gstPaise: Number(row.gst_paise),
    totalPaise: Number(row.total_paise),
    coupon: (row.coupon as Order["coupon"]) ?? null,
    razorpayOrderId: (row.razorpay_order_id as string | null) ?? "",
    ...(row.razorpay_payment_id ? { razorpayPaymentId: row.razorpay_payment_id as string } : {}),
    currency: "INR",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ...(row.paid_at ? { paidAt: row.paid_at as string } : {}),
  };
}

export async function listOrders(status?: OrderStatus): Promise<AdminOrder[]> {
  let q = getSupabaseServiceClient()
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(rowToAdminOrder);
}

export async function getOrder(id: string): Promise<AdminOrder | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToAdminOrder(data as Record<string, unknown>);
}

export async function listOrdersForCustomer(email: string): Promise<AdminOrder[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("orders")
    .select("*, order_items(*)")
    .ilike("customer_email", email)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(rowToAdminOrder);
}

export async function listCustomers(): Promise<AdminCustomer[]> {
  const orders = await listOrders();
  const byEmail = new Map<string, AdminCustomer>();
  for (const o of orders) {
    const key = o.customer.email.trim().toLowerCase();
    const paid = PAID_STATUSES.has(o.status) ? o.totalPaise : 0;
    const existing = byEmail.get(key);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpentPaise += paid;
      if (o.createdAt < existing.firstOrderAt) existing.firstOrderAt = o.createdAt;
      if (o.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = o.createdAt;
        existing.name = o.customer.name;
        existing.phone = o.customer.phone;
      }
    } else {
      byEmail.set(key, {
        key,
        name: o.customer.name,
        email: o.customer.email,
        phone: o.customer.phone,
        orderCount: 1,
        totalSpentPaise: paid,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
      });
    }
  }
  return [...byEmail.values()].sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}

export async function getCustomer(key: string): Promise<{ customer: AdminCustomer; orders: AdminOrder[] } | null> {
  const orders = await listOrdersForCustomer(key);
  if (orders.length === 0) return null;
  const latest = orders[0]!;
  const paidTotal = orders.filter((o) => PAID_STATUSES.has(o.status)).reduce((s, o) => s + o.totalPaise, 0);
  return {
    customer: {
      key,
      name: latest.customer.name,
      email: latest.customer.email,
      phone: latest.customer.phone,
      orderCount: orders.length,
      totalSpentPaise: paidTotal,
      firstOrderAt: orders[orders.length - 1]!.createdAt,
      lastOrderAt: latest.createdAt,
    },
    orders,
  };
}

export async function dashboardStats(): Promise<{
  revenuePaise: number;
  needsAction: number;
  customers: number;
  recent: AdminOrder[];
}> {
  const orders = await listOrders();
  const revenuePaise = orders.filter((o) => PAID_STATUSES.has(o.status)).reduce((s, o) => s + o.totalPaise, 0);
  const needsAction = orders.filter((o) => NEEDS_ACTION_STATUSES.has(o.status)).length;
  const customers = new Set(orders.map((o) => o.customer.email.trim().toLowerCase())).size;
  return { revenuePaise, needsAction, customers, recent: orders.slice(0, 5) };
}

export async function setOrderStatus(id: string, to: OrderStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await getOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransition(order.status, to)) return { ok: false, error: `Cannot move an order from ${order.status} to ${to}.` };
  const { error } = await getSupabaseServiceClient()
    .from("orders")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
