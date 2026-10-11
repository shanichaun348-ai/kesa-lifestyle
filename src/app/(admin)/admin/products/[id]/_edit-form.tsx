"use client";

import * as React from "react";
import { useActionState } from "react";

import type { Product } from "@/modules/catalog/types";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

import type { CategoryOption } from "../_category-options";
import { prepareProductUploads } from "../_upload-action";
import { updateProduct, type ProductEditState } from "./_actions";

type VariantRow = { key: number; sku: string; optionValue: string; priceRupees: string; compareAtRupees: string; stock: string };
type ImageRow = { key: number; src: string; alt: string };

const INPUT = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const TEXTAREA = "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50";
const LABEL = "mb-1 block text-xs font-medium text-ink-subtle";
const HINT = "text-xs text-ink-subtle";
const SECTION = "rounded-md border border-line bg-surface p-5 space-y-4";
const SECTION_TITLE = "text-sm font-medium text-ink";

const rupees = (paise: number | undefined | null) => (paise === undefined || paise === null ? "" : (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2));
const toPaise = (value: string) => (value.trim() === "" ? null : Math.round(Number(value) * 100));

let nextKey = 1;
const key = () => nextKey++;

export function ProductEditForm({ product, categories }: { product: Product; categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ProductEditState, FormData>(updateProduct.bind(null, product.slug), null);

  const [gender, setGender] = React.useState(product.gender);
  const [categoryPath, setCategoryPath] = React.useState(product.primaryCategoryPath);
  const [status, setStatus] = React.useState(product.status === "active" ? "active" : "draft");
  const [optionName, setOptionName] = React.useState(product.optionName ?? "Size");

  const [images, setImages] = React.useState<ImageRow[]>(() =>
    product.images.length > 0 ? product.images.map((i) => ({ key: key(), src: i.src, alt: i.alt })) : [{ key: key(), src: "", alt: "" }],
  );
  const [variants, setVariants] = React.useState<VariantRow[]>(() =>
    product.variants.length > 0
      ? product.variants.map((v) => ({ key: key(), sku: v.sku, optionValue: v.optionValue ?? "", priceRupees: rupees(v.pricePaise), compareAtRupees: rupees(v.compareAtPaise), stock: String(v.stock) }))
      : [{ key: key(), sku: "", optionValue: "", priceRupees: "", compareAtRupees: "", stock: "0" }],
  );

  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onFilesChosen(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const files = Array.from(list);
    try {
      const prep = await prepareProductUploads(product.slug, files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
      if (!prep.ok) {
        setUploadError(prep.error);
        return;
      }
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setUploadError("Uploads are not configured on this site (missing public Supabase keys).");
        return;
      }
      const added: ImageRow[] = [];
      for (const [i, target] of prep.targets.entries()) {
        const file = files[i]!;
        // The bytes go straight from the browser to Storage; the server only issued the signed URL.
        const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) {
          setUploadError(`Could not upload "${file.name}": ${error.message}`);
          break;
        }
        added.push({ key: key(), src: target.publicUrl, alt: product.name });
      }
      if (added.length > 0) {
        // Replace a lone empty row rather than leaving it above the uploads.
        setImages((rows) => (rows.length === 1 && !rows[0]!.src.trim() ? added : [...rows, ...added]));
      }
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const visibleCategories = gender === "unisex" ? categories : categories.filter((c) => c.gender === gender);
  const categoryKnown = categories.some((c) => c.path === categoryPath);

  const updateImage = (k: number, patch: Partial<ImageRow>) => setImages((rows) => rows.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const updateVariant = (k: number, patch: Partial<VariantRow>) => setVariants((rows) => rows.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  const imagesJson = JSON.stringify(images.filter((i) => i.src.trim()).map(({ src, alt }) => ({ src, alt })));
  const variantsJson = JSON.stringify(
    variants.map((v) => ({ sku: v.sku, optionValue: v.optionValue, pricePaise: toPaise(v.priceRupees) ?? 0, compareAtPaise: toPaise(v.compareAtRupees), stock: parseInt(v.stock, 10) || 0 })),
  );
  const previewSrc = images.find((i) => i.src.trim())?.src;

  return (
    <form action={action} className="space-y-6">
      {state && "error" in state ? <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      {state && "success" in state ? <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p> : null}

      <input type="hidden" name="imagesJson" value={imagesJson} />
      <input type="hidden" name="variantsJson" value={variantsJson} />

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Basic information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-name" className={LABEL}>Product name <span className="text-danger">*</span></label>
            <input id="ep-name" name="name" required defaultValue={product.name} disabled={pending} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>URL (cannot be changed)</label>
            <input value={`/products/${product.slug}/`} readOnly disabled className={INPUT + " cursor-not-allowed font-mono opacity-60"} />
          </div>
        </div>
        <div>
          <label htmlFor="ep-short" className={LABEL}>Short description</label>
          <textarea id="ep-short" name="shortDescription" rows={2} defaultValue={product.shortDescription} disabled={pending} className={TEXTAREA} />
        </div>
        <div>
          <label htmlFor="ep-desc" className={LABEL}>Full description (one paragraph per line)</label>
          <textarea id="ep-desc" name="description" rows={5} defaultValue={product.description.join("\n")} disabled={pending} className={TEXTAREA} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-gender" className={LABEL}>For</label>
            <select id="ep-gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} disabled={pending} className={INPUT}>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label htmlFor="ep-category" className={LABEL}>Category <span className="text-danger">*</span></label>
            <select id="ep-category" name="primaryCategoryPath" required value={categoryKnown ? categoryPath : ""} onChange={(e) => setCategoryPath(e.target.value)} disabled={pending} className={INPUT}>
              <option value="">Choose a category…</option>
              {visibleCategories.map((c) => <option key={c.path} value={c.path}>{c.label}</option>)}
            </select>
            {!categoryKnown ? <p className="mt-1 text-xs text-warning">Current value &ldquo;{categoryPath}&rdquo; is not a real category — pick one from the list.</p> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-status" className={LABEL}>Visibility</label>
            <select id="ep-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending} className={INPUT}>
              <option value="draft">Draft — hidden from customers</option>
              <option value="active">Published — visible in the store</option>
            </select>
          </div>
          <div>
            <label htmlFor="ep-return" className={LABEL}>Return policy</label>
            <select id="ep-return" name="returnPolicy" defaultValue={product.returnPolicy} disabled={pending} className={INPUT}>
              <option value="returnable">Returnable</option>
              <option value="exchange_only">Exchange only</option>
              <option value="final_sale">Final sale (no return)</option>
            </select>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={SECTION_TITLE}>Photos</h2>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              id="ep-upload"
              disabled={pending || uploading}
              onChange={(e) => onFilesChosen(e.target.files)}
            />
            <label
              htmlFor="ep-upload"
              className={cn(
                "inline-flex h-9 cursor-pointer items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:bg-brand-hover",
                (pending || uploading) && "pointer-events-none opacity-50",
              )}
            >
              {uploading ? "Uploading…" : "Upload photos"}
            </label>
            <button type="button" onClick={() => setImages((rows) => [...rows, { key: key(), src: "", alt: "" }])} className="text-xs text-brand hover:underline">+ Add by URL</button>
          </div>
        </div>
        <p className={HINT + " -mt-2"}>JPEG, PNG or WebP up to 8 MB each. Use portrait photos at 4:5 — 1200×1500 px (or 1600×2000) — with the piece in the middle; listings crop a little off the top and bottom. The first photo is the main one shown in listings — use &ldquo;Make main&rdquo; to reorder.</p>
        {uploadError ? <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{uploadError}</p> : null}
        <ul className="space-y-3">
          {images.map((img, idx) => (
            <li key={img.key} className="flex flex-col gap-3 rounded-md border border-line p-3 sm:flex-row sm:items-start">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-muted">
                {img.src.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.src} alt="" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                ) : (
                  <span className="flex size-full items-center justify-center text-[10px] text-ink-subtle">No image</span>
                )}
                {idx === 0 ? <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-bg">Main</span> : null}
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_220px]">
                <div>
                  <span className={LABEL}>Photo URL</span>
                  <input value={img.src} onChange={(e) => updateImage(img.key, { src: e.target.value })} disabled={pending} placeholder="https://…" className={INPUT} />
                </div>
                <div>
                  <span className={LABEL}>Describe the photo (accessibility &amp; SEO)</span>
                  <input value={img.alt} onChange={(e) => updateImage(img.key, { alt: e.target.value })} disabled={pending} placeholder="e.g. Gold hoop earrings on a model" className={INPUT} />
                </div>
              </div>
              <div className="flex shrink-0 gap-3 sm:flex-col sm:items-end sm:pt-5">
                {idx > 0 ? (
                  <button type="button" onClick={() => setImages((rows) => [img, ...rows.filter((r) => r.key !== img.key)])} className="text-sm text-brand hover:underline">Make main</button>
                ) : null}
                {images.length > 1 ? (
                  <button type="button" onClick={() => setImages((rows) => rows.filter((r) => r.key !== img.key))} className="text-sm text-danger hover:underline">Remove</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {!previewSrc ? <p className="text-xs text-warning">No photos yet — the product cannot be published until it has at least one.</p> : null}
      </section>

      <section className={SECTION}>
        <div className="flex items-center justify-between">
          <h2 className={SECTION_TITLE}>Price, variants &amp; stock</h2>
          <button type="button" onClick={() => setVariants((rows) => [...rows, { key: key(), sku: "", optionValue: "", priceRupees: rows[0]?.priceRupees ?? "", compareAtRupees: "", stock: "0" }])} className="text-xs text-brand hover:underline">+ Add size / length</button>
        </div>
        <p className={HINT + " -mt-2"}>One row for a simple product. Add rows for sizes or lengths — each needs its own SKU and an option value. Prices are in rupees and include GST.</p>
        {variants.length > 1 ? (
          <div className="max-w-xs">
            <label htmlFor="ep-option" className={LABEL}>Option type</label>
            <select id="ep-option" name="optionName" value={optionName} onChange={(e) => setOptionName(e.target.value as typeof optionName)} disabled={pending} className={INPUT}>
              <option value="Size">Size</option>
              <option value="Length">Length</option>
            </select>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">SKU *</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">{variants.length > 1 ? `${optionName} *` : "Option"}</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Price (₹) *</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">Original price (₹)</th>
                <th className="pb-2 pr-3 text-xs font-medium text-ink-subtle">In stock</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {variants.map((v) => (
                <tr key={v.key}>
                  <td className="py-2 pr-3">
                    <input value={v.sku} onChange={(e) => updateVariant(v.key, { sku: e.target.value.toUpperCase().replace(/\s+/g, "-") })} disabled={pending} placeholder="KL-NCK-0101" pattern="[A-Za-z0-9._-]{2,40}" className={INPUT + " min-w-36 font-mono"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input value={v.optionValue} onChange={(e) => updateVariant(v.key, { optionValue: e.target.value })} disabled={pending} placeholder={variants.length > 1 ? (optionName === "Length" ? "18 inch" : "M") : "—"} className={INPUT + " min-w-24"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="1" step="0.01" inputMode="decimal" value={v.priceRupees} onChange={(e) => updateVariant(v.key, { priceRupees: e.target.value })} disabled={pending} placeholder="999" className={INPUT + " w-28"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="1" step="0.01" inputMode="decimal" value={v.compareAtRupees} onChange={(e) => updateVariant(v.key, { compareAtRupees: e.target.value })} disabled={pending} placeholder="optional" className={INPUT + " w-28"} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" step="1" value={v.stock} onChange={(e) => updateVariant(v.key, { stock: e.target.value })} disabled={pending} className={INPUT + " w-24"} />
                  </td>
                  <td className="py-2 text-right">
                    {variants.length > 1 ? <button type="button" onClick={() => setVariants((rows) => rows.filter((r) => r.key !== v.key))} className="text-sm text-danger hover:underline">Remove</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Details</h2>
        <div>
          <label htmlFor="ep-highlights" className={LABEL}>Highlights (one per line)</label>
          <textarea id="ep-highlights" name="highlights" rows={4} defaultValue={product.highlights.join("\n")} disabled={pending} placeholder={"925 sterling silver\nAnti-tarnish coating"} className={TEXTAREA} />
        </div>
        <div>
          <label htmlFor="ep-care" className={LABEL}>Care instructions</label>
          <textarea id="ep-care" name="care" rows={3} defaultValue={product.care} disabled={pending} className={TEXTAREA} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-hsn" className={LABEL}>HSN code</label>
            <input id="ep-hsn" name="hsnCode" defaultValue={product.hsnCode} disabled={pending} placeholder="71171990" className={INPUT} />
          </div>
          <div>
            <label htmlFor="ep-gst" className={LABEL}>GST rate (basis points — 300 = 3%)</label>
            <input id="ep-gst" name="gstRateBp" type="number" min="0" step="1" defaultValue={product.gstRateBp} disabled={pending} className={INPUT} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-5 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Saving…" : status === "active" ? "Save & keep published" : "Save draft"}
        </button>
        {/* Drafts are not served at /products/, so they open through the admin-only preview route. Save first: the preview shows what is stored. */}
        <a
          href={product.status === "active" ? `/products/${product.slug}/` : `/preview/products/${product.slug}/`}
          target="_blank"
          rel="noopener"
          title={product.status === "active" ? "Open the live product page" : "Shows the saved draft as shoppers will see it once published"}
          className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-sm text-ink hover:bg-surface-muted"
        >
          {product.status === "active" ? "View in store ↗" : "Preview draft ↗"}
        </a>
      </div>
    </form>
  );
}
