"use client";

import { useActionState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { createCoupon, type CouponFormState } from "./_actions";

export default function NewCouponPage() {
  const [state, action, pending] = useActionState<CouponFormState, FormData>(createCoupon, null);

  return (
    <div className="space-y-6">
      <PageHeader title="New coupon" back={{ href: "/admin/coupons/", label: "Coupons" }} />

      <form action={action} className="max-w-lg space-y-5">
        {state && "error" in state ? (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="code" className="block text-sm font-medium text-ink">Code <span className="text-danger">*</span></label>
          <input id="code" name="code" required disabled={pending} placeholder="e.g. WELCOME10" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base font-mono text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          <p className="text-xs text-ink-subtle">Uppercase letters, numbers, hyphens and underscores.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="type" className="block text-sm font-medium text-ink">Type <span className="text-danger">*</span></label>
            <select id="type" name="type" required disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50">
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="value" className="block text-sm font-medium text-ink">Value <span className="text-danger">*</span></label>
            <input id="value" name="value" type="number" min="1" max="100" required disabled={pending} placeholder="e.g. 10" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="minOrderPaise" className="block text-sm font-medium text-ink">Minimum order (paise)</label>
          <input id="minOrderPaise" name="minOrderPaise" type="number" min="0" defaultValue="0" disabled={pending} placeholder="0 = no minimum" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="usageLimit" className="block text-sm font-medium text-ink">Total usage limit</label>
            <input id="usageLimit" name="usageLimit" type="number" min="1" disabled={pending} placeholder="Leave empty for unlimited" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="perCustomerLimit" className="block text-sm font-medium text-ink">Per-customer limit</label>
            <input id="perCustomerLimit" name="perCustomerLimit" type="number" min="1" disabled={pending} placeholder="Leave empty for unlimited" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="expiresAt" className="block text-sm font-medium text-ink">Expiry date</label>
          <input id="expiresAt" name="expiresAt" type="date" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium text-ink">Status</label>
          <select id="status" name="status" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50">
            <option value="inactive">Inactive (save for later)</option>
            <option value="active">Active (live immediately)</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
            {pending ? "Creating…" : "Create coupon"}
          </button>
          <a href="/admin/coupons/" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
