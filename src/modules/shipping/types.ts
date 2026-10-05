export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export type DeliveryEstimate = {
  pincode: string;
  serviceable: boolean;
  /** Human-readable area, e.g. "Maharashtra" or "Western India" for coarse lookups. */
  region?: string | undefined;
  codAvailable: boolean;
  etaMinDays: number;
  etaMaxDays: number;
  /** Shown verbatim when not serviceable. */
  message?: string | undefined;
};

/**
 * Shipping provider contract (docs/03 §6, ADR-10). Shiprocket implements it
 * in Phase 2; the demo provider below is a coarse, clearly labelled stand-in.
 */
export interface ShippingProvider {
  estimate(pincode: string, options?: { weightGrams?: number | undefined; codRequested?: boolean | undefined }): Promise<DeliveryEstimate>;
}
