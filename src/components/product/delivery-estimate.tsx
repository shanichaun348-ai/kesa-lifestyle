"use client";

import * as React from "react";
import { TruckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DeliveryEstimate } from "@/modules/shipping/types";
import { PINCODE_RE } from "@/modules/shipping/types";

const STORAGE_KEY = "kesa:pincode";

function etaText(e: DeliveryEstimate): string {
  if (e.etaMinDays === e.etaMaxDays) return `${e.etaMinDays} days`;
  return `${e.etaMinDays}–${e.etaMaxDays} days`;
}

/**
 * Pincode checker. Calls `/api/delivery/estimate/`, remembers the last
 * pincode on this device, and never blocks the purchase flow.
 */
export function DeliveryEstimateChecker() {
  const [pincode, setPincode] = React.useState("");
  const [state, setState] = React.useState<{ status: "idle" | "loading" | "done" | "error"; estimate?: DeliveryEstimate; message?: string }>({ status: "idle" });
  const initialised = React.useRef(false);

  async function check(code: string) {
    if (!PINCODE_RE.test(code)) {
      setState({ status: "error", message: "Enter a valid 6-digit pincode." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/delivery/estimate/?pincode=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ status: "error", message: body.error ?? "Could not check this pincode." });
        return;
      }
      const estimate = (await res.json()) as DeliveryEstimate;
      setState({ status: "done", estimate });
      try {
        window.localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
    } catch {
      setState({ status: "error", message: "Could not check this pincode. Try again." });
    }
  }

  // Restore the last pincode once, after mount, from an external system (localStorage).
  React.useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved && PINCODE_RE.test(saved)) {
      // Deferred so the state update is not synchronous inside the effect body.
      const id = window.setTimeout(() => {
        setPincode(saved ?? "");
        void check(saved ?? "");
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, []);

  return (
    <section aria-labelledby="delivery-title" className="lux-hairline rounded-md bg-surface p-4">
      <h2 id="delivery-title" className="flex items-center gap-2 text-sm font-medium text-ink">
        <TruckIcon className="size-4 text-highlight" strokeWidth={1.5} aria-hidden="true" />
        Delivery estimate
      </h2>
      <form
        className="mt-3 flex gap-2 [&_input]:rounded-md [&_input:focus-visible]:border-highlight [&_input:focus-visible]:ring-highlight/25"
        onSubmit={(e) => {
          e.preventDefault();
          void check(pincode);
        }}
        noValidate
      >
        <Label htmlFor="delivery-pincode" className="sr-only">
          Pincode
        </Label>
        <Input
          id="delivery-pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-describedby="delivery-result"
          aria-invalid={state.status === "error" ? true : undefined}
        />
        <Button type="submit" variant="secondary" loading={state.status === "loading"} className="shrink-0">
          Check
        </Button>
      </form>
      <div id="delivery-result" className="type-small mt-3 min-h-5" aria-live="polite">
        {state.status === "error" ? <p className="text-danger">{state.message}</p> : null}
        {state.status === "done" && state.estimate ? (
          state.estimate.serviceable ? (
            <>
              <p className="text-ink">
                Delivery to {state.estimate.pincode}
                {state.estimate.region ? ` (${state.estimate.region})` : ""} in {etaText(state.estimate)}.
              </p>
              <p className="text-ink-muted">{state.estimate.codAvailable ? "Cash on delivery available." : "Prepaid only for this pincode."}</p>
            </>
          ) : (
            <p className="text-danger">{state.estimate.message ?? "Not serviceable."}</p>
          )
        ) : null}
        {state.status === "idle" ? <p className="text-ink-subtle">Free shipping over ₹999 across India. Dispatched in 1–2 business days.</p> : null}
      </div>
    </section>
  );
}
