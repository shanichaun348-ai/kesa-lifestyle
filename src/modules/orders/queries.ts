import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase";

import { DemoOrderRepository } from "./demo-repository";
import type { OrderRepository } from "./repository";

let repository: OrderRepository | null = null;

export function getOrderRepository(): OrderRepository {
  if (repository) return repository;
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseOrderRepository } = require("./supabase-repository") as {
      SupabaseOrderRepository: new () => OrderRepository;
    };
    repository = new SupabaseOrderRepository();
  } else {
    repository = new DemoOrderRepository();
  }
  return repository;
}
