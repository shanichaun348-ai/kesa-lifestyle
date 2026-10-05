import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Inline status message. Tinted hairline surfaces, never heavy fills.
 * `role="alert"` only for `danger`/`warning` (assertive); others use `status`.
 */
const alertVariants = cva(
  "relative grid w-full gap-1 rounded-md border px-4 py-3 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:mt-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info: "border-line bg-surface text-ink *:[svg]:text-ink-muted",
        success: "border-success/30 bg-success/5 text-ink *:[svg]:text-success",
        warning: "border-warning/30 bg-warning/5 text-ink *:[svg]:text-warning",
        danger: "border-danger/30 bg-danger/5 text-ink *:[svg]:text-danger",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

function Alert({
  className,
  variant = "info",
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const resolvedRole = role ?? (variant === "danger" || variant === "warning" ? "alert" : "status");
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={resolvedRole}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-ink-muted [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-3", className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("col-span-full mt-2", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
