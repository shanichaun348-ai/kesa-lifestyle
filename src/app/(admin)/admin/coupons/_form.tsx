"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import type { AdminCoupon } from "@/modules/coupons/admin";
import { isoToLocal } from "@/modules/coupons/form";

import { createCouponAction, updateCouponAction, type CouponFormState } from "./_actions";

const INPUT = "h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "block text-sm font-medium text-ink";
const HINT = "text-xs text-ink-subtle";

type Props = { coupon?: AdminCoupon | undefined };

/** Create/edit form for one discount code. Amounts are entered in rupees. */
export function CouponForm({ coupon }: Props) {
  const action = coupon ? updateCouponAction.bind(null, coupon.id) : createCouponAction;
  const [state, formAction, pending] = useActionState<CouponFormState, FormData>(action, null);
  const [type, setType] = React.useState<"percent" | "fixed">(coupon?.type ?? "percent");

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state && "error" in state ? <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      {state && "success" in state ? <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p> : null}

      <section className="space-y-4 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Code</h2>
        <div className="space-y-1.5">
          <label htmlFor="code" className={LABEL}>Code <span className="text-danger">*</span></label>
          <input id="code" name="code" required disabled={pending} defaultValue={coupon?.code ?? ""} placeholder="e.g. FIRST100" onChange={(e) => { e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ""); }} className={INPUT + " font-mono"} />
          <p className={HINT}>What the customer types at checkout. Letters, numbers, hyphens and underscores; saved in capitals.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className={LABEL}>Internal note</label>
          <input id="description" name="description" disabled={pending} defaultValue={coupon?.description ?? ""} placeholder="e.g. Launch offer, Instagram bio" className={INPUT} />
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Discount</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="type" className={LABEL}>Type</label>
            <select id="type" name="type" disabled={pending} value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")} className={INPUT}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off (₹)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="value" className={LABEL}>{type === "percent" ? "Percent off" : "Amount off (₹)"} <span className="text-danger">*</span></label>
            <input id="value" name="value" type="number" min="1" max={type === "percent" ? 100 : undefined} step={type === "percent" ? 1 : "0.01"} required disabled={pending} defaultValue={coupon ? (coupon.type === "percent" ? coupon.value : coupon.value / 100) : ""} placeholder={type === "percent" ? "10" : "200"} className={INPUT} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="minOrderRupees" className={LABEL}>Minimum order (₹)</label>
            <input id="minOrderRupees" name="minOrderRupees" type="number" min="0" step="1" disabled={pending} defaultValue={coupon ? coupon.minOrderPaise / 100 : 0} className={INPUT} />
            <p className={HINT}>On the merchandise subtotal, before shipping. 0 = no minimum.</p>
          </div>
          {type === "percent" ? (
            <div className="space-y-1.5">
              <label htmlFor="maxDiscountRupees" className={LABEL}>Maximum discount (₹)</label>
              <input id="maxDiscountRupees" name="maxDiscountRupees" type="number" min="1" step="1" disabled={pending} defaultValue={coupon?.maxDiscountPaise ? coupon.maxDiscountPaise / 100 : ""} placeholder="Blank = no cap" className={INPUT} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="usageLimit" className={LABEL}>Total uses</label>
            <input id="usageLimit" name="usageLimit" type="number" min="1" step="1" disabled={pending} defaultValue={coupon?.usageLimit ?? ""} placeholder="Blank = unlimited" className={INPUT} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="perCustomerLimit" className={LABEL}>Uses per customer</label>
            <input id="perCustomerLimit" name="perCustomerLimit" type="number" min="1" step="1" disabled={pending} defaultValue={coupon?.perCustomerLimit ?? ""} placeholder="Blank = unlimited" className={INPUT} />
            <p className={HINT}>Matched on the customer&rsquo;s email.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="startsAt" className={LABEL}>Starts</label>
            <input id="startsAt" name="startsAt" type="datetime-local" disabled={pending} defaultValue={isoToLocal(coupon?.startsAt ?? null)} className={INPUT} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endsAt" className={LABEL}>Ends</label>
            <input id="endsAt" name="endsAt" type="datetime-local" disabled={pending} defaultValue={isoToLocal(coupon?.endsAt ?? null)} className={INPUT} />
            <p className={HINT}>Times are IST. Blank = no end date.</p>
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" name="firstOrderOnly" disabled={pending} defaultChecked={coupon?.firstOrderOnly ?? false} className="mt-1 size-4 accent-ink" />
          <span>
            First order only
            <span className="block text-xs text-ink-subtle">Rejected for emails that already have a paid order.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" name="active" disabled={pending} defaultChecked={coupon?.active ?? true} className="mt-1 size-4 accent-ink" />
          <span>
            Active
            <span className="block text-xs text-ink-subtle">Untick to pause the code without deleting it.</span>
          </span>
        </label>
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
        </button>
        <Link href="/admin/coupons/" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted">
          {coupon ? "Back to coupons" : "Cancel"}
        </Link>
      </div>
    </form>
  );
}
