import { PackageOpenIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";

import { benefitLines } from "@/modules/catalog/pdp";
import type { ReturnPolicy } from "@/modules/catalog/types";

const ICONS = { shipping: TruckIcon, payment: ShieldCheckIcon, returns: PackageOpenIcon } as const;

/** Three store promises under the purchase controls, separated by hairlines. */
export function ProductBenefits({ returnPolicy }: { returnPolicy: ReturnPolicy }) {
  return (
    <ul className="grid grid-cols-3 divide-x divide-highlight/20" aria-label="Store promises">
      {benefitLines(returnPolicy).map((b) => {
        const Icon = ICONS[b.key];
        return (
          <li key={b.key} className="flex items-center gap-2.5 px-2 first:pl-0 last:pr-0 sm:gap-3 sm:px-4">
            <span className="lux-hairline inline-flex size-9 shrink-0 items-center justify-center rounded-full text-highlight sm:size-10">
              <Icon className="size-4 sm:size-[18px]" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-medium leading-tight text-ink sm:text-sm">{b.title}</span>
              <span className="text-[11px] leading-tight text-ink-muted sm:text-xs">{b.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
