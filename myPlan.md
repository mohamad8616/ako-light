# Admin CRUD - catalog sections (implementation plan / handoff)

Repo: `d:\Home form\ako-light-cline`   Branch: `dashboard`   HEAD: `3c49e97`

Goal: admin CRUD for every catalog section EXCEPT `/admin/admins`, an RTL-only
admin shell with a single point of control, shared scaffolding, and a visual
refresh. Self-contained on purpose: a fresh context with no memory of the
planning conversation can execute this file as-is.

STATUS: Phases 0-4 complete. Next: Phase 5 (the other 8 sections).

Verification status at this point (2026-09-21):
- `npx tsc --noEmit` -> clean.
- `pnpm run build` -> exit 0, and the route table emits all four admin routes
  (`/[locale]/admin`, `/admin/products`, `/admin/products/[id]`,
  `/admin/products/new`).
- `pnpm test` -> retry-once rule applied. First run: 3 failures = the 1
  PRE-EXISTING proxy assertion + 2 Neon-latency flakes (an expired 20s
  interactive transaction in tests/integration/slug-history.test.ts, and a 30s
  test timeout in tests/server/projects.test.ts — both files untouched by this
  work). Retry of the DB tiers: 57/57 pass. Unit tier: 111/112 (only the proxy
  assertion).

Phase 2 notes for whoever continues:
- Every repository in lib/repositories now has an "Admin (dashboard) reads and
  writes" section: `[Entity]AdminRow` (table DTO), `[Entity]WriteInput`
  (form/create/update payload), `get[Entity]AdminDetail(id)`,
  `create[Entity]` (returns the new id; surrogate uuid generated IN the
  repository so the seed's id === slug convention never applies to new rows),
  `update[Entity]`, `delete[Entity]`, plus option lists for the pickers
  (`getProductCategoryOptions`, `getDesignerOptions`, `getProductOptions`).
- `syncProductImages` / `syncProjectProducts` run inside the SAME transaction
  as the product/project write; images keep their ids across reorders and a
  foreign id is treated as a new row (ownership is verified, not trusted).
- casting.ts gained the write-side helpers `asJsonInput()` and
  `asNullableJsonInput()`; the nullable one returns the EXACT generated union
  (`Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput`) — a bare
  `Prisma.DbNull` type reference is a TS error, `Prisma.DbNull` as a VALUE is
  what the inputs accept.
- FabricItem/CatalogueItem take a USER-SUPPLIED id (id IS the slug, no slug
  column); all other entities generate surrogate ids.
- `material` maps the app union to the Prisma enum via MATERIAL_TYPES_TO_DB
  ("stone-composite" <-> stone_composite).
- Verified: `npx tsc --noEmit` clean AND `npx vitest run --project server`
  44/44 against the real dev DB (all existing readers unchanged).


Known issue, NOT caused by this work: `tests/unit/proxy.test.ts` has one failing
assertion — "redirects signed-in users without an admin-level role to the
homepage" expects `http://localhost/`, but `proxy.ts` (lines 94-108,
deliberately, with its own comment) now sends a signed-in non-admin to
`/sign-in?denied=1&redirectTo=...`. Proof it pre-dates this work:
`git diff HEAD --stat -- proxy.ts tests/unit/proxy.test.ts lib/auth/permissions.ts`
is empty. Left untouched on purpose (outside the admin-CRUD scope) — either the
stale test expectation or the proxy behavior needs a separate decision. Note
`docs/admin-guide.md` is ALSO stale on this point: it claims the proxy role
check is disabled, but proxy.ts enforces it.

Known gap: the browser-visible RTL check (/fa/admin and /en/admin incl. an open
dialog) could not be performed — every admin route is behind
`requireAdminAccess()` and the repo has no seeded admin/owner account. Needs a
signed-in admin session (or a granted test role) to complete.


---

## 1. Findings that override the original request

| Original assumption | Reality in the repo | Consequence |
| --- | --- | --- |
| The Toaster is already in the layout | It is NOT mounted anywhere; `components/ui/sonner.tsx` defines it and nothing imports it | Mount it once in the (admin) layout |
| Catalog sections are placeholder screens | No `/admin/*` route exists except the dashboard page; every sidebar link 404s; `AdminPlaceholderPage` is dead code | This task creates those routes |
| `ADMIN_SHELL_DIR` is usable as-is | It is untyped, so it infers the literal `"rtl"`; comparing it to `"ltr"` is a TS error (no overlap) | Annotate it `: "ltr" \| "rtl"` |

Also true and load-bearing:

- Only TWO `locale === "en"` checks exist in the whole repo:
  `app/[locale]/(admin)/layout.tsx` (direction, replace) and
  `components/admin/AdminPlaceholderPage.tsx` (dictionary lookup, NOT direction,
  leave alone).
- The (admin) layout renders `components/app-sidebar.tsx` plus
  `components/site-header.tsx`. `components/admin/AdminSidebar.tsx` and
  `AdminTopbar.tsx` are unused dead code.
- `getDesigners` / `getMaterials` / `getCollections` / `getFlagships` /
  `getProjects` / `getProductCategories` return app-level types that OMIT `id`
  and `sortOrder`, so admin needs new read functions in the repositories.
- There is NO `ThemeProvider` anywhere, so `.dark` is never applied: the admin
  renders on the `:root` LIGHT token set (white sidebar, inset and cards) over
  the dark `--color-background` page backdrop. Design the refresh for light
  surfaces.
- Next 16.2.12: `revalidatePath` matches the ROUTE FILE structure, and
  `proxy.ts` rewrites `/admin/...` to `/fa/admin/...`, so revalidate the
  `/[locale]/admin/[section]` patterns, not the browser path. `refresh()` from
  `next/cache` is also available inside server actions.
- Portal gap: base-ui `Dialog`/`Select`/`DropdownMenu` popups mount on
  `document.body`, OUTSIDE the shell wrapper, so under `/en/admin` (where the
  `html` element carries `dir="ltr"`) they would render LTR.
  `@base-ui/react/direction-provider` is context-only (renders no DOM) - use it.
- A static segment (`products/new`) takes precedence over a dynamic sibling
  (`products/[id]`); also have `[id]/page.tsx` call `notFound()` when `id` is
  `"new"` so a future routing change cannot silently render an empty form.
- Prisma `Decimal` and `Date` instances are NOT serializable across the RSC
  boundary, so repositories must expose plain DTOs (`number`, ISO strings).

---
## 2. Locked decisions (do not re-litigate)

1. MIXED form mounting (user-confirmed). Dedicated `list + /new + /[id]` routes
   for Product, Collection, Flagship, Project. Dialog-on-list-page for
   ProductCategory, Designer, Material, FabricItem, CatalogueItem.
   Either way: ONE `lib/admin/schemas/<entity>.ts` and ONE
   `lib/admin/actions/<entity>.ts` per entity. The mounting shell is the only
   difference, so validation and persistence have a single source of truth.
2. NO Admins CRUD. Only a placeholder route at
   `app/[locale]/(admin)/admin/admins/page.tsx` rendering the existing
   `components/admin/AdminPlaceholderPage.tsx` behind `requireOwnerAccess()`.
3. NO SlugHistory writes this pass: `SlugHistory` is
   `@@unique([modelType, oldSlug])`, so a rename A to B to A to B would throw.
   Leave a TODO comment; no redirect/redemption UI.
4. Slug / route-key rules: auto-derive from the ENGLISH name on create while the
   field is untouched (`slugify`), offer a "regenerate from name" action, allow
   editing, and WARN (never block) that renaming changes public URLs. Server
   generated `crypto.randomUUID()` ids for slug-based entities (decoupling `id`
   from `slug` is explicitly allowed by AGENTS.md). `FabricItem.id` and
   `CatalogueItem.id` are user-supplied: there the id IS the slug (no slug
   column, no SlugHistory coverage), so same warning and no lock.
5. RTL only, single source of truth = `ADMIN_SHELL_DIR` in
   `lib/admin/sections.ts`, typed `"ltr" | "rtl"` so enabling LTR later is a
   one-line change (and the layout's `side` ternary stays type-valid).
6. NO `z.coerce` in form schemas: it makes `z.input` differ from `z.output` and
   breaks `zodResolver` typing. Numbers arrive via
   `register(..., { valueAsNumber: true })`.
7. NO DB-writing tests: the `integration` and `server` vitest tiers are
   documented read-only against the shared dev database. Write-path coverage is
   by manual round-trip.
8. Never restructure the admin layout/sidebar/page composition - visual
   detailing only.

---

## 3. Phases

### Phase 0 - RTL resolution (single point of control) - IN PROGRESS

- [x] `lib/admin/sections.ts`: `ADMIN_SHELL_DIR` typed `"ltr" | "rtl"` with the
      "only place direction is decided" comment.
- [x] New `components/ui/direction.tsx` wrapping
      `@base-ui/react/direction-provider`, used around the shell (covers
      body-level portals).
- [x] `app/[locale]/(admin)/layout.tsx`: `dir` comes from `ADMIN_SHELL_DIR` and
      is threaded into `SidebarProvider`, `AppSidebar` (`dir`/`side`),
      `SidebarInset`; Toaster mounted (it was never mounted anywhere before).
- [x] Stale comments fixed: `components/app-sidebar.tsx`; the unused
      `AdminSidebar.tsx` aligned with the constant.
- [x] `npx tsc --noEmit` clean; `prettier --write` applied to the rewritten
      files.
- [ ] BLOCKED: browser check of `/fa/admin` + `/en/admin` RTL incl. an open
      dialog (no seeded admin account — see the STATUS note above).

### Phase 1 - tokens, primitives, DataTable

- [x] `app/globals.css`: added `--success` / `--warning` / `--info` (plus
      `-foreground`) to both `:root` and `.dark`, mapped as `--color-*` inside
      `@theme inline`. `warning` is an intrinsically light hue and takes a dark
      foreground in both themes.
- [x] New `components/ui/textarea.tsx` and `components/ui/switch.tsx`.
      Note: `@base-ui/react/switch` exports a NAMESPACE (`Switch.Root`,
      `Switch.Thumb`), like the existing `@base-ui/react/checkbox`. The thumb
      uses `justify-start` / `data-checked:justify-end` instead of a physical
      `translate-x`, so it needs no RTL override.
- [x] Extended `badgeVariants` in `components/ui/badge.tsx` with
      `success` / `warning` / `info` (mirroring the `destructive` structure).
- [x] `components/admin/data-table/DataTable.tsx` wired for real use: all copy
      translated via `useLanguage().t` (Persian digits through `Intl`),
      `text-start` headers, empty state, optional `searchable` global filter,
      sort-direction icons, roomier rows + hover states, `rtl:rotate-180` on
      the pagination chevrons (they follow the shell's `dir`, not the locale).
      Note: `tailwind-merge` does NOT treat `ps-*` as conflicting with the
      Input primitive's `px-*`, so the search icon sits BESIDE the input rather
      than overlaid — do not put it back.
- [x] Keys added to BOTH dictionaries in `lib/i18n/translations/admin.ts`
      (`admin.table.searchLabel`, `.searchPlaceholder`, `.prev`, `.next`,
      `.pageOf`, `.rowCount.one`, `.rowCount.other`); the existing
      `admin.table.noResults` / `.goToPreviousPage` / `.goToNextPage` are
      reused. `tests/unit/i18n/translations.test.ts` passes.

---
### Phase 2 - repository write layer (no ad-hoc write logic in actions)

For `products`, `product-categories`, `designers`, `collections`, `materials`,
`flagships`, `projects`, `fabrics`, `catalogue` in `lib/repositories/*.ts`,
matching the existing `cache()`-wrapped reader conventions:

- [x] `get[Entity]AdminRows()` list DTO, `get[Entity]AdminDetail(id)` form DTO,
      `create[Entity]` (returns the new id), `update[Entity]`, `delete[Entity]`
      for all nine entities, plus option lists for the pickers.
- [x] `lib/repositories/product-images.ts`: `syncProductImages(productId, rows,
      db?)` — runs inside the product create/update transaction; existing ids
      update in place (identity survives reorders), foreign/missing ids are
      created, absent rows deleted, and "no primary" falls back to the first
      row (mirroring the read fallback). Plus `createProductImage` /
      `deleteProductImage`.
- [x] `lib/repositories/projects.ts`: `syncProjectProducts(projectId, productIds,
      db?)` — delete-then-create on the join table (no unique constraint, same
      trade-off as the seed), `order` = array position; called in the same
      transaction as the project write.
- [x] `lib/repositories/casting.ts`: `asJsonInput()` and `asNullableJsonInput()`
      — the nullable one returns `Prisma.InputJsonValue |
      Prisma.NullableJsonNullValueInput` (a bare `Prisma.DbNull` used as a type
      is a TS error; the VALUE is what the generated inputs accept).
- [x] Write-input types double as form value types; list DTOs are plain and
      table-specific (`Decimal` to `number`, `Date` to ISO string, `_count`
      for cascade warnings). Verified: tsc clean + server tier 44/44.

### Phase 3 - schemas, actions, shared components - COMPLETE

- [x] `lib/admin/slug.ts` - `slugify()`, `isSlug()`, `defaultSlugFromName(en, fa)`
      (pure, shared client+server; Latin-only — a Persian-only name yields "" and
      the editor types the slug, which the zod schema then enforces).
- [x] `lib/admin/schemas/common.ts` - `localizedSchema` (BOTH en and fa required,
      matching the DB tests' non-empty-pair guarantee),
      `localizedListSchema`, `mixedLocalizedSchema` (Localized | string),
      `slugSchema`, `linkSchema` (https OR "/"-rooted OR "#": the real data
      mixes all three — designer download links are root-relative and several
      catalogue hrefs are "#"), `imageRefSchema`, `hexColorSchema` (3/6/8 hex),
      `sortOrderSchema`, `nonEmptySchema`. NO `z.coerce` anywhere.
- [x] `lib/admin/schemas/<entity>.ts` - 9 schemas + inferred FormValues, one per
      entity, structurally mirroring the repository WriteInputs.
- [x] `lib/admin/result.ts` - `ActionResult` (`ok`/`data` |
      `formError` + per-field `issues`) carrying error CODES, never prose (the
      dictionaries own copy via `admin.error.*`); `toActionResult()` maps
      P2002 to a per-field `slugTaken` issue (slug/id columns), P2003 to
      `relationViolation`, P2025 to `notFound`, and RETHROWS anything unknown so
      the server log keeps the stack; `zodIssuesToFieldIssues()` maps zod codes
      (too_small with a string origin / invalid_type = required);
      `errorCodeForType()` shares that mapping with the client fields.
- [x] `lib/admin/revalidate.ts` - `revalidateCatalog(section, {id})`:
      `/[locale]/admin/<section>` (+ `/[id]`) + the `/admin` dashboard + the
      section's PUBLIC route patterns, then `refresh()`.
- [x] `lib/admin/actions/*.ts` - 9 `"use server"` modules; each exports
      `create[Entity]Action` (returns the new id), `update[Entity]Action(id, in)`
      and `destroy[Entity]Action(id)`. Every action re-runs
      `requireAdminAccess()`, re-parses with the SAME zod schema, calls the
      repository, revalidates and returns an ActionResult. No Prisma calls here.
      The slug-history TODO sits in the slug-based modules only (fabrics and
      catalogue have no SlugHistory coverage at all).
- [x] Shared UI: `components/admin/AdminPageHeader.tsx` (server component, one
      heading per page, large title + optional subtitle + actions slot) and
      `components/admin/catalog/`: columns.tsx (localizedColumn with the other
      locale as a muted secondary line + locale-aware sorting, textColumn,
      slugColumn, numberColumn/imageColumn/updatedColumn via Intl,
      actionsColumn), RowActions.tsx, DeleteDialog.tsx (dumb confirm,
      `dir={ADMIN_SHELL_DIR}` for the portal, optional cascade warning),
      useCrudSubmit.ts (run(): toast + pending + ActionResult back to the
      caller; applyFieldIssues(): RHF setError with translated messages), and
      fields/: form.tsx (FieldIssue, useFieldMessage, FormCard, FieldRow,
      ListRow, AddRowButton, swapAt, useList), LocalizedField.tsx
      (LocalizedField + LocalizedListField), SelectField.tsx (base-ui `items` so
      SelectValue renders labels; `allowEmpty` writes null), SlugField.tsx,
      ScalarFields.tsx (NumberField/SwitchField/ColorField), ListFields.tsx
      (StringListField, MixedListField with the localized/plain toggle,
      LocalizedLabeledRowsField covering hours AND downloads), ProductFields.tsx
      (RelatedField for the denormalized related array, ProductImagesField),
      ProductsUsedField.tsx. New dictionary keys in BOTH locales:
      admin.error.* (6) and admin.crud.* (28).
      Verified: tsc clean; prettier applied; unit tier 111/112 (the 1 failure is
      the pre-existing proxy assertion).
      GOTCHA: run prettier on explicit FILES only — a directory-wide
      `prettier --write components/admin lib/admin` reformatted unrelated files
      (AdminPlaceholderPage.tsx, AdminTopbar.tsx, access.ts) and they had to be
      restored from HEAD.

---
### Phase 4 - Products (complete first) - COMPLETE

- [x] `app/[locale]/(admin)/admin/products/page.tsx` - the shared DataTable's
      first real use: name (active locale first + the other as a muted
      secondary line, sortable), category, designer, price, stock badge +
      quantity, display order, actions. Search and the create button ride in
      its toolbar.
- [x] `.../products/new/page.tsx` and `.../products/[id]/page.tsx` (dedicated
      pages; `[id]` also `notFound()`s on the literal "new" and 404s when the
      row is gone). The BUILD route table confirms both are emitted side by
      side, so the static `new` segment wins at match time.
- [x] Form covers every `Product` field: name/description/moreInfo
      (`Localized`), hoverImage/heroImage, price, sortOrder, category picker,
      nullable designer picker, `existsInStore` Switch, quantity, downloads,
      related and the image list. `categoryLabel` is NOT a field (derived from
      the relation; no column). `moreInfo` is a nullable pair behind a switch,
      and empty pairs normalize to NULL on submit.
- [x] `ProductImagesField`: repeatable url/alt/isPrimary/sortOrder with move
      up/down, saved via `syncProductImages` in the same transaction as the
      product.
- [ ] Manual create -> edit -> delete round-trip: STILL BLOCKED on an admin
      session (no seeded account in this repo). Covered instead by the
      production build (exit 0) + 57/57 DB-tier tests + tsc.

CRITICAL LESSON (this cost one build failure - read before Phase 5):
a RUNTIME import of `@/generated/prisma/client` must NEVER appear in a chain
reachable from a client component. Its `client.ts` imports
`node:process`/`node:path` at module top level, so Turbopack fails with
"the chunking context (unknown) does not support external modules
(request: node:module)". `lib/admin/result.ts` had `import { Prisma }` for the
`instanceof Prisma.PrismaClientKnownRequestError` check, and that module is
imported by useCrudSubmit.ts, fields/form.tsx and RowActions.tsx - all client
components - so the whole admin product page failed to build.
Fix now in place:
  - `lib/admin/result.ts` is Prisma-FREE (codes, ActionResult, actionOk,
    actionFail, errorCodeForType, zodIssuesToFieldIssues) and safe to import
    from anywhere.
  - `toActionResult()` lives in the server-only `lib/admin/result-server.ts`,
    imported ONLY by lib/admin/actions/* (server actions, never bundled into
    client chunks).
  - `lib/repositories/casting.ts` legitimately keeps its runtime Prisma import
    (repositories are server-only; they are imported by server components and
    actions only).
Rule of thumb for anything new: if a module can be reached from a component,
it may import Prisma TYPES only - never values.

### Phase 5 - the other 8 entities

Dialog mounting unless marked (page). Every field read from `prisma/schema.prisma`.

| Section | Model | Form representation | Flags |
| --- | --- | --- | --- |
| categories | ProductCategory | LocalizedField(name), text i18nKey, SlugField, sortOrder | none |
| designers | Designer | LocalizedField(name), image, optional website, LocalizedListField(bio), sortOrder | none |
| collections (page) | Collection | LocalizedField(name), year as TEXT (source uses "2026"), image, three LocalizedFields for description.p1/p2/p3 | `description` is a fixed {p1,p2,p3} jsonb, so three required blocks; missing keys normalised to empty pairs |
| materials | Material | LocalizedField(name), SelectField for the MaterialType enum (label `stone-composite` for member `stone_composite`), category (Select of known groups plus custom text), image, LocalizedField(description) | `category` is free-form in the DB but the public /materials page groups by it, so Select plus custom keeps grouping from silently breaking |
| flagships (page) | Flagship | summary fields plus a "detail page content" Switch revealing heroImage, heading, description, info (name, addressLines array, hours array, appointmentNote, phone, email), video (thumbnail, url), gallery array | `detail` is a NULLABLE NESTED jsonb (null means no detail page yet); `info.hours[].value` is a plain string; `info.name` duplicates the name in the source data - keep as-is, do not "fix" the shape |
| projects (page) | Project | i18nKey, LocalizedField(name), location, year (text), image, description, paragraph, LocalizedListField(moreDescription), StringListField(portfolioImages), CreditsField, ProductsUsedField, sortOrder | `credits` is a mixed (Localized or string) array so it needs a per-row shared-string versus localized-pair toggle; `productsUsed` writes the ProjectProduct join |
| fabrics | FabricItem | plain inputs, hex colour input, sortOrder | `id` IS the slug (no slug column, not in SlugHistory) so it is user-supplied with a warn on rename |
| catalogue | CatalogueItem | title, href, coverColor, optional coverTextColor (clearable), sortOrder | same id-as-slug note |

- [ ] Also `app/[locale]/(admin)/admin/admins/page.tsx` (placeholder plus owner
      gate only).

---
### Phase 6 - design direction (visual detailing only, no composition changes)

- [ ] Stock status badge: `existsInStore` true means `success` "In stock", false
      means `destructive` "Out of stock" EVEN IF quantity is greater than 0,
      with quantity as muted secondary text.
- [ ] Role badges: `NavUser` currently prints owner/admin as muted text, so give
      it a token Badge (owner = warning, admin = info).
- [ ] Action buttons: create = primary, edit = outline, delete = destructive.
- [ ] Hierarchy: one `AdminPageHeader` (roughly `text-3xl` title plus subtitle)
      for every section; roomier stat cards and table rows; clearer sidebar
      hover/active states.
- [ ] `app/[locale]/(admin)/admin/page.tsx`: keep the stat-card-grid plus chart
      plus demo-table composition, add the MISSING heading
      (`admin.overview.title` and `admin.overview.subtitle` already exist and the
      guide describes one), restyle within the existing layout. Leave
      `components/data-table.tsx` internals alone.

### Phase 7 - tests, docs, verification

- [ ] New pure unit tests: `tests/unit/admin/schemas.test.ts` (happy and invalid
      payload per entity, localized pair rules, slug/hex/url rules, int bounds),
      `tests/unit/admin/slug.test.ts`, and extend
      `tests/unit/admin/sections.test.ts` to pin `ADMIN_SHELL_DIR`.
- [ ] Update `docs/admin-guide.md`: status table, per-section instructions, slug
      rules, RTL note, and the "where the code lives" table (it currently points
      at the unused AdminSidebar/AdminTopbar and a layout path that does not
      exist).
- [ ] `npx tsc --noEmit`
- [ ] `pnpm run build`
- [ ] `pnpm test` - retry ONCE on a Neon P1001 before reporting a real failure.
- [ ] Manual: create to edit to delete for Products AND Fabrics; stock badge
      correct for `existsInStore: false`; RTL on `/fa/admin/...` and
      `/en/admin/...` including an open dialog.

---

## 4. Report back (requested explicitly)

- Which RTL/LTR behaviour was implemented: shell direction comes ONLY from
  `ADMIN_SHELL_DIR` (typed so LTR is a one-line change); no other direction
  check remains anywhere in the (admin) tree; base-ui `DirectionProvider` covers
  the body-level portals.
- Confirm EVERY repository got its missing write functions (`create`, `update`,
  `delete`, `syncProductImages`, `syncProjectProducts`) instead of duplicating
  write logic inside server actions.
- Report the Phase 5 Flags column (the field-representation judgement calls)
  plus anything found while implementing.

---

## 5. Conventions to respect while implementing

- UI: shadcn/ui plus Tailwind only (no MUI/Bootstrap). Icons: `@hugeicons/react`.
- Forms: React Hook Form plus Zod (`zodResolver` from `@hookform/resolvers/zod`).
  This is zod v4: `z.treeifyError` / `z.flattenError` exist, `error.flatten()` is
  deprecated.
- Copy lives in `lib/i18n/translations/*` in BOTH dictionaries, never inline.
- Admin copy is RTL/Persian-first, but code comments and identifiers stay English.
- `id` identifies the row, `slug` is the route handle, FKs reference `id` (see
  AGENTS.md). Ordered string arrays and object lists stay jsonb; `Localized`
  stays one jsonb column typed `{ en, fa }`.
- Server actions re-authorize (`requireAdminAccess`) and re-validate with the
  same zod schema - never trust client validation alone.
- Read the bundled Next docs under `node_modules/next/dist/docs/` before using a
  Next API (this version has breaking changes; `params` is a Promise).

# Phase 6 — Design direction (items 10–12, no composition changes)

- __Tokens first:__ `--success`/`--warning`/`--info` (+foregrounds) in `app/globals.css` for both `:root` and `.dark`, mapped in `@theme inline` so `bg-success/10 text-success` etc. work.
- __Stock status:__ `existsInStore` renders as a coloured Badge — `success` “In stock” / `destructive` “Out of stock” — with quantity as a muted secondary (`existsInStore: false` → badge is red even when `quantity > 0`, which is exactly the case item 13 asks to verify).
- __Role badges:__ `NavUser` already prints owner/admin as plain muted text → becomes a token-based Badge (owner = warning, admin = info) inside the existing markup; same treatment where the shell shows the role.
- __Action buttons:__ create = primary, edit = outline, delete = destructive variant — replacing today's uniform neutral treatment.
- __Hierarchy:__ one `AdminPageHeader` (≈ `text-3xl` title + subtitle) for every section, roomier stat cards and table rows (padding/type scale/hover/active states only), clearer sidebar active/hover states.
- __Dashboard (`admin/page.tsx`):__ keep the existing stat-card grid + chart + demo table composition. Restyle within it and add its __missing__ heading — the code renders no title even though `admin.overview.title`/`admin.overview.subtitle` exist and `docs/admin-guide.md` describes one. The demo `components/data-table.tsx` internals stay untouched (sample data, not the catalog table).

---

# Phase 7 — Tests, docs, verification (item 13)

- __New unit tests only__ (pure, no DB): `tests/unit/admin/schemas.test.ts` (happy path + invalid payload per entity schema, localized pair rules, slug/hex/url rules, integer bounds), `tests/unit/admin/slug.test.ts` (slugify + default-slug), and an extension to `tests/unit/admin/sections.test.ts` pinning `ADMIN_SHELL_DIR` to a valid direction. __No DB-writing tests:__ the `integration`/`server` vitest tiers are documented as read-only against the shared dev database, so write-path coverage is by manual round-trip, not by mutating the suite.
- __Docs:__ update `docs/admin-guide.md` (its status table, per-section “usage instructions pending” stubs, the RTL note, and the “where the code lives” table which currently points at the unused `AdminSidebar`/`AdminTopbar` and a layout path that doesn't exist).
- __Verification:__ `npx tsc --noEmit` → `pnpm run build` → `pnpm test` (retry once on a Neon `P1001` before reporting a failure). Then live round-trips on the dev server (create → edit → delete for __Products__ and __Fabrics__ as the simpler entity; stock badge check for `existsInStore: false`; both `/fa/admin/...` and `/en/admin/...` checked for RTL, including a dialog popup).

---

# Build order

0 RTL core → 1 tokens/primitives/DataTable → 2 repositories (all entities, so no write logic can leak into actions) → 3 schemas/actions/shared components → 4 Products end-to-end + round-trip → 5 the other 8 sections → 6 dashboard restyle → 7 tests/docs/full verification.

__Risks I'm tracking:__ `zodResolver` + zod v4 typing (avoided by keeping `z.input === z.output`, no `z.coerce`); Prisma `Decimal`/`Date` crossing into client components (avoided by plain DTOs); `revalidatePath` needing route-file paths because `proxy.ts` rewrites `/admin` → `/fa/admin` (handled by the locale-pattern helper); base-ui portals escaping the shell's `dir` (handled by `DirectionProvider`); RTL number/date formatting via `Intl` with `fa-IR`.

__Report I'll deliver:__ the RTL behaviour implemented (constant-only, `DirectionProvider`, no other direction checks left in `(admin)`), and confirmation that every repository got its write functions (`create*`/`update*`/`delete*`/`syncProductImages`/`syncProjectProducts`) instead of ad-hoc writes inside server actions.

---

The one decision that changes the file count most (~12 route files and how roomy the heavy forms are) — everything else is as planned and decided above:

Routing check done. Next's App Router orders static segments ahead of dynamic siblings, so `products/new` wins over `products/[id]`; I'll additionally have the `[id]` page `notFound()` on the literal `"new"` as a belt-and-braces guard, so no routing change can silently render a blank edit form.

## Plan locked

**Decision applied:** Mixed mounting shell — `Product`, `Collection`, `Flagship`, `Project` get dedicated `list + /new + /[id]` routes; `ProductCategory`, `Designer`, `Material`, `FabricItem`, `CatalogueItem` get a dialog on their list page. Per your constraint, each entity has **exactly one** `lib/admin/schemas/<entity>.ts` + one `lib/admin/actions/<entity>.ts`; the page and the dialog are only different shells calling the identical schema and action, so validation and persistence have a single source of truth.

**Definition of done (build order):**

| Phase | Deliverable |
|---|---|
| 0 | `ADMIN_SHELL_DIR` typed + commented in `lib/admin/sections.ts`; admin layout uses it for `SidebarProvider`/`AppSidebar`/`SidebarInset`; new `components/ui/direction.tsx` (base-ui `DirectionProvider`) so dialog/select portals stay RTL on `/en/admin`; stale doc comments fixed; `<Toaster/>` mounted |
| 1 | `--success`/`--warning`/`--info` tokens in `app/globals.css`; `textarea`/`switch`/badge variants; `DataTable` localized + restyled (its first real use) |
| 2 | Repository write layer for **all 9 entities** + `product-images`/`projects` join writes + `casting.ts` JSON-input helpers + plain serializable DTOs |
| 3 | `lib/admin/{slug,schemas,result,revalidate,actions}` + the shared `components/admin/catalog/**` field/column/dialog/submit kit |
| 4 | Products end-to-end (list + form + `ProductImagesField`) and a live round-trip |
| 5 | The other 8 sections, incl. the flagged fields (`Collection.description` p1–p3, `Material.category`, `Flagship.detail` sub-form, `Project.credits` mixed union, `Product.related` denormalized snapshot, `FabricItem`/`CatalogueItem` id-as-slug) |
| 6 | Visual refresh incl. the dashboard's missing heading — layout composition untouched |
| 7 | Unit tests for schemas/slug/`ADMIN_SHELL_DIR` (no DB-writing tests — the integration/server tiers are read-only by design), `docs/admin-guide.md` correction, then `npx tsc --noEmit`, `pnpm run build`, `pnpm test` (one Neon P1001 retry), and manual create → edit → delete round-trips + the `existsInStore: false` stock-badge check on `/fa/admin/...` and `/en/admin/...` |

`/admin/admins` stays a placeholder (CRUD excluded) — I'll only give it a route that renders the existing `AdminPlaceholderPage` under `requireOwnerAccess()`, which clears the 404 its sidebar link hits today.

I can't start editing from Plan mode — **please toggle to Act mode** and I'll begin with Phase 0 (the RTL resolution), verifying `tsc` after that phase before moving on to the repository write layer.