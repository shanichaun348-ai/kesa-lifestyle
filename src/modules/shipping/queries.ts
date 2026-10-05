import "server-only";

import { DemoShippingProvider } from "./demo-provider";
import type { ShippingProvider } from "./types";

let provider: ShippingProvider | null = null;

export function getShippingProvider(): ShippingProvider {
  // Phase 2: new ShiprocketProvider(env) when credentials are configured.
  provider ??= new DemoShippingProvider();
  return provider;
}
