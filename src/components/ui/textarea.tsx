import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full rounded-sm border border-line-strong bg-surface px-3.5 py-3 text-base text-ink",
        "transition-[border-color,box-shadow] duration-150 outline-none",
        "placeholder:text-ink-subtle",
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
        "aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
