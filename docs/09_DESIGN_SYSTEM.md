# 09 — Design System

Visual and interaction foundations for the storefront (and a utilitarian variant for admin). The goal is a premium fashion-brand feel: strong typography, generous whitespace, editorial imagery, minimal UI, subtle motion, mobile-first.

Implementation: CSS custom properties (tokens) in `src/styles/globals.css`, consumed by Tailwind v4 `@theme`, with shadcn/ui primitives restyled to these tokens.

---

## 1. Design principles

1. **Photography leads.** UI recedes; product and editorial imagery carry the page.
2. **Typographic hierarchy over decoration.** Two typefaces, strict scale, lots of air.
3. **One accent, used rarely.** Colour is mostly neutral; the accent appears in small doses (links, active states, a single CTA per view).
4. **Quiet motion.** Fades and short translates on reveal; no bouncing, parallax or auto-animating banners.
5. **Mobile is the primary canvas.** Designs start at 360px; desktop is an enhancement.
6. **Accessible by default.** 4.5:1 text contrast, visible focus, 44px targets, reduced-motion respected.

### Explicitly avoided
Gradients as decoration, metallic/gold foil effects, drop shadows on cards, carousels with arrows everywhere, countdown timers, stacked promo banners, pop-ups on entry, "sale" red everywhere, fake "only 2 left" urgency without inventory basis, skeuomorphic luxury cues.

---

## 2. Colour tokens

Neutral warm palette with a single deep accent. Values are proposals to be confirmed against brand assets.

| Token | Light | Role |
|---|---|---|
| `--color-bg` | `#FBFAF7` (warm off-white) | Page background |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-surface-muted` | `#F3F0EA` | Section bands, input backgrounds |
| `--color-ink` | `#1B1917` | Primary text |
| `--color-ink-muted` | `#5F5A54` | Secondary text |
| `--color-ink-subtle` | `#8C867F` | Hints, captions |
| `--color-line` | `#E6E1D9` | Borders, dividers |
| `--color-brand` | `#5B3A2E` (deep cocoa) | Links, focus rings, active states, primary-button hover. Named `brand` in CSS because shadcn reserves `accent` for hover surfaces. |
| `--color-brand-hover` | `#472C23` | |
| `--color-line-strong` | `#CFC8BD` | Input borders, swatch outlines (3:1 non-text contrast) |
| `--color-highlight` | `#9A7B3C` (deep brass) | Tiny accents only: rating stars, badge rule line. Never fills. Darkened from the original `#C9A66B`, which fails the 3:1 non-text contrast ratio on the page background. |
| `--color-success` | `#2F6B4F` | In stock, success |
| `--color-warning` | `#8A6A1F` | Low stock |
| `--color-danger` | `#9B2C2C` | Errors, destructive |
| `--color-overlay` | `rgb(27 25 23 / 0.5)` | Modal scrim |

### Dark theme (added 2026-10-09, ADR-34)

A user-selectable dark theme covers the whole site (storefront and admin). It is applied as `data-theme="dark"` on `<html>`; the token names stay the same and only their values change, so no component needs a second set of classes except where a block is drawn over photography or is already inverted. The choice is stored in `localStorage` (`kesa:theme`); with no choice the OS preference is used. A tiny inline script in the root layout applies it before first paint.

| Token | Dark | Role on dark |
|---|---|---|
| `--color-bg` | `#0F0E0C` | Page background (warm near-black) |
| `--color-surface` | `#171512` | Cards, sheets, inputs |
| `--color-surface-muted` | `#201D19` | Section bands |
| `--color-ink` | `#F1E8D6` | Body text (warm ivory) |
| `--color-ink-muted` | `#BFB39D` | Secondary text |
| `--color-ink-subtle` | `#8F8676` | Captions |
| `--color-line` / `--color-line-strong` | `#2B2824` / `#403A33` | Borders |
| `--color-brand` / `--color-brand-hover` | `#D4B36A` / `#E6C884` | Gold: links, focus rings, eyebrows, active states |
| `--color-highlight` | `#E0C27C` | Gold: `h1`, `h2` and display headings (set in `@layer base`) |
| `--color-cta` / `--color-cta-foreground` | `#D4B36A` / `#0F0E0C` | Primary button: gold fill, near-black text (ink / off-white on light) |
| `--color-success` / `warning` / `danger` | `#7CBF9A` / `#E0B85A` / `#E58787` | Status, lifted for contrast on dark |
| `--color-overlay` | `rgb(0 0 0 / 0.65)` | Modal scrim |

Gold is for text and hairlines, never for large fills other than the primary button. Body copy stays ivory for readability; gold body text was rejected as both garish and low-contrast at small sizes.

Theme-independent tokens: `--color-on-image` (`#FBFAF7`) and `--color-image-scrim` (`#1B1917`) are for controls drawn over photographs (carousel dots and arrows, video play icon). Photos do not change with the theme, so those controls must not either.

Logo: `kesa-logo-black.png` on light, `kesa-logo-gold.png` on dark (same alpha mask, swapped with the `dark:` variant). Product photography is shot on white, so product images sit on a white rectangle in dark mode; this is accepted for now and can be addressed with transparent-background product shots later.

Contrast: all text tokens on `bg`/`surface` meet 4.5:1; `ink-subtle` is for ≥ 18px text or non-essential captions only.

---

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| Display / headings | **Fraunces** (variable, serif) or **Cormorant Garamond** as alternative | Editorial, distinctive, free (OFL). Self-hosted, `font-display: swap`, subset Latin. The full Fraunces variable file (with optical-size and "wonk" axes) is well over 100 KB; ship a **static instance subset** (one or two weights, Latin only) to stay inside the 120 KB total font budget. |
| Body / UI | **Inter** (variable) | Highly legible at small sizes; tabular numerals for prices. |
| Mono (admin only) | system mono | SKUs, codes |

Type scale (mobile → desktop), line-height, tracking:

| Token | Mobile | Desktop | Use |
|---|---|---|---|
| `--text-display` | 40/44 | 64/68, tracking -0.02em | Home hero |
| `--text-h1` | 30/36 | 44/50 | Page titles |
| `--text-h2` | 24/30 | 32/38 | Section titles |
| `--text-h3` | 20/28 | 24/32 | Card groups, PDP sub-sections |
| `--text-lg` | 18/28 | 18/28 | Lead paragraphs |
| `--text-base` | 16/24 | 16/26 | Body |
| `--text-sm` | 14/20 | 14/20 | Meta, card details |
| `--text-xs` | 12/16, tracking 0.04em uppercase | Eyebrows, badges |

Rules: max line length 65–72ch for prose; headings in serif, everything else sans; prices in sans with `font-variant-numeric: tabular-nums`; no font weight above 600 in UI (serif display may use 500–600 only).

---

## 4. Spacing, layout, grid

- Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Container: max 1320px, gutters 16px (mobile), 24px (tablet), 40px (desktop).
- Grid: 12 columns desktop, 6 tablet, 4 mobile (CSS grid; product grids use `auto-fill, minmax(…)`).
- Product grid: 2 columns at 360px (gap 12px), 3 at ≥ 768px, 4 at ≥ 1200px. Editorial tiles may span 2 columns.
- Section rhythm: 48px mobile / 96px desktop vertical spacing between homepage sections.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.

---

## 5. Imagery

- Card ratio 3:4 (portrait); PDP gallery 4:5 on mobile, square thumbnails; editorial hero 4:5 mobile, 16:9 desktop (art-directed `<picture>` sources).
- Background: consistent warm neutral studio; no white-boxed cut-outs mixed with lifestyle in the same grid.
- Hover on desktop: crossfade to second image (on-model) — no zoom.
- Placeholders: blurhash/LQIP from `media_assets` to avoid flashes.
- Alt text mandatory; decorative images use empty alt.

---

## 6. Components (storefront)

All built on shadcn/ui + Radix where interaction is non-trivial; styled with tokens; server components where no interactivity is needed.

| Component | Behaviour | A11y |
|---|---|---|
| **Header** | Sticky, condenses on scroll; mega-menu on hover/focus (desktop); sheet menu (mobile) | `nav` landmarks, Escape closes, focus trapped in sheet |
| **AnnouncementBar** | Single line, dismiss persisted 7 days | `role="region" aria-label` |
| **ProductCard** | Image (hover swap), name, price + compare-at, badge, wishlist toggle, quick-add for single-variant products | The link wraps image + name only; wishlist and quick-add are **sibling** buttons positioned over the card (interactive elements inside an `<a>` are invalid HTML and confuse screen readers) |
| **ProductGrid** | Responsive, "Load more" is an `<a href="?page=N">` enhanced by JS | After load-more, focus moves to the first new card; `aria-live` announces "24 more products loaded" |
| **Lightbox** | Tap on gallery image opens full-screen zoomable view (pinch + double-tap) | Dialog semantics, Escape/back closes, focus returns to gallery |
| **FilterPanel** | Desktop sidebar / mobile bottom sheet; checkboxes with counts; price range; "Apply" on mobile; chips for active filters | Fieldsets/legends; results announced |
| **SortSelect** | Native `<select>` styled | Native |
| **ProductGallery** | Swipeable (scroll-snap), thumbnails, pinch-zoom via native, optional video slide | Keyboard arrows, slide labels |
| **VariantSelector** | Buttons for ≤ 8 values, select otherwise; disabled when unavailable | `role="radiogroup"` |
| **PriceBlock** | Price, compare-at, savings, "incl. taxes" | Screen-reader text for strikethrough |
| **AddToCart / StickyBar** | Primary CTA; mobile sticky bar appears after scrolling past main CTA | Not duplicating focus order (bar is `aria-hidden` when main CTA visible) |
| **DeliveryEstimate** | Pincode input, serviceability, ETA, COD availability | Inline validation |
| **Accordion** (details, care, shipping, FAQ) | Native `<details>` enhanced | Native |
| **Reviews** | Summary bars, list, write-review dialog | Dialog focus management |
| **CartDrawer** | Right sheet, quantity steppers, coupon, subtotal, checkout CTA | Sheet semantics |
| **Toast** | Bottom on mobile; non-blocking; 4s | `role="status"` |
| **Breadcrumbs** | Text links, "›" separator | `nav aria-label="Breadcrumb"` |
| **NewsletterForm** | Single field + button; success inline | Labelled input |
| **Badge** | Uppercase xs, hairline border, no fill | Text-only |
| **Button** | Variants: primary (ink fill), secondary (hairline), ghost; sizes md/lg; loading state | Disabled vs busy distinguished |
| **Input/Select/Checkbox/Radio** | 44px height, hairline border, focus ring accent | Labels always visible; errors linked via `aria-describedby` |
| **Skeleton** | Minimal, only for dynamic islands | `aria-busy` |
| **EmptyState** | Illustration-free: headline, text, one CTA | — |

---

## 7. Motion

- Durations: 150ms (micro), 250ms (component), 400ms (page/section reveal). Easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Reveal-on-scroll: opacity 0→1 + translateY 8px, once, only on editorial sections. Never on product grids (CLS and perceived slowness).
- Hover: image crossfade 250ms; button background 150ms.
- Sheets/dialogs: 250ms slide/fade.
- `prefers-reduced-motion: reduce` → all transitions ≤ 1ms, no reveal animations.
- No autoplay carousels; hero video is muted, inline, lazy, with a static poster on slow connections (`saveData` or `effectiveType` ≤ 3g).

---

## 8. Iconography and brand marks

- Icon set: Lucide (outline, 1.5px stroke), 20px default, 24px in header. Monochrome `ink`.
- Logo: wordmark SVG (inline for colour control), minimum height 20px; safe area 1× cap-height.
- Favicons: SVG + PNG set + apple-touch-icon; `theme-color` = `--color-bg`.

---

## 9. Accessibility checklist (enforced in CI via axe + lint)

- Semantic landmarks; skip link; one h1.
- Colour never the only indicator (stock, errors, active filters).
- Focus visible: 2px accent ring with 2px offset.
- Touch targets ≥ 44×44px; spacing ≥ 8px between.
- Forms: visible labels, inline errors, `autocomplete` attributes (name, email, tel, postal-code, address-line1).
- Motion/animation respects user preferences.
- Images: alt text; gallery slides labelled "Image 2 of 5".
- Dialogs/sheets: focus trap, Escape, return focus.
- Language `en-IN`; currency announced correctly (`₹1,299` → "1,299 rupees" via visually hidden text where needed).
- Manual screen-reader pass on Android TalkBack (Chrome) and iOS VoiceOver (Safari) for PLP, PDP, cart and checkout at each phase gate; automated axe checks do not catch focus-order or announcement problems.
- Error summary at the top of a form receives focus on submit failure and links to each invalid field.

---

## 10. Admin variant

- Same tokens, denser scale (`--text-sm` default), sans-only, neutral greys, status colours more saturated for scanning.
- Layout: left rail navigation, top bar with search and environment badge (Preview/Production), content max 1440px.
- Data tables, forms and dialogs from shadcn; no editorial components.
- Dark mode supported.

---

## 11. Token file sketch

```css
@theme {
  --color-bg: #FBFAF7;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F3F0EA;
  --color-ink: #1B1917;
  --color-ink-muted: #5F5A54;
  --color-ink-subtle: #8C867F;
  --color-line: #E6E1D9;
  --color-accent: #5B3A2E;
  --color-accent-hover: #472C23;
  --color-highlight: #C9A66B;
  --color-success: #2F6B4F;
  --color-warning: #8A6A1F;
  --color-danger: #9B2C2C;

  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "Inter", system-ui, sans-serif;

  --radius-sm: 2px;   /* inputs, badges, image corners */
  --radius-md: 4px;   /* buttons, cards (barely rounded) */
  --radius-lg: 8px;   /* toasts, popovers */
  --radius-xl: 12px;  /* dialogs, bottom sheets */

  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
```

Final palette, typeface licences and logo assets are confirmed with the brand owner before Phase 1 UI work (decision D12 covers assets).

---

## 12. Implementation (status: built, 2026-10-05)

The foundation is implemented in the Next.js 16 app. Everything below exists in code; nothing in this section is a plan.

### 12.1 Where things live

| Concern | Path |
|---|---|
| Tokens (colour, radius, shadows, motion, type utilities, container) | `src/app/globals.css` (`@theme` block, `@utility` rules) |
| Token registry for tooling and the showcase | `src/lib/design-tokens.ts` |
| Fonts (Fraunces 400/500 + Inter, self-hosted via `next/font`) | `src/app/layout.tsx` → CSS variables `--font-fraunces`, `--font-inter` |
| Primitives (vendored shadcn, restyled to tokens) | `src/components/ui/*` |
| Storefront components | `src/components/storefront/*` |
| Money formatting | `src/lib/money.ts` |
| Navigation types + sample menus | `src/lib/navigation.ts` |
| Showcase route (noindex) | `src/app/(storefront)/design-system/page.tsx` → `/design-system/` |
| Storefront chrome (announcement, header, footer) | `src/app/(storefront)/layout.tsx` |

Run `pnpm dev` and open `/design-system/`. `pnpm check` runs typegen, strict TypeScript and ESLint.

### 12.2 Token names in code

Colour utilities use the brand names directly: `bg-bg`, `bg-surface`, `bg-surface-muted`, `text-ink`, `text-ink-muted`, `text-ink-subtle`, `border-line`, `border-line-strong`, `text-brand`, `text-highlight`, `text-success`, `text-warning`, `text-danger`, `bg-overlay`. The shadcn semantic aliases (`bg-background`, `text-muted-foreground`, `border-input`, `ring-ring`…) are mapped onto the same values so vendored primitives work unchanged; new storefront code should prefer the brand names.

Type utilities: `type-display`, `type-h1`, `type-h2`, `type-h3`, `type-lead`, `type-body`, `type-small`, `type-eyebrow`, `type-price`. Sizes are fluid (`clamp()`), so there is no separate mobile and desktop class.

Layout: `container-page` (16 / 24 / 40px gutters, 1320px max). Shadows: `shadow-(--shadow-header)`, `shadow-(--shadow-float)`, `shadow-(--shadow-overlay)`. Motion: `ease-(--ease-standard)` with `duration-150/250/400`.

Default Tailwind palette classes (`text-red-500` etc.) remain available for now; storefront code must not use them. A lint rule enforcing this is planned for Phase 0 CI.

### 12.3 Component inventory

| # | Spec item | Implementation |
|---|---|---|
| 1 | Colour palette | `@theme` tokens; registry in `design-tokens.ts`; swatches on the showcase |
| 2–3 | Typography, hierarchy | `type-*` utilities; `SectionHeading`, `Breadcrumbs` composition |
| 4 | Spacing | Tailwind 4px scale; sections 48/96px; `container-page` |
| 5 | Radius | `rounded-sm/md/lg/xl` = 2/4/8/12px |
| 6 | Shadows | three tokens; cards have none |
| 7 | Buttons | `ui/button` — variants `primary, secondary, ghost, link, danger`; sizes `sm 36px, md 44px, lg 52px, icon, icon-sm`; `fullWidth`, `loading`, `asChild` |
| 8 | Inputs | `ui/input`, `ui/textarea`, `ui/select`, `ui/checkbox`, `ui/radio-group`, `ui/label`, `ui/field` (label, description, error wiring) |
| 9 | Cards | `ui/card` — `padding="none|sm|md"`, hairline, no shadow |
| 10 | Product cards | `storefront/product-card` (+ `price`, `rating-stars`, `wishlist-button`, `quick-add-button`, `product-grid`, `product-card-skeleton`) |
| 11 | Badges | `ui/badge` — `outline, solid, muted, success, warning, danger` |
| 12 | Navigation | `storefront/site-header` mega-menu (CSS hover/focus-within), `storefront/mobile-nav` sheet with accordions, `ui/accordion` |
| 13 | Header | `storefront/site-header`, `logo`, `announcement-bar` (7-day dismiss via `useSyncExternalStore`) |
| 14 | Footer | `storefront/site-footer` (native `<details>` on mobile), `newsletter-form` (stub submit, clearly labelled) |
| 15 | Modal | `ui/dialog` |
| 16 | Drawer | `ui/sheet` (left: menu, right: bag, bottom: filters); `storefront/cart-drawer` |
| 17 | Toast | `ui/sonner` (Sonner, bottom-centre, 4s, no theme dependency) |
| 18 | Tabs | `ui/tabs` — `line` (PDP) and segmented (account/admin) |
| 19 | Breadcrumbs | `storefront/breadcrumbs` over `ui/breadcrumb` |
| 20 | Pagination | `storefront/store-pagination` over `ui/pagination` (real `next/link` anchors, `aria-current`, disabled bounds) |
| 21 | Loading | `ui/spinner`, `storefront/loading-block`, button `loading` prop |
| 22 | Empty | `storefront/empty-state` over `ui/empty` |
| 23 | Error | `storefront/error-state` (`InlineError`, `PageError`), `ui/alert` (`info, success, warning, danger`), `(storefront)/not-found.tsx` |
| 24 | Skeleton | `ui/skeleton`, `storefront/product-card-skeleton` |

### 12.4 Accessibility decisions baked into the components

- Product card: the product name is the only link, stretched over the card with a `::after` overlay; wishlist, quick-add and sibling swatches are siblings above it (`z-10`). No interactive element is nested inside an anchor.
- Wishlist uses `aria-pressed`; bag button announces the item count in its label; rating uses `role="img"` with "4.5 out of 5 stars".
- Strikethrough prices carry visually hidden "Original price".
- Every control is ≥ 44px tall (`sm` buttons are 36px and reserved for dense admin/card contexts).
- Focus is a 2px brand outline with 2px offset, applied globally via `:focus-visible` and per component where `outline-none` is set.
- `prefers-reduced-motion` collapses all transitions and animations.
- Inputs use 16px text to prevent iOS zoom and carry `autocomplete`/`inputmode` hints.
- Footer columns and PDP details use native disclosure elements where possible.

### 12.5 Dependencies added for the foundation

`radix-ui` (unified primitives), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `tw-animate-css`. The shadcn runtime package and `next-themes` were removed; the few Tailwind variants shadcn's base CSS provided are declared in `globals.css`.

### 12.6 Known gaps (deliberate, tracked)

- Mega-menu has no Escape-to-close (CSS only). Add a small enhancement if testing shows it matters.
- Header does not shrink on scroll (kept static to avoid layout shift); revisit after real-device review.
- Lightbox for PDP gallery is specified but not built until the PDP exists (Phase 1).
- Logo is a typographic wordmark pending brand assets (D12).
- Dark theme (2026-10-09): product photos on white backgrounds show as white rectangles against dark surfaces; `theme-color` in the browser chrome follows the OS, not the in-page toggle.
