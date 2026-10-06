"use client";

import * as React from "react";
import { useActionState } from "react";

import { updateProduct, type ProductEditState } from "./_actions";
import type { Product } from "@/modules/catalog/types";

type Variant = {
  sku: string;
  optionValue: string;
  pricePaise: number;
  compareAtPaise: number | null;
  stock: number;
  position: number;
};

type ImageEntry = { src: string; alt: string };

const INPUT_CLS = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const TEXTAREA_CLS = "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL_CLS = "block text-xs font-medium text-ink-subtle mb-1";
const SELECT_CLS = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const SECTION_CLS = "rounded-md border border-line bg-surface p-5 space-y-4";
const SECTION_TITLE_CLS = "text-sm font-medium text-ink";

export function ProductEditForm({ product }: { product: Product }) {
  const updateFn = updateProduct.bind(null, product.slug);
  const [state, action, pending] = useActionState<ProductEditState, FormData>(updateFn, null);

  // ── Basic fields ──────────────────────────────────────────────────────────────
  const [name, setName] = React.useState(product.name);
  const [shortDescription, setShortDescription] = React.useState(product.shortDescription);
  const [description, setDescription] = React.useState(product.description.join("\n"));
  const [gender, setGender] = React.useState(product.gender);
  const [primaryCategoryPath, setPrimaryCategoryPath] = React.useState(product.primaryCategoryPath);
  const [status, setStatus] = React.useState(product.status);
  const [care, setCare] = React.useState(product.care);
  const [highlights, setHighlights] = React.useState(product.highlights.join("\n"));
  const [hsnCode, setHsnCode] = React.useState(product.hsnCode);
  const [gstRateBp, setGstRateBp] = React.useState(String(product.gstRateBp));
  const [returnPolicy, setReturnPolicy] = React.useState(product.returnPolicy);

  // ── Images ────────────────────────────────────────────────────────────────────
  const [images, setImages] = React.useState<ImageEntry[]>(
    product.images.length > 0 ? product.images.map((i) => ({ src: i.src, alt: i.alt })) : [{ src: "", alt: "" }],
  );

  function addImage() {
    setImages((prev) => [...prev, { src: "", alt: "" }]);
  }
  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateImage(idx: number, field: keyof ImageEntry, value: string) {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, [field]: value } : img)));
  }

  // ── Variants ──────────────────────────────────────────────────────────────────
  const [variants, setVariants] = React.useState<Variant[]>(
    product.variants.length > 0
      ? product.variants.map((v, i) => ({
          sku: v.sku,
          optionValue: v.optionValue ?? "",
          pricePaise: v.pricePaise,
          compareAtPaise: v.compareAtPaise ?? null,
          stock: v.stock,
          position: i,
        }))
      : [{ sku: "", optionValue: "", pricePaise: 0, compareAtPaise: null, stock: 0, position: 0 }],
  );

  function addVariant() {
    setVariants((prev) => [...prev, { sku: "", optionValue: "", pricePaise: 0, compareAtPaise: null, stock: 0, position: prev.length }]);
  }
  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateVariant<K extends keyof Variant>(idx: number, field: K, value: Variant[K]) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  const imagesJson = JSON.stringify(images.filter((i) => i.src.trim()));
  const variantsJson = JSON.stringify(variants);

  return (
    <form action={action} className="space-y-6">
      {state && "error" in state && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>
      )}
      {state && "success" in state && (
        <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p>
      )}

      {/* Hidden JSON fields */}
      <input type="hidden" name="imagesJson" value={imagesJson} />
      <input type="hidden" name="variantsJson" value={variantsJson} />

      {/* Basic info */}
      <section className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>Basic information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-name" className={LABEL_CLS}>Product name <span className="text-danger">*</span></label>
            <input id="ep-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={pending} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Slug (URL, read-only)</label>
            <input value={product.slug} readOnly disabled className={INPUT_CLS + " opacity-50 cursor-not-allowed"} />
          </div>
        </div>

        <div>
          <label htmlFor="ep-short" className={LABEL_CLS}>Short description</label>
          <textarea id="ep-short" name="shortDescription" rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} disabled={pending} className={TEXTAREA_CLS} />
        </div>

        <div>
          <label htmlFor="ep-desc" className={LABEL_CLS}>Full description (one paragraph per line)</label>
          <textarea id="ep-desc" name="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} disabled={pending} className={TEXTAREA_CLS} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-gender" className={LABEL_CLS}>Gender</label>
            <select id="ep-gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} disabled={pending} className={SELECT_CLS}>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label htmlFor="ep-category" className={LABEL_CLS}>Primary category path</label>
            <input id="ep-category" name="primaryCategoryPath" value={primaryCategoryPath} onChange={(e) => setPrimaryCategoryPath(e.target.value)} disabled={pending} placeholder="e.g. women/earrings" className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-status" className={LABEL_CLS}>Status</label>
            <select id="ep-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={pending} className={SELECT_CLS}>
              <option value="draft">Draft (hidden from store)</option>
              <option value="active">Active (visible in store)</option>
            </select>
          </div>
          <div>
            <label htmlFor="ep-return" className={LABEL_CLS}>Return policy</label>
            <select id="ep-return" name="returnPolicy" value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value as typeof returnPolicy)} disabled={pending} className={SELECT_CLS}>
              <option value="returnable">Returnable</option>
              <option value="exchange_only">Exchange only</option>
              <option value="final_sale">Final sale (no return)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className={SECTION_CLS}>
        <div className="flex items-center justify-between">
          <h2 className={SECTION_TITLE_CLS}>Product images</h2>
          <button type="button" onClick={addImage} className="text-xs text-brand hover:underline">+ Add image</button>
        </div>
        <p className="text-xs text-ink-subtle -mt-2">Paste a public image URL. Upload to Supabase Storage or any image host first.</p>
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_200px_auto] items-end">
              <div>
                {idx === 0 && <span className={LABEL_CLS}>Image URL</span>}
                <input
                  value={img.src}
                  onChange={(e) => updateImage(idx, "src", e.target.value)}
                  disabled={pending}
                  placeholder="https://…"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                {idx === 0 && <span className={LABEL_CLS}>Alt text</span>}
                <input
                  value={img.alt}
                  onChange={(e) => updateImage(idx, "alt", e.target.value)}
                  disabled={pending}
                  placeholder="Description for screen readers"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                {idx === 0 && <span className="block text-xs mb-1 opacity-0">x</span>}
                {images.length > 1 && (
                  <button type="button" onClick={() => removeImage(idx)} className="h-10 px-3 text-sm text-danger hover:underline">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Preview first image if valid URL */}
        {images[0]?.src && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0].src} alt={images[0].alt} className="h-24 w-24 rounded-sm border border-line object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </section>

      {/* Variants */}
      <section className={SECTION_CLS}>
        <div className="flex items-center justify-between">
          <h2 className={SECTION_TITLE_CLS}>Variants &amp; inventory</h2>
          <button type="button" onClick={addVariant} className="text-xs text-brand hover:underline">+ Add variant</button>
        </div>
        <p className="text-xs text-ink-subtle -mt-2">Leave "Option" blank for single-variant products. Price in paise (₹1 = 100 paise).</p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">SKU *</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Option value</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Price (paise)</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Compare-at (paise)</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Stock</th>
                <th className="pb-2 text-xs font-medium text-ink-subtle" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {variants.map((v, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-3">
                    <input value={v.sku} onChange={(e) => updateVariant(idx, "sku", e.target.value)} disabled={pending} placeholder="SKU-001" className={INPUT_CLS + " font-mono"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input value={v.optionValue} onChange={(e) => updateVariant(idx, "optionValue", e.target.value)} disabled={pending} placeholder="e.g. S, M, 18 inch" className={INPUT_CLS} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" value={v.pricePaise} onChange={(e) => updateVariant(idx, "pricePaise", parseInt(e.target.value, 10) || 0)} disabled={pending} className={INPUT_CLS + " w-28"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" value={v.compareAtPaise ?? ""} onChange={(e) => updateVariant(idx, "compareAtPaise", e.target.value ? parseInt(e.target.value, 10) : null)} disabled={pending} placeholder="optional" className={INPUT_CLS + " w-28"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, "stock", parseInt(e.target.value, 10) || 0)} disabled={pending} className={INPUT_CLS + " w-24"} />
                  </td>
                  <td className="py-2 text-right">
                    {variants.length > 1 && (
                      <button type="button" onClick={() => removeVariant(idx)} className="text-sm text-danger hover:underline">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Details */}
      <section className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>Product details</h2>

        <div>
          <label htmlFor="ep-highlights" className={LABEL_CLS}>Highlights (one per line)</label>
          <textarea id="ep-highlights" name="highlights" rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} disabled={pending} placeholder={"925 sterling silver\nAnti-tarnish coating"} className={TEXTAREA_CLS} />
        </div>

        <div>
          <label htmlFor="ep-care" className={LABEL_CLS}>Care instructions</label>
          <textarea id="ep-care" name="care" rows={3} value={care} onChange={(e) => setCare(e.target.value)} disabled={pending} className={TEXTAREA_CLS} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-hsn" className={LABEL_CLS}>HSN code</label>
            <input id="ep-hsn" name="hsnCode" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} disabled={pending} placeholder="71171990" className={INPUT_CLS} />
          </div>
          <div>
            <label htmlFor="ep-gst" className={LABEL_CLS}>GST rate (basis points, 300 = 3%)</label>
            <input id="ep-gst" name="gstRateBp" type="number" min="0" value={gstRateBp} onChange={(e) => setGstRateBp(e.target.value)} disabled={pending} className={INPUT_CLS} />
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <a href={`/products/${product.slug}/`} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted">
          View in store ↗
        </a>
      </div>
    </form>
  );
}
