"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { createProduct, type ProductFormState } from "./_actions";

export default function NewProductPage() {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(createProduct, null);

  return (
    <div className="space-y-6">
      <PageHeader title="New product" back={{ href: "/admin/products/", label: "Products" }} />

      <form action={action} className="max-w-2xl space-y-6">
        {state && "error" in state ? (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <section className="rounded-md border border-line bg-surface p-5 space-y-4">
          <h2 className="text-sm font-medium text-ink">Basic information</h2>

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm text-ink">Product name <span className="text-danger">*</span></label>
            <input id="name" name="name" required disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="block text-sm text-ink">Slug <span className="text-danger">*</span></label>
            <input id="slug" name="slug" required disabled={pending} placeholder="e.g. gold-hoop-earrings" pattern="[a-z0-9-]+" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base font-mono text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
            <p className="text-xs text-ink-subtle">Lowercase letters, numbers and hyphens. Cannot be changed after publishing.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shortDescription" className="block text-sm text-ink">Short description</label>
            <textarea id="shortDescription" name="shortDescription" rows={2} disabled={pending} className="w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="gender" className="block text-sm text-ink">Gender</label>
            <select id="gender" name="gender" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50">
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="primaryCategoryPath" className="block text-sm text-ink">Primary category path</label>
            <input id="primaryCategoryPath" name="primaryCategoryPath" disabled={pending} placeholder="e.g. women/earrings" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
          </div>
        </section>

        <section className="rounded-md border border-line bg-surface p-5 space-y-4">
          <h2 className="text-sm font-medium text-ink">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="pricePaise" className="block text-sm text-ink">Price (paise) <span className="text-danger">*</span></label>
              <input id="pricePaise" name="pricePaise" type="number" min="0" required disabled={pending} placeholder="e.g. 99900 = ₹999" className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="compareAtPaise" className="block text-sm text-ink">Compare-at price (paise)</label>
              <input id="compareAtPaise" name="compareAtPaise" type="number" min="0" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-line bg-surface p-5 space-y-4">
          <h2 className="text-sm font-medium text-ink">Inventory</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="sku" className="block text-sm text-ink">SKU</label>
              <input id="sku" name="sku" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base font-mono text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="stock" className="block text-sm text-ink">Stock quantity</label>
              <input id="stock" name="stock" type="number" min="0" defaultValue="0" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-line bg-surface p-5 space-y-4">
          <h2 className="text-sm font-medium text-ink">Publish</h2>
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm text-ink">Status</label>
            <select id="status" name="status" disabled={pending} className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50">
              <option value="draft">Draft</option>
              <option value="active">Active (visible in store)</option>
            </select>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
            {pending ? "Saving…" : "Save product"}
          </button>
          <Link href="/admin/products/" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
