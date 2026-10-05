/**
 * DEMO shipping provider. Estimates by Indian postal region (first digit of
 * the pincode) from a Mumbai origin. Not a real serviceability check; it
 * exists so the pincode checker UI and API contract can be built and tested.
 * Replace with the Shiprocket provider in Phase 2.
 */
import { PINCODE_RE, type DeliveryEstimate, type ShippingProvider } from "./types";

type Zone = { region: string; min: number; max: number; cod: boolean };

const ZONES: Record<string, Zone> = {
  "1": { region: "Northern India", min: 3, max: 5, cod: true },
  "2": { region: "Northern India", min: 3, max: 5, cod: true },
  "3": { region: "Western India", min: 2, max: 4, cod: true },
  "4": { region: "Western India", min: 1, max: 3, cod: true },
  "5": { region: "Southern India", min: 3, max: 5, cod: true },
  "6": { region: "Southern India", min: 3, max: 6, cod: true },
  "7": { region: "Eastern India", min: 4, max: 7, cod: false },
  "8": { region: "North-Eastern India", min: 5, max: 8, cod: false },
};

export class DemoShippingProvider implements ShippingProvider {
  async estimate(pincode: string): Promise<DeliveryEstimate> {
    if (!PINCODE_RE.test(pincode)) {
      return { pincode, serviceable: false, codAvailable: false, etaMinDays: 0, etaMaxDays: 0, message: "Enter a valid 6-digit pincode." };
    }
    const zone = ZONES[pincode[0] ?? ""];
    if (!zone) {
      return {
        pincode,
        serviceable: false,
        codAvailable: false,
        etaMinDays: 0,
        etaMaxDays: 0,
        message: "We do not deliver to this pincode yet.",
      };
    }
    return {
      pincode,
      serviceable: true,
      region: zone.region,
      codAvailable: zone.cod,
      etaMinDays: zone.min,
      etaMaxDays: zone.max,
    };
  }
}
