# Testing Strategy — Home Form

Status: **Pass 8.5 — testing foundation + core utilities.**

## Framework

- **[Vitest](https://vitest.dev)** (`^5.0.0`, dev dependency) — picked for this stack because:
  - It is the unit-testing setup officially documented for this Next.js version
    (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`).
  - It is native to the project's TypeScript + ESM (`"type": "module"`) + pnpm setup.
  - It runs pure logic in plain `node` — no jsdom, no React Testing Library, no
    Playwright are needed for the current scope. Those are later checkpoints.
- Only **one** test dependency is installed: `vitest`. No Jest, no `@vitejs/plugin-react`,
  no `@testing-library/*`, no Playwright, no coverage tooling.

## Running tests

```bash
pnpm test           # single run (CI-friendly; `vitest run`)
pnpm test:watch     # watch mode
```

The configured include pattern is `tests/**/*.test.ts` (`vitest.config.ts`), so
any test placed under `tests/` with a `.test.ts` suffix is picked up automatically.

## Test directory structure

```text
tests/
  unit/
    i18n/       routing, localization helpers, translation dictionaries
    data/       product catalogue, content lookups, data integrity
    seo/        metadata builders, JSON-LD structured data
```

Future checkpoints will add sibling trees alongside `unit/`:

```text
tests/
  unit/       # pure logic (this pass)
  integration/  # Pass 9.5+ — database/schema
  server/      # Pass 10.5+ — server / data access
  auth/        # Pass 11.5 — authentication & authorization
  admin/       # Pass 12.5 — admin CRUD
  media/       # Pass 13.5 — media management
  commerce/    # Pass 14.5 — commerce / user workflows
  e2e/         # Pass 15.5 — Playwright end-to-end
```

The `@/*` path alias resolves to the repository root in tests, so tests import
the exact same specifiers the application uses (`@/lib/...`).

## What is currently tested

- **i18n routing** (`lib/i18n/routing.ts`): `isLocale`, `stripLocalePrefix`,
  `toCanonicalPath`, `getLocalizedPath`, plus the locale model constants
  (`locales`, `defaultLocale`, `prefixedLocales`) — Persian unprefixed, English
  `/en`-prefixed, idempotent re-prefixing, trailing slashes, nested/dynamic
  paths, empty-path edge cases. (`/fa → /` is handled by `proxy.ts`, not this
  module, and is covered in the E2E checkpoint.)
- **Localization helpers** (`lib/i18n/localized.ts`): `loc`, `pick` (both
  languages, plain-string passthrough, `en` fallback), `productKey`,
  `productName`, `productDescription`.
- **Translation dictionaries** (`lib/i18n/translations.ts`): en/fa key-set
  symmetry, no raw-key leaks (the `t()` fallback contract), core layout keys,
  `languageNames`.
- **Product data** (`lib/data/product-categories/`): `getProduct` lookups and
  catalogue integrity — unique ids/slugs, `id === slug` convention, products
  linked to their parent category, every product slug & category key translated
  in both languages.
- **Content lookups & data integrity** (`lib/data/`): `getFlagship`,
  `getFlagshipDetail`, `getProjectById`, `getAboutGalleryImages`,
  `getS34GalleryImages`, and integrity for `collections`, `designers`,
  `materials`, `flagships`, `projects`.
- **SEO metadata** (`lib/seo/metadata.ts`): `resolveLocale`, `trimDescription`,
  `buildLocalizedMetadata` (canonical URLs, hreflang + `x-default`, OpenGraph
  locale/alternate, absolute titles, `noindex`, JSON-LD passthrough).
- **Structured data** (`lib/seo/structuredData.ts`): `jsonLdScript` XSS escaping,
  `absoluteUrl`, and the Organization/WebSite/WebPage/CollectionPage/Product/
  CreativeWork/Person/BreadcrumbList builders (including "no fabricated
  commerce data" guarantees).

All tests are deterministic, fast, network-free and database-free.

## What is intentionally NOT tested yet

- **Visual/UI implementation** — CSS, Tailwind classes, layout, spacing, colors,
  typography, animations, hover effects, responsive breakpoints, image
  dimensions. The project is still undergoing visual development.
- **Components** — React component rendering requires jsdom + React Testing
  Library; not needed for the current pure-logic scope.
- **`proxy.ts` middleware** — `/fa` 308 redirects & internal rewrites need a
  Next request/response context; covered by the future E2E checkpoint.
- **Database** — Prisma/PostgreSQL are deliberately out of scope until later
  passes; no database, migration, or seed tests exist. Data remains static/local.
- **Anything network/API-dependent** — no live fetch, no external services.

## Planned progression

```text
Pass 8.5    Testing foundation + core utilities        ← current
Pass 9.5    Database/schema/integration tests
Pass 10.5   Server/data-access tests
Pass 11.5   Authentication + authorization tests
Pass 12.5   Admin CRUD/integration tests
Pass 13.5   Media management tests
Pass 14.5   Commerce/user workflow tests
Pass 15.5   E2E + regression tests
```