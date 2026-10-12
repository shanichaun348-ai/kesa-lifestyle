import type { ImageRef } from "@/modules/catalog/types";

export type ReturnKind = "return" | "exchange";

export type ReturnStatus = "requested" | "approved" | "rejected" | "received" | "refunded" | "exchanged" | "cancelled";

/** Statuses that still need something to happen; one per order at a time. */
export const OPEN_RETURN_STATUSES: ReadonlySet<ReturnStatus> = new Set(["requested", "approved", "received"]);

export type ReturnReason = "wrong_size" | "damaged" | "not_as_pictured" | "changed_mind" | "other";

export const RETURN_REASONS: Record<ReturnReason, string> = {
  wrong_size: "Wrong size or fit",
  damaged: "Damaged or defective",
  not_as_pictured: "Not as pictured",
  changed_mind: "Changed my mind",
  other: "Something else",
};

export const RETURN_WINDOW_DAYS = 7;

export type ReturnItem = {
  sku: string;
  productName: string;
  quantity: number;
  reason: ReturnReason;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  customerEmail: string;
  profileId: string | null;
  kind: ReturnKind;
  items: ReturnItem[];
  details: string | null;
  photos: ImageRef[];
  status: ReturnStatus;
  /** Shown to the customer: pickup instructions, rejection reason. */
  adminNote: string | null;
  /** Staff only. */
  internalNote: string | null;
  refundPaise: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Not approved",
  received: "Received by us",
  refunded: "Refunded",
  exchanged: "Exchanged",
  cancelled: "Cancelled",
};

export function kindLabel(kind: ReturnKind): string {
  return kind === "exchange" ? "Exchange" : "Return";
}
