"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Label while the surrounding form's server action is running. */
  pendingLabel: string;
};

/**
 * Submit button for a plain `<form action={serverAction}>`: shows a spinner
 * and refuses a second click while the action runs. Must be rendered inside
 * the form it reports on.
 */
export function PendingButton({ pendingLabel, children, disabled, className, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} aria-busy={pending} className={className} {...rest}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-3.5" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
