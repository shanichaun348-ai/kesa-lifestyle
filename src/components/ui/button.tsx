import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/*
 * Storefront button. Sizes are touch-first: `md` is 44px, `lg` is 52px.
 * `primary` is a `cta` fill (ink on the light theme, gold on the dark theme);
 * `secondary` a hairline; `ghost` text-only. On the light theme nothing here
 * is gold: the design has to hold without it (docs/09 §1).
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium",
    "transition-[background-color,border-color,color,opacity] duration-150 ease-(--ease-standard)",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        primary: "border-cta bg-cta text-cta-foreground hover:border-brand-hover hover:bg-brand-hover",
        secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-bg",
        ghost: "border-transparent bg-transparent text-ink hover:bg-surface-muted",
        link: "h-auto rounded-none border-transparent bg-transparent px-0 text-brand underline-offset-4 hover:underline",
        danger: "border-danger bg-transparent text-danger hover:bg-danger hover:text-bg",
      },
      size: {
        sm: "h-9 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element instead of a <button>, e.g. a Next.js Link. */
    asChild?: boolean;
    /** Shows a spinner, sets aria-busy and blocks interaction. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span className="sr-only">Loading</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
