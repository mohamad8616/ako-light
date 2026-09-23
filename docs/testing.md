# Testing Strategy — Home Form

Status: **Pass 10.5 — server/data-access tests (integration tier live since
Pass 9.5).**

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
  helpers/    shared setup for the database-backed tiers (env guard,
              Localized/jsonb shape assertions, React cache-scope simulator)
  unit/
    i18n/       routing, localization helpers, translation dictionaries
    data/       product catalogue, content lookups, data integrity
    seo/        metadata builders, JSON-LD structured data
  integration/  schema + seed integrity against the dev database (Pass 9.5)
  server/       repository/data-access reads against the dev database (Pass 10.5)
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

**Pass 8.5 scope (above) stays deterministic, fast, network-free and
database-free.** The two tiers below intentionally talk to the real seeded dev
database (read-only, safe to run while the dev server is up) and are skipped
with a clear message when `DATABASE_URL` is not available in the test
environment; the `beforeAll` probe fails loudly instead of leaving tests
silently skipped if the database itself is unreachable.

**Pass 9.5 — database/schema integration** (`tests/integration/schema.test.ts`,
`integration` project):

- **Connectivity guard** — opens with a `SELECT 1` probe so an unreachable
  database fails clearly rather than per-test.
- **Seeded-table population** — non-zero row counts for every seeded table
  (`product_category`, `designer`, `product`, `collection`, `material`,
  `flagship`, `project`, `project_product`), catching a seed that ran against
  the wrong database or failed partway.
- **Referential integrity (id-based)** — every `Product.categoryId` resolves to
  a real `ProductCategory.id`, every non-null `Product.designerId` to a real
  `Designer.id`, and every `ProjectProduct` row to a real `Project.id` **and**
  `Product.id`. Because `id == slug` for every seeded row, FK *values* alone
  can never distinguish a slug-target from an id-target, so a companion test
  inspects the Postgres catalog (`pg_constraint`) and proves each converted FK
  targets the parent's `id` column.
- **Slug uniqueness** — no duplicate slugs within `ProductCategory`, `Product`,
  `Designer`, `Collection`, `Material`, `Flagship` or `Project`.
- **Localized jsonb integrity** — every model's `name` column (full row
  coverage) plus a spot-checked sample of the deeper jsonb fields
  (`Product.description`/`moreInfo`, `Designer.bio`, `Collection.description`
  `p1–p3`, `Material.description`, `Flagship.city` and the `henge-milan`
  `detail` block, `Project.description`/`paragraph`/`moreDescription`) hold
  `{ en, fa }` objects with non-empty strings — the same guarantee
  `tests/unit/data` enforces on the static files, now enforced on the DB copy.

**Pass 10.5 — server/data-access** (`tests/server/*.test.ts`, one file per
repository from Step 4, `server` project):

- **Shape parity** — every repository function returns data carrying exactly
  the keys of the matching `lib/data/*` interface (`Product`,
  `ProductCategory`, `Designer`, `Collection`, `Material`, `Flagship`,
  `FlagshipDetail`/`FlagshipWithDetail`, `Project`), with `Localized` jsonb
  columns properly parsed back into `{ en, fa }` objects (never raw strings),
  `Decimal` → `number` prices, and the Prisma `MaterialType` enum mapped back
  onto the app's `"stone-composite"`-style union.
- **Not-found contract** — unknown slugs resolve to `null` (not `undefined`,
  not an error), including the slug→id fallback paths in the collections,
  materials and projects repositories.
- **List count + ordering** — list functions return exactly the seeded row
  count, and the id sequence matches a direct `prisma.*.findMany` with the
  intended `orderBy` (`sortOrder`-driven for designers, collections,
  materials, flagships, projects and product categories; category-then-position
  for products).
- **React `cache()` de-duping** — the vitest `server` project resolves `react`
  to the **react-server build** (the build Next.js hands to server components;
  the client build's `cache()` is a passthrough stub), and
  `withRequestCache()` in `tests/helpers/db.ts` installs a minimal RSC
  dispatcher around the assertions. Each file proves with `vi.spyOn` that
  repeat calls inside one request cache scope hit the database once (even when
  one wrapper delegates to another, as `getProjectById` → `getProject`), and
  `products.test.ts` additionally proves a *fresh* scope re-executes.

**Pass 11C — catalog FK conversion + slug-rename redirects** (Step 7 admin-CRUD
prep; the scope change Pass 11B proposed and deferred):

- **`tests/integration/schema.test.ts`** — the integrity tests now resolve on
  `id`, and a new test reads `pg_constraint` to prove all five converted
  catalog FKs (`product → product_category`, `product → designer`,
  `product_image → product`, `project_product → project`,
  `project_product → product`) target the parent's `id` column, not `slug`.
  A seed-parity test additionally compares the live row counts with the counts
  derived from the static `lib/data` sources, so a migration that silently
  dropped rows cannot pass.
- **`tests/integration/catalog-fk.test.ts`** (new) — runtime proof, isolated in
  rolled-back transactions: for a category/product pair whose `id` and `slug`
  deliberately differ, the `id` is accepted into the child FK column and the
  `slug` is rejected with a foreign-key violation (the pre-migration schema
  accepted the slug); and an id-based relation survives a parent slug rename
  untouched.
- **`tests/integration/slug-history.test.ts`** — `recordSlugChange()` +
  `getCatalogRedirectPath()` resolve a renamed product and a renamed category
  segment purely through ids, never self-redirect on the current URL, and
  refuse to redirect under a category the product does not belong to.

## What is intentionally NOT tested yet

- **Visual/UI implementation** — CSS, Tailwind classes, layout, spacing, colors,
  typography, animations, hover effects, responsive breakpoints, image
  dimensions. The project is still undergoing visual development.
- **Components** — React component rendering requires jsdom + React Testing
  Library; not needed for the current pure-logic scope.
- **Database writes** — every write test runs only inside transactions that are
  always rolled back (including when an assertion fails), so the dev seed is
  never mutated. The Pass 11C integrity tests write through `tx` directly; the
  admin CRUD suite (`tests/server/*-crud.test.ts` and `slug-change-fk.test.ts`)
  drives the repository write functions, which accept an optional transaction
  client (`db: Prisma.TransactionClient = prisma`, same pattern as
  `recordSlugChange`) so the test's rolled-back transaction covers them. A test
  run leaves zero rows behind. Migration execution itself stays untested.
- **`proxy.ts` middleware wiring** — the pure decision core
  (`resolveProxyAction`, `shouldBypassAuth`) is unit tested under
  `tests/unit`; the actual NextRequest/NextResponse behaviour (`/fa` 308
  redirects, internal rewrites) needs a Next request context and stays with
  the future E2E checkpoint.
- **Anything network/API-dependent** — no live fetch, no external services
  (the dev database connection in the two DB tiers is the one exception).

## Planned progression

```text
Pass 8.5    Testing foundation + core utilities        ✅ complete
Pass 9.5    Database/schema/integration tests          ✅ complete
Pass 10.5   Server/data-access tests                   ✅ complete
Pass 11.5   Authentication + authorization tests
Pass 12.5   Admin CRUD/integration tests
Pass 13.5   Media management tests
Pass 14.5   Commerce/user workflow tests
Pass 15.5   E2E + regression tests
```