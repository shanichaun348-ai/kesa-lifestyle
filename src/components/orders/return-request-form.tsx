"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { prepareReturnPhotoUploads, RETURN_FORM_IDLE, submitReturnAction, type ReturnFormState } from "@/modules/returns/actions";
import { allowedKindsFor, type ReturnEligibility } from "@/modules/returns/eligibility";
import { MAX_RETURN_PHOTOS } from "@/modules/returns/schemas";
import { RETURN_REASONS, type ReturnKind, type ReturnReason } from "@/modules/returns/types";

import { ReturnStatus, type ReturnAuth } from "./return-status";

type Props = {
  /** Public order reference, e.g. KL-1024. */
  reference: string;
  auth: ReturnAuth;
  eligibility: ReturnEligibility;
};

type Line = { quantity: number; reason: ReturnReason };
type Photo = { key: number; src: string; alt: string };
let nextKey = 1;

const FIELD = "h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-60";

/**
 * "Request a return or exchange": pick items with quantity and reason, choose
 * return vs exchange (limited by the items' policies), explain, attach photos.
 * The server re-derives eligibility and ownership before saving anything.
 */
export function ReturnRequestForm({ reference, auth, eligibility }: Props) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<ReturnFormState, FormData>(submitReturnAction, RETURN_FORM_IDLE);
  const [lines, setLines] = React.useState<Record<string, Line>>({});
  const [kind, setKind] = React.useState<ReturnKind>("return");
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  if (state.status === "success") {
    return (
      <div className="space-y-3">
        <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-ink">
          Thanks — we&rsquo;ve received your request and emailed you a confirmation. We review requests within 2 business days.
        </p>
        <ReturnStatus request={state.request} reference={reference} auth={auth} />
      </div>
    );
  }

  if (!eligibility.eligible) {
    return <p className="type-small text-ink-muted">{eligibility.reason}</p>;
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Request a return or exchange
        </Button>
        {eligibility.windowEndsAt ? (
          <span className="type-small text-ink-subtle">Available until {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(eligibility.windowEndsAt))}</span>
        ) : null}
      </div>
    );
  }

  const selectedSkus = Object.keys(lines);
  const allowedKinds = allowedKindsFor(eligibility.items, selectedSkus);
  const effectiveKind: ReturnKind = allowedKinds.includes(kind) ? kind : (allowedKinds[0] ?? "return");
  const itemsJson = JSON.stringify(selectedSkus.map((sku) => ({ sku, quantity: lines[sku]!.quantity, reason: lines[sku]!.reason })));
  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};

  function toggle(sku: string, on: boolean) {
    setLines((prev) => {
      const next = { ...prev };
      if (on) next[sku] = { quantity: 1, reason: "wrong_size" };
      else delete next[sku];
      return next;
    });
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, MAX_RETURN_PHOTOS - photos.length);
    if (files.length === 0) {
      setUploadError(`Up to ${MAX_RETURN_PHOTOS} photos per request.`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const prep = await prepareReturnPhotoUploads(reference, files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
      if (!prep.ok) {
        setUploadError(prep.error);
        return;
      }
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setUploadError("Photo uploads are not available right now.");
        return;
      }
      const added: Photo[] = [];
      for (const [i, target] of prep.targets.entries()) {
        const file = files[i]!;
        const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) {
          setUploadError(`Could not upload "${file.name}": ${error.message}`);
          break;
        }
        added.push({ key: nextKey++, src: target.publicUrl, alt: "Customer photo" });
      }
      if (added.length > 0) setPhotos((p) => [...p, ...added]);
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={action} className="space-y-5 rounded-md border border-line bg-surface p-4 sm:p-5" aria-labelledby="return-form-title">
      <div>
        <h3 id="return-form-title" className="type-h3">
          Request a return or exchange
        </h3>
        <p className="type-small mt-1 text-ink-muted">Pieces must be unworn, with tags and original packaging. Earrings and nose pins are exchange-only for hygiene reasons.</p>
      </div>

      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="authJson" value={JSON.stringify(auth)} />
      <input type="hidden" name="kind" value={effectiveKind} />
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="photosJson" value={JSON.stringify(photos.map(({ src, alt }) => ({ src, alt })))} />
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="return-website">Website</label>
        <input id="return-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Which pieces?</legend>
        {errors.items ? <p className="type-small text-danger">{errors.items}</p> : null}
        <ul className="divide-y divide-line border-y border-line">
          {eligibility.items.map((item) => {
            const line = lines[item.sku];
            const id = `ret-${item.sku}`;
            return (
              <li key={item.sku} className="py-3">
                <div className="flex items-start gap-3">
                  <input id={id} type="checkbox" checked={!!line} disabled={!item.eligible || pending} onChange={(e) => toggle(item.sku, e.target.checked)} className="mt-1 size-4 accent-ink" />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={id} className={cn("text-sm", item.eligible ? "text-ink" : "text-ink-subtle")}>
                      {item.productName}
                      <span className="type-small ml-1.5 text-ink-subtle">× {item.quantity}</span>
                    </label>
                    {item.reason ? <p className="type-small text-ink-subtle">{item.reason}</p> : null}
                    {line ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-[6rem_1fr]">
                        <div>
                          <Label htmlFor={`${id}-qty`} className="type-small">Quantity</Label>
                          <select id={`${id}-qty`} value={line.quantity} disabled={pending} onChange={(e) => setLines((p) => ({ ...p, [item.sku]: { ...line, quantity: Number(e.target.value) } }))} className={FIELD}>
                            {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`${id}-reason`} className="type-small">Reason</Label>
                          <select id={`${id}-reason`} value={line.reason} disabled={pending} onChange={(e) => setLines((p) => ({ ...p, [item.sku]: { ...line, reason: e.target.value as ReturnReason } }))} className={FIELD}>
                            {(Object.keys(RETURN_REASONS) as ReturnReason[]).map((r) => (
                              <option key={r} value={r}>{RETURN_REASONS[r]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-ink">What would you like?</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
          {(["return", "exchange"] as ReturnKind[]).map((k) => {
            const allowed = selectedSkus.length === 0 || allowedKinds.includes(k);
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={effectiveKind === k}
                disabled={!allowed || pending}
                onClick={() => setKind(k)}
                className={cn("h-10 rounded-sm border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40", effectiveKind === k ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink hover:border-ink")}
              >
                {k === "return" ? "Return for a refund" : "Exchange for another size or piece"}
              </button>
            );
          })}
        </div>
        {selectedSkus.length > 0 && allowedKinds.length === 1 && allowedKinds[0] === "exchange" ? <p className="type-small mt-1 text-ink-subtle">One of the selected pieces is exchange-only.</p> : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="return-details">Tell us more</Label>
        <textarea
          id="return-details"
          name="details"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          disabled={pending}
          placeholder={effectiveKind === "exchange" ? "Which size or piece would you like instead?" : "What went wrong, or what would you like us to know?"}
          aria-invalid={!!errors.details}
          className="w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-60"
        />
        {errors.details ? <p className="type-small text-danger">{errors.details}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} id="return-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={pending || uploading || photos.length >= MAX_RETURN_PHOTOS} onChange={(e) => onFiles(e.target.files)} />
          <label htmlFor="return-photos" className={cn("inline-flex h-10 cursor-pointer items-center rounded-md border border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-bg", (pending || uploading || photos.length >= MAX_RETURN_PHOTOS) && "pointer-events-none opacity-50")}>
            {uploading ? "Uploading…" : "Add photos"}
          </label>
          <span className="type-small text-ink-subtle">Helpful for damage · up to {MAX_RETURN_PHOTOS}, 5 MB each</span>
        </div>
        {uploadError ? <p className="type-small text-danger">{uploadError}</p> : null}
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Photos to attach">
            {photos.map((p) => (
              <li key={p.key} className="relative size-20 overflow-hidden rounded-sm border border-line bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" className="size-full object-cover" />
                <button type="button" onClick={() => setPhotos((list) => list.filter((x) => x.key !== p.key))} aria-label="Remove photo" className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-ink/80 text-xs text-bg">
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || uploading || selectedSkus.length === 0} loading={pending}>
          Submit request
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
