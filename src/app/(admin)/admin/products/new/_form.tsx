"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import { MAX_SLUG_LENGTH, slugify } from "@/modules/catalog/slug";
import type { CategoryOption } from "../_category-options";
import { PlacementsFields } from "../_placements-fields";
import { createProduct, type ProductFormState } from "./_actions";

const INPUT = "h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "block text-sm text-ink";
const HINT = "text-xs text-ink-subtle";

export function NewProductForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(createProduct, null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [gender, setGender] = React.useState<"women" | "men" | "unisex">("women");
  const [categoryPath, setCategoryPath] = React.useState("");

  const visibleCategories = gender === "unisex" ? categories : categories.filter((c) => c.gender === gender);

  return (
    <form action={action} className="max-w-2xl space-y-6">
      {state?.error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>
      ) : null}

      <section className="rounded-md border border-line bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium text-ink">Basic information</h2>

        <div className="space-y-1.5">
          <label htmlFor="name" className={LABEL}>Product name <span className="text-danger">*</span></label>
          <input
            id="name" name="name" required disabled={pending} value={name}
            onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
            placeholder="e.g. Gold Tone Pearl Drop Earrings"
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className={LABEL}>URL slug <span className="text-danger">*</span></label>
          <input
            id="slug" name="slug" required disabled={pending} value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={MAX_SLUG_LENGTH}
            className={INPUT + " font-mono"}
          />
          <p className={HINT}>Fills in automatically from the name (a few words, at most {MAX_SLUG_LENGTH} characters). The product page will be /products/{slug || "…"}/</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shortDescription" className={LABEL}>Short description</label>
          <textarea id="shortDescription" name="shortDescription" rows={2} disabled={pending} placeholder="One or two sentences shown under the product name." className="w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="gender" className={LABEL}>For</label>
            <select id="gender" name="gender" disabled={pending} value={gender} onChange={(e) => { setGender(e.target.value as typeof gender); setCategoryPath(""); }} className={INPUT}>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="primaryCategoryPath" className={LABEL}>Category <span className="text-danger">*</span></label>
            <select id="primaryCategoryPath" name="primaryCategoryPath" required disabled={pending} value={categoryPath} onChange={(e) => setCategoryPath(e.target.value)} className={INPUT}>
              <option value="">Choose a category…</option>
              {visibleCategories.map((c) => <option key={c.path} value={c.path}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <PlacementsFields
        categories={categories}
        gender={gender}
        primaryPath={categoryPath}
        initialExtraPaths={[]}
        initialRails={{ newArrivals: false, bestsellers: false }}
        look={null}
        status="draft"
        disabled={pending}
      />

      <section className="rounded-md border border-line bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium text-ink">Price</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="priceRupees" className={LABEL}>Selling price (₹) <span className="text-danger">*</span></label>
            <input id="priceRupees" name="priceRupees" type="number" min="1" step="0.01" inputMode="decimal" required disabled={pending} placeholder="e.g. 999" className={INPUT} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="compareAtRupees" className={LABEL}>Original price (₹)</label>
            <input id="compareAtRupees" name="compareAtRupees" type="number" min="1" step="0.01" inputMode="decimal" disabled={pending} placeholder="Optional — shows as struck-through" className={INPUT} />
          </div>
        </div>
        <p className={HINT}>Prices include GST. Enter rupees — ₹999 is just 999.</p>
      </section>

      <section className="rounded-md border border-line bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium text-ink">Inventory</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="sku" className={LABEL}>SKU <span className="text-danger">*</span></label>
            <input id="sku" name="sku" required disabled={pending} placeholder="e.g. KL-NCK-0101" pattern="[A-Za-z0-9._-]{2,40}" onChange={(e) => { e.target.value = e.target.value.toUpperCase().replace(/\s+/g, "-"); }} className={INPUT + " font-mono"} />
            <p className={HINT}>Your internal product code. Letters, numbers, dots and dashes only — no spaces.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="stock" className={LABEL}>Stock quantity</label>
            <input id="stock" name="stock" type="number" min="0" defaultValue="0" disabled={pending} className={INPUT} />
          </div>
        </div>
        <p className={HINT}>Sizes or lengths can be added as extra variants on the next screen.</p>
      </section>

      <div className="rounded-md border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-ink-muted">
        The product is saved as a <strong className="text-ink">draft</strong>. On the next screen you add photos and details, then click <strong className="text-ink">Publish</strong> to make it visible in the store.
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save and continue"}
        </button>
        <Link href="/admin/products/" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted">
          Cancel
        </Link>
      </div>
    </form>
  );
}
