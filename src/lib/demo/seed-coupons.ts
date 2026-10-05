/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — COUPONS
 *
 * Invented sample coupons for the admin UI. No real monetary value.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type CouponType = "percent" | "fixed";
export type CouponStatus = "active" | "inactive" | "expired";

export type DemoCoupon = {
  id: string;
  code: string;
  type: CouponType;
  /** Percent (0-100) or paise amount */
  value: number;
  status: CouponStatus;
  minOrderPaise: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  expiresAt?: string;
  productSlugs?: string[];
  categoryPaths?: string[];
  description: string;
  createdAt: string;
};

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const seedCoupons: DemoCoupon[] = [
  {
    id: "coup_001",
    code: "WELCOME10",
    type: "percent",
    value: 10,
    status: "active",
    minOrderPaise: 50000,
    usageLimit: 1000,
    usageCount: 43,
    perCustomerLimit: 1,
    expiresAt: daysFromNow(30),
    description: "10% off for new customers. One use per customer.",
    createdAt: daysAgo(30),
  },
  {
    id: "coup_002",
    code: "FIRST15",
    type: "percent",
    value: 15,
    status: "active",
    minOrderPaise: 99900,
    usageLimit: 500,
    usageCount: 12,
    perCustomerLimit: 1,
    expiresAt: daysFromNow(60),
    description: "15% off on first order above ₹999.",
    createdAt: daysAgo(15),
  },
  {
    id: "coup_003",
    code: "FLAT200",
    type: "fixed",
    value: 20000,
    status: "active",
    minOrderPaise: 199900,
    usageCount: 8,
    description: "₹200 flat off on orders above ₹1,999.",
    createdAt: daysAgo(10),
  },
  {
    id: "coup_004",
    code: "DIWALI25",
    type: "percent",
    value: 25,
    status: "expired",
    minOrderPaise: 150000,
    usageLimit: 200,
    usageCount: 187,
    expiresAt: daysAgo(5),
    description: "Diwali special — 25% off. Campaign ended.",
    createdAt: daysAgo(20),
  },
  {
    id: "coup_005",
    code: "VIP500",
    type: "fixed",
    value: 50000,
    status: "inactive",
    minOrderPaise: 300000,
    usageLimit: 50,
    usageCount: 0,
    description: "₹500 off for VIP customers on orders above ₹3,000. Not yet live.",
    createdAt: daysAgo(2),
  },
];

export function getCouponById(id: string): DemoCoupon | null {
  return seedCoupons.find((c) => c.id === id) ?? null;
}
