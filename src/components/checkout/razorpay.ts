"use client";

/**
 * Loads Razorpay's hosted checkout only when the customer reaches the
 * payment step (docs/12 §8) and wraps the callback API in a promise.
 * Card data never touches our code: the hosted modal handles it.
 */

export type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string | undefined; email?: string | undefined; contact?: string | undefined };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  retry?: { enabled: boolean };
};

type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: (response: { error: { description?: string; reason?: string } }) => void): void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  loading ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export class RazorpayDismissed extends Error {
  constructor() {
    super("Payment window closed before completing the payment.");
    this.name = "RazorpayDismissed";
  }
}

export class RazorpayFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RazorpayFailed";
  }
}

export async function openRazorpayCheckout(options: Omit<RazorpayOptions, "handler" | "modal">): Promise<RazorpaySuccess> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) throw new RazorpayFailed("Could not load the payment window. Check your connection and try again.");
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const instance = new window.Razorpay!({
      ...options,
      retry: { enabled: false },
      modal: { ondismiss: () => reject(new RazorpayDismissed()), confirm_close: true },
      handler: (response) => resolve(response),
    });
    instance.on("payment.failed", (response) => reject(new RazorpayFailed(response.error.description ?? "The payment did not go through.")));
    instance.open();
  });
}
