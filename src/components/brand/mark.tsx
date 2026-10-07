/**
 * Kesa monogram: a serif-style "K" with a small gold jewel. Drawn with plain
 * SVG paths (no fonts) so it renders identically in the browser and inside
 * next/og's ImageResponse, which cannot load web fonts for icons.
 */
export const MARK_INK = "#1b1917";
export const MARK_PAPER = "#fbfaf7";
export const MARK_GOLD = "#9a7b3c";

type MarkProps = {
  size: number;
  /** Corner radius in viewBox units (0–64). iOS applies its own mask, so apple icons pass 0. */
  radius?: number;
};

export function KesaMark({ size, radius = 14 }: MarkProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx={radius} fill={MARK_INK} />
      {/* Stem and arms */}
      <path d="M22 15 V49" stroke={MARK_PAPER} strokeWidth="6.5" fill="none" />
      <path d="M22 35 L43 15" stroke={MARK_PAPER} strokeWidth="6" fill="none" />
      <path d="M27 31.5 L45.5 49" stroke={MARK_PAPER} strokeWidth="6" fill="none" />
      {/* Serifs */}
      <path d="M15.5 15 H28.5 M15.5 49 H28.5 M38 15 H48 M39 49 H50" stroke={MARK_PAPER} strokeWidth="3.4" fill="none" />
      {/* Jewel */}
      <path d="M51 36 L55.5 41.5 L51 47 L46.5 41.5 Z" fill={MARK_GOLD} />
    </svg>
  );
}
