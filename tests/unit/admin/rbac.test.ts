import { describe, expect, it } from "vitest";

import { hasPermission, getPermissionsForRole, ROLE_LABELS } from "@/modules/admin/rbac";
import type { AdminRole } from "@/modules/admin/types";

describe("hasPermission", () => {
  it("owner has all permissions", () => {
    const ownerPermissions = getPermissionsForRole("owner");
    expect(ownerPermissions).toContain("admin:manage");
    expect(ownerPermissions).toContain("products:delete");
    expect(ownerPermissions).toContain("orders:refund");
    expect(ownerPermissions).toContain("customers:write");
  });

  it("support cannot write products or delete them", () => {
    expect(hasPermission("support", "products:write")).toBe(false);
    expect(hasPermission("support", "products:delete")).toBe(false);
    expect(hasPermission("support", "admin:manage")).toBe(false);
  });

  it("support can read orders and write to them", () => {
    expect(hasPermission("support", "orders:read")).toBe(true);
    expect(hasPermission("support", "orders:write")).toBe(true);
  });

  it("support cannot issue refunds", () => {
    expect(hasPermission("support", "orders:refund")).toBe(false);
  });

  it("content_editor cannot touch orders or customers", () => {
    expect(hasPermission("content_editor", "orders:read")).toBe(false);
    expect(hasPermission("content_editor", "customers:read")).toBe(false);
    expect(hasPermission("content_editor", "coupons:read")).toBe(false);
  });

  it("content_editor can read and write content and SEO", () => {
    expect(hasPermission("content_editor", "content:read")).toBe(true);
    expect(hasPermission("content_editor", "content:write")).toBe(true);
    expect(hasPermission("content_editor", "seo:read")).toBe(true);
    expect(hasPermission("content_editor", "seo:write")).toBe(true);
  });

  it("catalogue_manager can manage products and coupons but not admin:manage", () => {
    expect(hasPermission("catalogue_manager", "products:write")).toBe(true);
    expect(hasPermission("catalogue_manager", "products:delete")).toBe(true);
    expect(hasPermission("catalogue_manager", "coupons:write")).toBe(true);
    expect(hasPermission("catalogue_manager", "admin:manage")).toBe(false);
    expect(hasPermission("catalogue_manager", "orders:write")).toBe(false);
    expect(hasPermission("catalogue_manager", "orders:refund")).toBe(false);
  });

  it("every role can read products", () => {
    const roles: AdminRole[] = ["owner", "catalogue_manager", "support", "content_editor"];
    for (const role of roles) {
      expect(hasPermission(role, "products:read")).toBe(true);
    }
  });

  it("getPermissionsForRole returns a copy (mutations do not affect source)", () => {
    const perms = getPermissionsForRole("content_editor");
    const original = getPermissionsForRole("content_editor");
    perms.push("admin:manage" as never);
    expect(getPermissionsForRole("content_editor")).toEqual(original);
  });
});

describe("ROLE_LABELS", () => {
  it("has a label for every role", () => {
    const roles: AdminRole[] = ["owner", "catalogue_manager", "support", "content_editor"];
    for (const role of roles) {
      expect(typeof ROLE_LABELS[role]).toBe("string");
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });
});
