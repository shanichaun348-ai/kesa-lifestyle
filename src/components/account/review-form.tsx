"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction } from "@/modules/account/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({ orderItemId, productName }: { orderItemId: string; productName: string }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setErrors({ rating: "Choose a star rating." });
      return;
    }
    setPending(true);
    setErrors({});
    const result = await submitReviewAction({ orderItemId, rating, title, body });
    setPending(false);
    if (result.ok) {
      toast.success("Thank you. Your review is awaiting moderation.");
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={pending} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
      <p className="text-sm font-medium text-ink">{productName}</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={cn("size-10 rounded-sm text-xl transition-colors", n <= rating ? "text-highlight" : "text-line-strong hover:text-highlight")}
          >
            ★
          </button>
        ))}
      </div>
      {errors.rating ? <p className="type-small text-danger">{errors.rating}</p> : null}
      <FieldGroup>
        <Field data-invalid={errors.title ? "true" : undefined}>
          <FieldLabel htmlFor={`rv-title-${orderItemId}`}>Title</FieldLabel>
          <Input id={`rv-title-${orderItemId}`} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          {errors.title ? <FieldError>{errors.title}</FieldError> : null}
        </Field>
        <Field data-invalid={errors.body ? "true" : undefined}>
          <FieldLabel htmlFor={`rv-body-${orderItemId}`}>Your review</FieldLabel>
          <Textarea id={`rv-body-${orderItemId}`} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
          {errors.body ? <FieldError>{errors.body}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="sm" loading={pending} className="self-start">
        Submit review
      </Button>
    </form>
  );
}
