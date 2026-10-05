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
  hex: string;
  role: string;
  /** Minimum contrast requirement this token is designed to meet on `bg`. */
  contrast?: "text" | "large-text" | "non-text" | "decorative";
};

export const colorTokens: ColorToken[] = [
  { name: "bg", hex: "#FBFAF7", role: "Page background (warm off-white)" },
  { name: "surface", hex: "#FFFFFF", role: "Cards, sheets, inputs" },
  { name: "surface-muted", hex: "#F3F0EA", role: "Section bands, image placeholders" },
  { name: "ink", hex: "#1B1917", role: "Primary text, primary buttons", contrast: "text" },
  { name: "ink-muted", hex: "#5F5A54", role: "Secondary text", contrast: "text" },
  { name: "ink-subtle", hex: "#8C867F", role: "Captions, strikethrough prices (≥ 18px or decorative only)", contrast: "large-text" },
  { name: "line", hex: "#E6E1D9", role: "Hairline borders, dividers", contrast: "decorative" },
  { name: "line-strong", hex: "#CFC8BD", role: "Input borders, focusable outlines", contrast: "non-text" },
  { name: "brand", hex: "#5B3A2E", role: "Links, focus ring, active states (deep cocoa)", contrast: "text" },
  { name: "brand-hover", hex: "#472C23", role: "Hover state for brand", contrast: "text" },
  { name: "highlight", hex: "#9A7B3C", role: "Rating stars and tiny accents only (deep brass). Never a fill.", contrast: "non-text" },
  { name: "success", hex: "#2F6B4F", role: "In stock, success messages", contrast: "text" },
  { name: "warning", hex: "#8A6A1F", role: "Low stock, caution", contrast: "text" },
  { name: "danger", hex: "#9B2C2C", role: "Errors, destructive actions", contrast: "text" },
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
