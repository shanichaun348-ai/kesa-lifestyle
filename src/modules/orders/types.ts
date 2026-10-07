/**
 * Order domain types. These are the authoritative shapes for the checkout
 * flow — all monetary fields are server-calculated, never from the client.
 */

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
  /** Set during order creation; must match totalPaise exactly. */
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  currency: "INR";
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

export type CreateOrderInput = {
  customer: CheckoutCustomer;
  shippingAddress: ShippingAddress;
  lines: Array<{ sku: string; quantity: number }>;
  couponCode?: string;
};
