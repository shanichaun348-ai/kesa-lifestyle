/**
 * Order repository configuration â€” fail-closed production validation.
 *
 * Requirement: production must NEVER resolve to DemoOrderRepository.
 * Missing Supabase config in production must throw, not silently fall back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Both repositories mocked to avoid loading real Supabase / seed catalog.
// Regular functions (not arrow functions) are required for `new`-able constructors.
vi.mock("@/modules/orders/supabase-repository", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  SupabaseOrderRepository: vi.fn(function () { return { _repoType: "supabase" }; }),
}));

vi.mock("@/modules/orders/demo-repository", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  DemoOrderRepository: vi.fn(function () { return { _repoType: "demo" }; }),
}));

import { _resetRepositoryForTesting, getOrderRepository } from "@/modules/orders/queries";

beforeEach(() => {
  _resetRepositoryForTesting();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// PRODUCTION â€” fail-closed
// ---------------------------------------------------------------------------

describe("getOrderRepository â€” production fail-closed", () => {
  it("throws when SUPABASE_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    expect(() => getOrderRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getOrderRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("throws when both Supabase variables are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getOrderRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("error message names the required variables", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getOrderRepository()).toThrow("SUPABASE_URL");
    _resetRepositoryForTesting();
    expect(() => getOrderRepository()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("returns SupabaseOrderRepository when both Supabase vars are set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getOrderRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("supabase");
  });

  it("NEVER returns DemoOrderRepository in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getOrderRepository() as unknown as { _repoType: string };
    expect(repo._repoType).not.toBe("demo");
  });

  it("NEVER returns DemoOrderRepository in production â€” even after cache reset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    // First call throws â€” not demo.
    expect(() => getOrderRepository()).toThrow();
    _resetRepositoryForTesting();

    // Second call also throws â€” still not demo.
    expect(() => getOrderRepository()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DEVELOPMENT â€” demo fallback allowed
// ---------------------------------------------------------------------------

describe("getOrderRepository â€” development fallback", () => {
  it("returns DemoOrderRepository when Supabase is not configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const repo = getOrderRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("demo");
  });

  it("returns SupabaseOrderRepository when Supabase is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getOrderRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("supabase");
  });

  it("returns DemoOrderRepository in test environment when Supabase is not configured", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const repo = getOrderRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("demo");
  });

  it("caches the repository after first resolution", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const r1 = getOrderRepository();
    const r2 = getOrderRepository();
    expect(r1).toBe(r2); // same instance
  });
});
