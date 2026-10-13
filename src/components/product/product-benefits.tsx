import { BadgeCheckIcon, RefreshCwIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";

import { benefitLines } from "@/modules/catalog/pdp";
import type { ReturnPolicy } from "@/modules/catalog/types";

const ICONS = { shipping: TruckIcon, returns: RefreshCwIcon, payment: ShieldCheckIcon, quality: BadgeCheckIcon } as const;

/** Four store promises under the purchase controls, from the real policies. */
export function ProductBenefits({ returnPolicy }: { returnPolicy: ReturnPolicy }) {
  return (
    <ul className="lux-surface grid grid-cols-2 divide-x divide-y divide-line rounded-md sm:grid-cols-4 sm:divide-y-0" aria-label="Store promises">
      {benefitLines(returnPolicy).map((b) => {
        const Icon = ICONS[b.key];
        return (
          <li key={b.key} className="flex flex-col gap-1.5 p-3.5 sm:p-4">
            <Icon className="size-5 text-highlight" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{b.title}</p>
            <p className="text-xs leading-relaxed text-ink-muted">{b.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
