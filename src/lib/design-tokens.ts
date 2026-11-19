/**
 * Design token registry.
 *
 * The source of truth for values is `src/app/globals.css` (the `@theme` block).
 * This file mirrors the palette so the design-system showcase and tests can
 * enumerate tokens. Keep the two in sync; a unit test will compare them later.
 */

export type ColorToken = {
  /** CSS variable name without the `--color-` prefix, e.g. `ink`. */
  name: string;
  /** Light-theme value. */
  hex: string;
  /** Dark-theme value (`html[data-theme="dark"]`, ADR-34). */
  darkHex: string;
  role: string;
  /** Minimum contrast requirement this token is designed to meet on `bg`. */
  contrast?: "text" | "large-text" | "non-text" | "decorative";
};

export const colorTokens: ColorToken[] = [
  { name: "bg", hex: "#F5E1DC", darkHex: "#1E1416", role: "Page background (blush / deep rose-brown)" },
  { name: "surface", hex: "#FAEBE7", darkHex: "#2A1C1F", role: "Cards, sheets, inputs" },
  { name: "surface-muted", hex: "#EDD0C9", darkHex: "#342327", role: "Section bands, image placeholders" },
  { name: "ink", hex: "#2E1A1D", darkHex: "#F5E1DC", role: "Primary text (blush on dark)", contrast: "text" },
  { name: "ink-muted", hex: "#6B4A4F", darkHex: "#C9A6AC", role: "Secondary text", contrast: "text" },
  { name: "ink-subtle", hex: "#94737A", darkHex: "#9A7A80", role: "Captions, strikethrough prices (≥ 18px or decorative only)", contrast: "large-text" },
  { name: "line", hex: "#E3C3BC", darkHex: "#3E2A2E", role: "Hairline borders, dividers", contrast: "decorative" },
  { name: "line-strong", hex: "#CFA199", darkHex: "#5A3E44", role: "Input borders, focusable outlines", contrast: "non-text" },
  { name: "brand", hex: "#9C4A57", darkHex: "#E3A0AB", role: "Links, focus ring, active states (deep rose / soft rose)", contrast: "text" },
  { name: "brand-hover", hex: "#7A3442", darkHex: "#F0B8C1", role: "Hover state for brand", contrast: "text" },
  { name: "highlight", hex: "#A0525F", darkHex: "#E8B4BC", role: "Rating stars and tiny accents on light (rose); page and section headings on dark (soft rose).", contrast: "non-text" },
  { name: "cta", hex: "#9C4A57", darkHex: "#D48A96", role: "Primary button fill (rose / soft rose); its text uses cta-foreground", contrast: "non-text" },
  { name: "success", hex: "#2F6B4F", darkHex: "#7CBF9A", role: "In stock, success messages", contrast: "text" },
  { name: "warning", hex: "#745610", darkHex: "#E0B85A", role: "Low stock, caution", contrast: "text" },
  { name: "danger", hex: "#9B2C2C", darkHex: "#E58787", role: "Errors, destructive actions", contrast: "text" },
];

export const spacingScale = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

export const radiusTokens = [
  { name: "sm", px: 2, use: "Inputs, badges, image corners" },
  { name: "md", px: 4, use: "Buttons, cards" },
  { name: "lg", px: 8, use: "Toasts, popovers" },
  { name: "xl", px: 12, use: "Dialogs, bottom sheets" },
] as const;

export const shadowTokens = [
  { name: "header", use: "Sticky header hairline (no blur)" },
  { name: "float", use: "Floating controls such as quick-add on hover" },
  { name: "overlay", use: "Dialogs and drawers" },
] as const;

export const typeStyles = [
  { className: "type-display", label: "Display", use: "Home hero", spec: "Fraunces 400 · 40→64px · 1.08" },
  { className: "type-h1", label: "Heading 1", use: "Page titles", spec: "Fraunces 400 · 30→44px · 1.12" },
  { className: "type-h2", label: "Heading 2", use: "Section titles", spec: "Fraunces 400 · 24→32px · 1.2" },
  { className: "type-h3", label: "Heading 3", use: "Card groups, PDP sub-sections", spec: "Fraunces 500 · 20→24px · 1.3" },
  { className: "type-lead", label: "Lead", use: "Intro paragraphs", spec: "Inter 400 · 18px · 1.6" },
  { className: "type-body", label: "Body", use: "Body copy", spec: "Inter 400 · 16px · 1.6" },
  { className: "type-small", label: "Small", use: "Meta, card details", spec: "Inter 400 · 14px · 1.45" },
  { className: "type-eyebrow", label: "Eyebrow", use: "Section labels, badges", spec: "Inter 500 · 12px · uppercase · 0.08em" },
] as const;
