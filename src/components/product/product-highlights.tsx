import { FeatherIcon, GemIcon, GiftIcon, HandIcon, LeafIcon, ShieldCheckIcon, SparklesIcon, StarIcon } from "lucide-react";

import { highlightIcons, type HighlightIconKey } from "@/modules/catalog/pdp";

const ICONS: Record<HighlightIconKey, typeof GemIcon> = {
  gem: GemIcon,
  sparkles: SparklesIcon,
  feather: FeatherIcon,
  gift: GiftIcon,
  shield: ShieldCheckIcon,
  leaf: LeafIcon,
  hand: HandIcon,
  star: StarIcon,
};

/** Up to four product highlights as gold-outlined icon tiles with two-line labels. */
export function ProductHighlights({ highlights }: { highlights: readonly string[] }) {
  const tiles = highlightIcons(highlights);
  if (tiles.length < 2) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4" aria-label="Highlights">
      {tiles.map((t) => {
        const Icon = ICONS[t.icon];
        return (
          <li key={t.text} className="flex flex-col items-center gap-2.5 text-center">
            <span className="lux-hairline inline-flex size-13 items-center justify-center rounded-full bg-surface/40 text-highlight">
              <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="text-xs leading-snug text-ink sm:text-[13px]">
              {t.lines[0]}
              {t.lines[1] ? (
                <>
                  <br />
                  {t.lines[1]}
                </>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
