import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<Variant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-brand/10 text-brand border-brand/20",
  neutral: "bg-surface-muted text-ink-muted border-line",
};

type Props = {
  label: string;
  variant?: Variant;
  className?: string;
};

export function StatusBadge({ label, variant = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

// Helpers for common status mappings

export function orderStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    pending: { label: "Pending", variant: "warning" },
    confirmed: { label: "Confirmed", variant: "info" },
    processing: { label: "Processing", variant: "info" },
    shipped: { label: "Shipped", variant: "info" },
    delivered: { label: "Delivered", variant: "success" },
    cancelled: { label: "Cancelled", variant: "danger" },
    refunded: { label: "Refunded", variant: "neutral" },
    // Live Supabase order statuses
    CREATED: { label: "Awaiting payment", variant: "warning" },
    PAYMENT_PENDING: { label: "Payment pending", variant: "warning" },
    PAID: { label: "Paid — to process", variant: "info" },
    PAYMENT_FAILED: { label: "Payment failed", variant: "danger" },
    CANCELLED: { label: "Cancelled", variant: "danger" },
    PROCESSING: { label: "Processing", variant: "info" },
    SHIPPED: { label: "Shipped", variant: "info" },
    DELIVERED: { label: "Delivered", variant: "success" },
    REFUNDED: { label: "Refunded", variant: "neutral" },
  };
  const entry = map[status] ?? { label: status, variant: "neutral" as Variant };
  return <StatusBadge label={entry.label} variant={entry.variant} />;
}

export function paymentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    pending: { label: "Pending", variant: "warning" },
    paid: { label: "Paid", variant: "success" },
    failed: { label: "Failed", variant: "danger" },
    cancelled: { label: "Cancelled", variant: "danger" },
    refunded: { label: "Refunded", variant: "neutral" },
    partially_refunded: { label: "Partial Refund", variant: "warning" },
  };
  const entry = map[status] ?? { label: status, variant: "neutral" as Variant };
  return <StatusBadge label={entry.label} variant={entry.variant} />;
}

export function productStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    active: { label: "Active", variant: "success" },
    draft: { label: "Draft", variant: "warning" },
    archived: { label: "Archived", variant: "neutral" },
  };
  const entry = map[status] ?? { label: status, variant: "neutral" as Variant };
  return <StatusBadge label={entry.label} variant={entry.variant} />;
}

export function couponStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "warning" },
    expired: { label: "Expired", variant: "neutral" },
  };
  const entry = map[status] ?? { label: status, variant: "neutral" as Variant };
  return <StatusBadge label={entry.label} variant={entry.variant} />;
}
