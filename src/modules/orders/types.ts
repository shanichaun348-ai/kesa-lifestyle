/**
 * Order domain types. These are the authoritative shapes for the checkout
 * flow — all monetary fields are server-calculated, never from the client.
 */
import type { PaymentMethod } from "@/modules/checkout/cod";

export type { PaymentMethod };

export type OrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "REFUNDED";

/** Immutable per-item snapshot — survives catalogue changes. */
export type OrderItem = {
  sku: string;
  productId: string;
  productName: string;
  variantOptionValue?: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  gstRateBp: number;
  hsnCode: string;
};

/** Shipping address snapshot — captured at order time. */
export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
};

/** Immutable coupon snapshot applied to this order. */
export type OrderCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discountPaise: number;
};

export type Order = {
  /** Internal order ID — "ord_" + UUID. */
  id: string;
  /** Human-friendly sequential number from the database (shown as KL-{n}). */
  orderNumber?: number;
  status: OrderStatus;
  customer: CheckoutCustomer;
  shippingAddress: ShippingAddress;
  /** Immutable line snapshots — do NOT re-read from catalogue. */
  items: OrderItem[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  /** GST is inclusive in prices — this field is for invoice display only. */
  gstPaise: number;
  /** Authoritative total; equals Razorpay order amount. */
  totalPaise: number;
  coupon: OrderCoupon | null;
  /** How the customer pays. Absent on orders from before COD existed, which were all Razorpay. */
  paymentMethod?: PaymentMethod;
  /** Cash-on-delivery handling fee, already included in totalPaise; 0 for online payment. */
  codFeePaise?: number;
  /** Set during order creation; must match totalPaise exactly. Empty for COD. */
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  currency: "INR";
  createdAt: string;
  updatedAt: string;
  /** Online: when Razorpay confirmed payment. COD: when the courier collected the cash (delivery). */
  paidAt?: string;
  /** Shipment, recorded when the order is marked shipped. */
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
};

export function paymentMethodOf(order: Pick<Order, "paymentMethod">): PaymentMethod {
  return order.paymentMethod ?? "razorpay";
}

export function isCod(order: Pick<Order, "paymentMethod">): boolean {
  return paymentMethodOf(order) === "cod";
}

export type CreateOrderInput = {
  customer: CheckoutCustomer;
  shippingAddress: ShippingAddress;
  lines: Array<{ sku: string; quantity: number }>;
  couponCode?: string;
};
