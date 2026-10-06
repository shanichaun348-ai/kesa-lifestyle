/**
 * Catalog repository configuration — fail-closed production validation.
 *
 * Requirement: production must NEVER resolve to DemoCatalogRepository.
 * Missing Supabase config in production must throw, not silently fall back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catalog/supabase-repository", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  SupabaseCatalogRepository: vi.fn(function () { return { _repoType: "supabase" }; }),
}));

vi.mock("@/modules/catalog/demo-repository", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  DemoCatalogRepository: vi.fn(function () { return { _repoType: "demo" }; }),
}));

import { _resetCatalogRepositoryForTesting, getCatalogRepository } from "@/modules/catalog/queries";

beforeEach(() => {
  _resetCatalogRepositoryForTesting();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// PRODUCTION — fail-closed
// ---------------------------------------------------------------------------

describe("getCatalogRepository — production fail-closed", () => {
  it("throws when SUPABASE_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    expect(() => getCatalogRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getCatalogRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("throws when both Supabase variables are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getCatalogRepository()).toThrow("PRODUCTION STARTUP FAILURE");
  });

  it("returns SupabaseCatalogRepository when both Supabase vars are set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getCatalogRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("supabase");
  });

  it("NEVER returns DemoCatalogRepository in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getCatalogRepository() as unknown as { _repoType: string };
    expect(repo._repoType).not.toBe("demo");
  });

  it("NEVER returns DemoCatalogRepository in production — even after cache reset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getCatalogRepository()).toThrow();
    _resetCatalogRepositoryForTesting();
    expect(() => getCatalogRepository()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DEVELOPMENT — demo fallback allowed
// ---------------------------------------------------------------------------

describe("getCatalogRepository — development fallback", () => {
  it("returns DemoCatalogRepository when Supabase is not configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const repo = getCatalogRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("demo");
  });

  it("returns SupabaseCatalogRepository when Supabase is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "https://xyzabc.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-0000000000000000000");
    const repo = getCatalogRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("supabase");
  });

  it("returns DemoCatalogRepository in test environment when Supabase is not configured", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const repo = getCatalogRepository() as unknown as { _repoType: string };
    expect(repo._repoType).toBe("demo");
  });

  it("caches the repository after first resolution", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const r1 = getCatalogRepository();
    const r2 = getCatalogRepository();
    expect(r1).toBe(r2);
  });
});
