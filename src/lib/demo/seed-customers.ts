/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — CUSTOMERS
 *
 * Invented sample customers for the admin UI. No real personal data.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type CustomerStatus = "active" | "suspended";

export type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  createdAt: string;
  orderCount: number;
  totalSpentPaise: number;
  lastOrderAt?: string;
  tags: string[];
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const seedCustomers: DemoCustomer[] = [
  { id: "cust_001", name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210", status: "active", createdAt: daysAgo(60), orderCount: 2, totalSpentPaise: 389700, lastOrderAt: daysAgo(1), tags: ["repeat", "vip"] },
  { id: "cust_002", name: "Anjali Mehta", email: "anjali@example.com", phone: "+91 99887 76655", status: "active", createdAt: daysAgo(45), orderCount: 1, totalSpentPaise: 107820, lastOrderAt: daysAgo(2), tags: ["new"] },
  { id: "cust_003", name: "Ritu Kapoor", email: "ritu@example.com", phone: "+91 97755 66443", status: "active", createdAt: daysAgo(30), orderCount: 1, totalSpentPaise: 154800, lastOrderAt: daysAgo(3), tags: [] },
  { id: "cust_004", name: "Deepika Singh", email: "deepika@example.com", phone: "+91 93322 11009", status: "active", createdAt: daysAgo(20), orderCount: 1, totalSpentPaise: 299900, lastOrderAt: daysAgo(4), tags: ["high-value"] },
  { id: "cust_005", name: "Sunita Rao", email: "sunita@example.com", phone: "+91 90011 22334", status: "active", createdAt: daysAgo(50), orderCount: 1, totalSpentPaise: 0, lastOrderAt: daysAgo(5), tags: ["cancelled"] },
  { id: "cust_006", name: "Kavita Patel", email: "kavita@example.com", phone: "+91 91122 33445", status: "active", createdAt: daysAgo(40), orderCount: 1, totalSpentPaise: 134730, lastOrderAt: daysAgo(10), tags: [] },
  { id: "cust_007", name: "Nisha Verma", email: "nisha@example.com", phone: "+91 88776 65544", status: "active", createdAt: daysAgo(35), orderCount: 1, totalSpentPaise: 0, lastOrderAt: daysAgo(12), tags: ["refunded"] },
  { id: "cust_008", name: "Meena Iyer", email: "meena@example.com", phone: "+91 86655 44332", status: "active", createdAt: daysAgo(25), orderCount: 0, totalSpentPaise: 0, tags: ["no-orders"] },
  { id: "cust_009", name: "Pooja Gupta", email: "pooja@example.com", phone: "+91 84433 22110", status: "suspended", createdAt: daysAgo(90), orderCount: 3, totalSpentPaise: 589700, lastOrderAt: daysAgo(30), tags: ["repeat", "suspended"] },
];

export function getCustomerById(id: string): DemoCustomer | null {
  return seedCustomers.find((c) => c.id === id) ?? null;
}
