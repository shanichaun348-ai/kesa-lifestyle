import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { canTransition } from "@/modules/orders/state-machine";
import { isCod, type Order, type OrderStatus, type ShippingAddress } from "@/modules/orders/types";

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

/** Online orders whose payment has been received. */
export const PAID_STATUSES: ReadonlySet<OrderStatus> = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
/** COD orders that are confirmed (nothing collected until delivery). */
const COD_CONFIRMED_STATUSES: ReadonlySet<OrderStatus> = new Set(["PROCESSING", "SHIPPED", "DELIVERED"]);
export const NEEDS_ACTION_STATUSES: ReadonlySet<OrderStatus> = new Set(["PAID", "PROCESSING"]);

type PaymentAware = Pick<Order, "status" | "paymentMethod" | "totalPaise">;

/** The order is real and should be fulfilled: paid online, or confirmed for cash on delivery. */
export function isConfirmed(order: Pick<Order, "status" | "paymentMethod">): boolean {
  return isCod(order) ? COD_CONFIRMED_STATUSES.has(order.status) : PAID_STATUSES.has(order.status);
}

/** Money actually received: online payments once PAID, cash only once DELIVERED. */
export function collectedPaise(order: PaymentAware): number {
  if (isCod(order)) return order.status === "DELIVERED" ? order.totalPaise : 0;
  return PAID_STATUSES.has(order.status) ? order.totalPaise : 0;
}

export type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled" | "cod_pending" | "cod_collected";

export function paymentStatusOf(order: Pick<Order, "status" | "paymentMethod">): PaymentStatus {
  const { status } = order;
  if (status === "REFUNDED") return "refunded";
  if (status === "CANCELLED") return "cancelled";
  if (isCod(order)) return status === "DELIVERED" ? "cod_collected" : "cod_pending";
  if (PAID_STATUSES.has(status)) return "paid";
  if (status === "PAYMENT_FAILED") return "failed";
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
    paymentMethod: row.payment_method === "cod" ? "cod" : "razorpay",
    codFeePaise: Number(row.cod_fee_paise ?? 0),
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
    const paid = collectedPaise(o);
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
  const paidTotal = orders.reduce((s, o) => s + collectedPaise(o), 0);
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
  const revenuePaise = orders.reduce((s, o) => s + collectedPaise(o), 0);
  // Paid-online orders waiting to be processed/shipped, plus confirmed COD orders not yet shipped.
  const needsAction = orders.filter((o) => isConfirmed(o) && NEEDS_ACTION_STATUSES.has(o.status)).length;
  const customers = new Set(orders.map((o) => o.customer.email.trim().toLowerCase())).size;
  return { revenuePaise, needsAction, customers, recent: orders.slice(0, 5) };
}

export async function setOrderStatus(id: string, to: OrderStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await getOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransition(order.status, to)) return { ok: false, error: `Cannot move an order from ${order.status} to ${to}.` };
  const now = new Date().toISOString();
  // Cash is collected at the door, so delivery is the payment moment for COD.
  const cashCollected = to === "DELIVERED" && isCod(order) && !order.paidAt;
  const { error } = await getSupabaseServiceClient()
    .from("orders")
    .update({ status: to, updated_at: now, ...(cashCollected && { paid_at: now }) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
