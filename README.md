# Kesa Lifestyle

Premium fashion-jewellery D2C storefront. Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4.

## Status

Design foundation and a homepage built on demo content. No commerce functionality (catalogue, cart, checkout, payments) is implemented yet. The architecture and roadmap live in `docs/` (start with `docs/01_PROJECT_OVERVIEW.md`); the design system is documented in `docs/09_DESIGN_SYSTEM.md` and rendered live at `/design-system/`.

Demo data lives in `src/lib/demo/` and is clearly marked. Nothing in it is a real product, review or story; the homepage prints a notice to that effect until the catalogue module replaces it.

### Catalogue (listing architecture)

Category, collection and product routes are live over an in-memory demo repository:

- `/women/`, `/women/{category}/`, `/men/`, `/men/{category}/`, `/collections/`, `/collections/{slug}/`, `/products/{slug}/`, `/wishlist/`
- Domain and engine: `src/modules/catalog/` (`types`, `facets` = URL rules, `listing` = filter/sort/paginate/facet counts, `repository` = interface, `demo-repository`, `presenters`, `queries`)
- Seed: `src/lib/demo/seed-catalog.ts` (39 invented products, 12 categories, 7 collections)
- UI: `src/components/catalog/` (listing page, filter form, toolbar, chips), `src/components/product/`
- Wishlist: `src/modules/wishlist/` (store interface + localStorage implementation; server store arrives with accounts)
- SEO: `src/modules/seo/` (metadata and JSON-LD builders), `src/app/sitemap.ts`, `src/app/robots.ts`

Switching to Postgres means implementing `CatalogRepository` with Drizzle and changing `getCatalogRepository()`; routes and components stay as they are.

`pnpm test` runs the Vitest suite (`tests/unit/`).

## Getting started (any machine)

Prerequisites:

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS (see `.node-version`) | https://nodejs.org or `nvm install 22` |
| pnpm | 10 | `corepack enable && corepack prepare pnpm@10.30.1 --activate` (or `npm i -g pnpm@10`) |
| Git | any recent | https://git-scm.com |

Then:

```bash
git clone <your-remote-url> kesa-lifestyle   # or unzip the archive
cd kesa-lifestyle
pnpm install                                 # uses pnpm-lock.yaml for identical versions
cp .env.example .env.local                   # nothing secret is needed yet
pnpm dev                                     # http://localhost:3000
```

Verify the setup with `pnpm check` (typegen, strict TypeScript, ESLint, Vitest) and `pnpm build`.

Windows notes: the folder name may contain capitals (npm naming only matters at scaffold time). If PowerShell blocks `pnpm` scripts, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

Useful scripts:

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | Generates route types, then strict `tsc` |
| `pnpm lint` | ESLint over `src/` |
| `pnpm check` | typecheck + lint |

## Structure

```
docs/                     architecture, requirements, decisions
src/app/                  routes (root layout, (storefront) group, design-system showcase)
src/components/ui/        vendored shadcn primitives restyled to Kesa tokens
src/components/storefront/ brand components (header, footer, product card, …)
src/lib/                  utils, money, design-token registry, navigation types, sample data
public/placeholders/      neutral SVG placeholders used only by the showcase
```

## Conventions

- All money is integer paise; format only through `src/lib/money.ts`.
- Use brand token utilities (`text-ink`, `bg-surface`, `border-line`, `text-brand`…), never raw hex or default Tailwind palette colours in storefront code.
- Server Components by default; add `"use client"` only for genuinely interactive islands.
- Decisions that change architecture are recorded in `docs/00_ARCHITECTURE_DECISION_RECORD.md` before code.
