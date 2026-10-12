import type { AdminRole } from "./types";

export type AdminPermission =
  | "products:read"
  | "products:write"
  | "products:delete"
  | "orders:read"
  | "orders:write"
  | "orders:refund"
  | "customers:read"
  | "customers:write"
  | "content:read"
  | "content:write"
  | "seo:read"
  | "seo:write"
  | "coupons:read"
  | "coupons:write"
  | "reviews:moderate"
  | "admin:manage";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: [
    "products:read",
    "products:write",
    "products:delete",
    "orders:read",
    "orders:write",
    "orders:refund",
    "customers:read",
    "customers:write",
    "content:read",
    "content:write",
    "seo:read",
    "seo:write",
    "coupons:read",
    "coupons:write",
    "reviews:moderate",
    "admin:manage",
  ],
  catalogue_manager: [
    "products:read",
    "products:write",
    "products:delete",
    "orders:read",
    "content:read",
    "content:write",
    "seo:read",
    "seo:write",
    "coupons:read",
    "coupons:write",
    "reviews:moderate",
  ],
  support: [
    "products:read",
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
    "coupons:read",
  ],
  content_editor: [
    "products:read",
    "content:read",
    "content:write",
    "seo:read",
    "seo:write",
    "reviews:moderate",
  ],
};

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissionsForRole(role: AdminRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  catalogue_manager: "Catalogue Manager",
  support: "Support",
  content_editor: "Content Editor",
};
