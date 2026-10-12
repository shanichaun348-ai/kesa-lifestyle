/**
 * Couriers the shop ships with, and how to turn a consignment number into a
 * public tracking link. Pure: no I/O, unit-tested.
 */

export const COURIERS = [
  { id: "delhivery", name: "Delhivery" },
  { id: "bluedart", name: "Blue Dart" },
  { id: "dtdc", name: "DTDC" },
  { id: "ecom", name: "Ecom Express" },
  { id: "xpressbees", name: "Xpressbees" },
  { id: "indiapost", name: "India Post" },
  { id: "shiprocket", name: "Shiprocket" },
  { id: "other", name: "Other" },
] as const;

export type CourierId = (typeof COURIERS)[number]["id"];

export function isCourierId(value: unknown): value is CourierId {
  return typeof value === "string" && COURIERS.some((c) => c.id === value);
}

export function courierName(id: string | null | undefined): string | null {
  if (!id) return null;
  return COURIERS.find((c) => c.id === id)?.name ?? id;
}

/**
 * Deep link to the courier's tracking page for one consignment, or null when
 * the courier has no reliable per-number URL (the UI then shows the number
 * only). Numbers are trimmed and URL-encoded.
 */
export function trackingUrlFor(courier: string, trackingNumber: string): string | null {
  const n = encodeURIComponent(trackingNumber.trim());
  if (!n) return null;
  switch (courier) {
    case "delhivery":
      return `https://www.delhivery.com/track/package/${n}`;
    case "bluedart":
      return `https://www.bluedart.com/tracking?trackingNumber=${n}`;
    case "ecom":
      return `https://ecomexpress.in/tracking/?awb_field=${n}`;
    case "xpressbees":
      return `https://www.xpressbees.com/shipment/tracking?awbNo=${n}`;
    case "shiprocket":
      return `https://shiprocket.co/tracking/${n}`;
    case "dtdc":
    case "indiapost":
    case "other":
    default:
      return null;
  }
}

/** Resolve the link to store: the admin's explicit URL if valid, else the derived one. */
export function resolveTrackingUrl(courier: string, trackingNumber: string, explicit: string | null | undefined): string | null {
  const given = explicit?.trim();
  if (given) {
    try {
      const u = new URL(given);
      if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    } catch {
      /* fall through to the derived link */
    }
  }
  return trackingUrlFor(courier, trackingNumber);
}
