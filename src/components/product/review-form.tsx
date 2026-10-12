"use client";

import * as React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { trackReviewSubmit } from "@/modules/analytics/events";
import { prepareReviewPhotoUploads, REVIEW_FORM_IDLE, submitReviewAction, type ReviewFormState } from "@/modules/reviews/actions";
import { MAX_REVIEW_PHOTOS } from "@/modules/reviews/schemas";

type ReviewFormProps = {
  productSlug: string;
  productName: string;
  /** Signed-in customer's email; the field is locked to it. */
  sessionEmail?: string | null | undefined;
};

type Photo = { key: number; src: string; alt: string };
let nextKey = 1;

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * "Write a review" disclosure and form. Photos go straight from the browser
 * to Storage against server-issued signed URLs; the review itself is a server
 * action. Opens automatically when the URL carries `?review=1`.
 */
export function ReviewForm({ productSlug, productName, sessionEmail }: ReviewFormProps) {
  const params = useSearchParams();
  const [open, setOpen] = React.useState(params.get("review") === "1");
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(submitReviewAction, REVIEW_FORM_IDLE);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (state.status === "success") trackReviewSubmit(productSlug, rating);
    // Fire once per success state; rating is read from the submitted form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, MAX_REVIEW_PHOTOS - photos.length);
    if (files.length === 0) {
      setUploadError(`Up to ${MAX_REVIEW_PHOTOS} photos per review.`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const prep = await prepareReviewPhotoUploads(productSlug, files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
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
        added.push({ key: nextKey++, src: target.publicUrl, alt: `${productName} — customer photo` });
      }
      if (added.length > 0) setPhotos((p) => [...p, ...added]);
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-md border border-success/30 bg-success/5 p-5">
        <p className="text-base font-medium text-ink">{state.message}</p>
        {!state.published ? <p className="type-small mt-1 text-ink-muted">Reviews from verified buyers go live immediately; others are checked by our team first, usually within a day.</p> : null}
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const shown = hover || rating;

  return (
    <form action={action} className="rounded-md border border-line bg-surface p-5 sm:p-6" aria-labelledby="review-form-title">
      <h3 id="review-form-title" className="type-h3 mb-1">
        Review {productName}
      </h3>
      <p className="type-small mb-5 text-ink-muted">Bought this piece? Your review goes live straight away. Otherwise we take a quick look before publishing.</p>

      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="photosJson" value={JSON.stringify(photos.map(({ src, alt }) => ({ src, alt })))} />
      {/* Honeypot — hidden from people, filled by bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input id="review-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mb-4 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Your rating</legend>
          <div className="mt-2 flex items-center gap-3">
            <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"} — ${LABELS[n]}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  className="rounded-sm p-0.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <StarIcon className={cn("size-7 transition-colors", n <= shown ? "fill-highlight text-highlight" : "text-line-strong")} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
            </div>
            <span className="type-small min-w-20 text-ink-muted" aria-live="polite">
              {shown ? LABELS[shown] : "Tap a star"}
            </span>
          </div>
          {errors.rating ? <p className="type-small mt-1 text-danger">{errors.rating}</p> : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-name">Your name</Label>
            <Input id="review-name" name="name" required autoComplete="name" maxLength={80} aria-invalid={!!errors.name} disabled={pending} />
            {errors.name ? <p className="type-small text-danger">{errors.name}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-email">Email</Label>
            <Input
              id="review-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={sessionEmail ?? ""}
              readOnly={!!sessionEmail}
              aria-invalid={!!errors.email}
              disabled={pending}
              className={sessionEmail ? "opacity-70" : undefined}
            />
            <p className="type-small text-ink-subtle">{sessionEmail ? "Reviewing as your account." : "Not shown publicly — used to confirm your purchase."}</p>
            {errors.email ? <p className="type-small text-danger">{errors.email}</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="review-title">Title (optional)</Label>
          <Input id="review-title" name="title" maxLength={120} placeholder="Sum it up in a few words" disabled={pending} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="review-body">Your review</Label>
          <textarea
            id="review-body"
            name="body"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            placeholder="How does it look and feel? How was the fit, the finish, the packaging?"
            aria-invalid={!!errors.body}
            disabled={pending}
            className="w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-60"
          />
          {errors.body ? <p className="type-small text-danger">{errors.body}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} id="review-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={pending || uploading || photos.length >= MAX_REVIEW_PHOTOS} onChange={(e) => onFiles(e.target.files)} />
            <label
              htmlFor="review-photos"
              className={cn(
                "inline-flex h-10 cursor-pointer items-center rounded-md border border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-bg",
                (pending || uploading || photos.length >= MAX_REVIEW_PHOTOS) && "pointer-events-none opacity-50",
              )}
            >
              {uploading ? "Uploading…" : "Add photos"}
            </label>
            <span className="type-small text-ink-subtle">Optional · up to {MAX_REVIEW_PHOTOS}, JPEG/PNG/WebP, 5 MB each</span>
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
          <Button type="submit" disabled={pending || uploading || rating === 0} loading={pending}>
            Submit review
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
