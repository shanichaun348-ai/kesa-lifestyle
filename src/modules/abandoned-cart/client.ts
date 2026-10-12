import type { CartSyncInput } from "./types";

/** Send the bag (and, when known, who it belongs to) to the server. Fire-and-forget; never throws. */
export async function postCartSync(input: CartSyncInput): Promise<void> {
  try {
    await fetch("/api/cart/sync/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    /* a missed sync only means a missed reminder */
  }
}
