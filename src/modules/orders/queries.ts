import "server-only";

import { DemoOrderRepository } from "./demo-repository";
import { SupabaseOrderRepository } from "./supabase-repository";
import type { OrderRepository } from "./repository";

let _repository: OrderRepository | null = null;

/**
 * Reset the cached repository instance.
 * ONLY for use in tests — never call in application code.
 */
export function _resetRepositoryForTesting(): void {
  _repository = null;
}

/**
 * Return the active OrderRepository for this environment.
 *
 * Selection rules (evaluated in order):
 *   1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY both set → SupabaseOrderRepository.
 *   2. NODE_ENV === "production" without Supabase config → throw (fail closed).
 *   3. Otherwise (development / test) → DemoOrderRepository.
 *
 * Production must NEVER resolve to DemoOrderRepository.
 * See docs/PRODUCTION_CONFIGURATION.md.
 */
export function getOrderRepository(): OrderRepository {
  if (_repository) return _repository;

  const supabaseConfigured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (supabaseConfigured) {
    _repository = new SupabaseOrderRepository();
    return _repository;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PRODUCTION STARTUP FAILURE: ORDER REPOSITORY MISCONFIGURED.\n" +
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in production.\n" +
        "The application must never fall back to the in-memory DemoOrderRepository in production.\n" +
        "Set the missing variables and redeploy. See docs/PRODUCTION_CONFIGURATION.md",
    );
  }

  // Development / test only — the production guard above prevents reaching this line in prod.
  // DemoOrderRepository is imported statically but NEVER instantiated in production.
  _repository = new DemoOrderRepository();
  return _repository;
}
