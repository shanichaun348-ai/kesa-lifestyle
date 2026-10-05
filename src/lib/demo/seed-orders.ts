/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — ORDERS
 *
 * Invented sample orders for the admin UI. No real customers or payments.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled" | "returned";

export type OrderItem = {
  productSlug: string;
  productName: string;
  sku: string;
  variantLabel: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
};

export type DemoOrder = {
  id: string;
  number: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
  couponCode?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: string;
  razorpayOrderId?: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const seedOrders: DemoOrder[] = [
  {
    id: "ord_001",
    number: "KL-10001",
    createdAt: daysAgo(1),
    customer: { id: "cust_001", name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210" },
    items: [
      { productSlug: "gold-pearl-drop-earrings", productName: "Gold Pearl Drop Earrings", sku: "SKU-GPE-001", variantLabel: "One Size", quantity: 1, unitPricePaise: 79900, totalPaise: 79900 },
      { productSlug: "layered-chain-necklace", productName: "Layered Chain Necklace", sku: "SKU-LCN-001", variantLabel: "18 inch", quantity: 1, unitPricePaise: 119900, totalPaise: 119900 },
    ],
    subtotalPaise: 199800,
    shippingPaise: 0,
    discountPaise: 0,
    totalPaise: 199800,
    status: "delivered",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    paymentMethod: "UPI",
    razorpayOrderId: "order_DEMO001",
    shippingAddress: { name: "Priya Sharma", line1: "204, Green Apartments", line2: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", phone: "+91 98765 43210" },
    trackingNumber: "SRKT1234567890",
    carrier: "Shiprocket",
  },
  {
    id: "ord_002",
    number: "KL-10002",
    createdAt: daysAgo(2),
    customer: { id: "cust_002", name: "Anjali Mehta", email: "anjali@example.com", phone: "+91 99887 76655" },
    items: [
      { productSlug: "oxidised-jhumka-earrings", productName: "Oxidised Jhumka Earrings", sku: "SKU-OJE-001", variantLabel: "One Size", quantity: 2, unitPricePaise: 59900, totalPaise: 119800 },
    ],
    subtotalPaise: 119800,
    shippingPaise: 0,
    discountPaise: 11980,
    totalPaise: 107820,
    couponCode: "WELCOME10",
    status: "shipped",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    paymentMethod: "Credit Card",
    shippingAddress: { name: "Anjali Mehta", line1: "B-12, Sector 21", city: "Noida", state: "Uttar Pradesh", pincode: "201301", phone: "+91 99887 76655" },
    trackingNumber: "SRKT9876543210",
    carrier: "Shiprocket",
  },
  {
    id: "ord_003",
    number: "KL-10003",
    createdAt: daysAgo(3),
    customer: { id: "cust_003", name: "Ritu Kapoor", email: "ritu@example.com", phone: "+91 97755 66443" },
    items: [
      { productSlug: "rose-gold-bangle-set", productName: "Rose Gold Bangle Set", sku: "SKU-RGB-001", variantLabel: "2/6 Size", quantity: 1, unitPricePaise: 149900, totalPaise: 149900 },
    ],
    subtotalPaise: 149900,
    shippingPaise: 4900,
    discountPaise: 0,
    totalPaise: 154800,
    status: "confirmed",
    paymentStatus: "paid",
    fulfillmentStatus: "unfulfilled",
    paymentMethod: "Net Banking",
    shippingAddress: { name: "Ritu Kapoor", line1: "Flat 3B, Sunshine Heights", city: "Mumbai", state: "Maharashtra", pincode: "400050", phone: "+91 97755 66443" },
  },
  {
    id: "ord_004",
    number: "KL-10004",
    createdAt: daysAgo(4),
    customer: { id: "cust_004", name: "Deepika Singh", email: "deepika@example.com", phone: "+91 93322 11009" },
    items: [
      { productSlug: "kundan-statement-necklace", productName: "Kundan Statement Necklace", sku: "SKU-KSN-001", variantLabel: "One Size", quantity: 1, unitPricePaise: 299900, totalPaise: 299900 },
    ],
    subtotalPaise: 299900,
    shippingPaise: 0,
    discountPaise: 0,
    totalPaise: 299900,
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    paymentMethod: "COD",
    shippingAddress: { name: "Deepika Singh", line1: "12, Civil Lines", city: "Jaipur", state: "Rajasthan", pincode: "302006", phone: "+91 93322 11009" },
  },
  {
    id: "ord_005",
    number: "KL-10005",
    createdAt: daysAgo(5),
    customer: { id: "cust_005", name: "Sunita Rao", email: "sunita@example.com", phone: "+91 90011 22334" },
    items: [
      { productSlug: "silver-toe-ring-set", productName: "Silver Toe Ring Set", sku: "SKU-STR-001", variantLabel: "Adjustable", quantity: 1, unitPricePaise: 34900, totalPaise: 34900 },
    ],
    subtotalPaise: 34900,
    shippingPaise: 4900,
    discountPaise: 0,
    totalPaise: 39800,
    status: "cancelled",
    paymentStatus: "refunded",
    fulfillmentStatus: "unfulfilled",
    paymentMethod: "UPI",
    shippingAddress: { name: "Sunita Rao", line1: "45, Anna Nagar", city: "Chennai", state: "Tamil Nadu", pincode: "600040", phone: "+91 90011 22334" },
    notes: "Customer requested cancellation before dispatch.",
  },
  {
    id: "ord_006",
    number: "KL-10006",
    createdAt: daysAgo(7),
    customer: { id: "cust_001", name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210" },
    items: [
      { productSlug: "antique-gold-choker", productName: "Antique Gold Choker", sku: "SKU-AGC-001", variantLabel: "One Size", quantity: 1, unitPricePaise: 189900, totalPaise: 189900 },
    ],
    subtotalPaise: 189900,
    shippingPaise: 0,
    discountPaise: 0,
    totalPaise: 189900,
    status: "delivered",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    paymentMethod: "Credit Card",
    shippingAddress: { name: "Priya Sharma", line1: "204, Green Apartments", line2: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", phone: "+91 98765 43210" },
    trackingNumber: "SRKT2345678901",
    carrier: "Shiprocket",
  },
  {
    id: "ord_007",
    number: "KL-10007",
    createdAt: daysAgo(10),
    customer: { id: "cust_006", name: "Kavita Patel", email: "kavita@example.com", phone: "+91 91122 33445" },
    items: [
      { productSlug: "beaded-bracelet-stack", productName: "Beaded Bracelet Stack", sku: "SKU-BBS-001", variantLabel: "One Size", quantity: 3, unitPricePaise: 49900, totalPaise: 149700 },
    ],
    subtotalPaise: 149700,
    shippingPaise: 0,
    discountPaise: 14970,
    totalPaise: 134730,
    couponCode: "FIRST15",
    status: "delivered",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    paymentMethod: "UPI",
    shippingAddress: { name: "Kavita Patel", line1: "C-22, Navrangpura", city: "Ahmedabad", state: "Gujarat", pincode: "380009", phone: "+91 91122 33445" },
    trackingNumber: "SRKT3456789012",
    carrier: "Shiprocket",
  },
  {
    id: "ord_008",
    number: "KL-10008",
    createdAt: daysAgo(12),
    customer: { id: "cust_007", name: "Nisha Verma", email: "nisha@example.com", phone: "+91 88776 65544" },
    items: [
      { productSlug: "polki-stud-earrings", productName: "Polki Stud Earrings", sku: "SKU-PSE-001", variantLabel: "One Size", quantity: 1, unitPricePaise: 99900, totalPaise: 99900 },
    ],
    subtotalPaise: 99900,
    shippingPaise: 0,
    discountPaise: 0,
    totalPaise: 99900,
    status: "refunded",
    paymentStatus: "refunded",
    fulfillmentStatus: "returned",
    paymentMethod: "Credit Card",
    shippingAddress: { name: "Nisha Verma", line1: "15, Shyam Nagar", city: "Jaipur", state: "Rajasthan", pincode: "302019", phone: "+91 88776 65544" },
    notes: "Damaged in transit. Full refund issued.",
  },
];

export function getOrderById(id: string): DemoOrder | null {
  return seedOrders.find((o) => o.id === id) ?? null;
}
