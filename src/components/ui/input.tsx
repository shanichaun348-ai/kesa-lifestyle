import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * 44px tall, hairline border, brand focus ring. `text-base` on mobile prevents
 * iOS Safari from zooming the page when the field is focused.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink",
        "transition-[border-color,box-shadow] duration-150 outline-none",
        "placeholder:text-ink-subtle",
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
        "aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
