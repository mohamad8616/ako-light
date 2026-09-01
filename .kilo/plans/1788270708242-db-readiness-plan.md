# Plan: DB-readiness prep — Phase 0 only (decisions + duplicate resolution)

Scope: resolve prerequisites before any data reshaping. Only three items:
(1) remove the duplicate categories file, (2) lock the identity/PK convention,
(3) pick the storage policy for `string[]` content fields. No DB schema, no
component/type changes, no `prods.ts` or page-blob reshaping in this phase.

## Findings (justifying the decisions)

- Two identical data files exist: `lib/data/productCategories.ts` and
  `lib/data/productCategoriesCollection.ts` are byte-for-byte identical.
  `productCategoriesCollection.ts` is referenced by **nothing** (grep-verified:
  no import in any `.ts`/`.tsx`); `productCategories.ts` is the one imported by
  `app/products/[product]/page.tsx` and `components/products/ProductsGrid.tsx`.
  => Deleting `productCategoriesCollection.ts` has zero behavioral impact.

- Identity strategy is inconsistent across files:
  `id` (string) on materials/collections/designers/projects; `slug` used for
  routing on flagships/designers/collections; `prods.ts` keyed by a composite
  `category/slug` string with no scalar `id`; page blobs
  (`homepage.ts`, `s34.ts`, `about.ts`) have no identifier at all.

- Several entities carry ordered `string[]` content that must map to a column
  type: `designers.bio`, `about.brandStory.introParagraphs`/`.imageBlock*.paragraphs`,
  `about.elegance.paragraphs`, `s34Sections.{intro,approach,journey,materials,concept}.paragraphs`,
  `s34Sections.gallery.images`, `flagshipDetails.info.addressLines`,
  `flagshipDetails.gallery`.

- `package.json` declares `@prisma/client`, `@prisma/adapter-pg`, and `pg`,
  but **no `prisma/schema.prisma` exists** — the DB layer is unconfigured. (Not
  addressed in this phase; tracked as an open dependency for Phase 1.)

## Phase 0 tasks

### 1. Delete the duplicate categories file
- **Action (implementation agent):** remove `lib/data/productCategoriesCollection.ts`.
- Keep `lib/data/productCategories.ts` (it is the imported canonical copy).
- **Planning note:** this is a destructive/mutating operation — the planning
  agent cannot perform it; an implementation-capable agent (or the user) must
  run the deletion. No code imports the file, so the deletion is safe.
- Add `id: string` to each `ProductSubCategory` entry in `productCategories.ts`
  as part of locking the convention (see task 2). Example:
  ```ts
  { id: "lighting-pendant-light", name: "Pendant Light", slug: "pendant-light", image: "...", hoverImage: "..." }
  ```

### 2. Lock the identity / PK convention
- **Decision:** every entity = `id: string` (PK) **+ `slug: string` (unique, used for routing)**.
  - `id` is the row primary key (stable string; for placeholder data, derive from
    a stable path like `category/slug` or `kind-slug`).
  - `slug` is unique per entity type and is what route params + `getBySlug` lookups use.
- Apply retroactively only where missing in this phase: `ProductSubCategory` gets `id`
  (task 1). Full application to `products`, `designers`, page blobs is deferred to
  the reshape phase (out of scope here).
- Document this in `AGENTS.md` under a short "Data identity convention" note so the
  reshape phase and any future entities stay consistent. (Planning agent can
  append to `AGENTS.md`? — No: AGENTS.md is a non-plan file. Defer this doc
  addition to the implementation agent, OR leave as an open question.)

### 3. Lock the `string[]` storage policy
- **Decision:** store ordered `string[]` and object-list content as **JSONB** in a
  first pass (Postgres `jsonb`), with a future option to normalize into child
  tables with a `sort_order` column if per-row querying of individual paragraphs
  is ever needed.
- Affects these fields: `designers.bio`, all `paragraphs`/`addressLines`/`images`
  arrays, `flagshipDetails.info.hours`, `downloads`/`related` on products.
- Document the policy once per field at migration time with a `comment on column`.
- No code change required in this phase.

## Out of scope (explicitly deferred to the reshape phase)
- Reshaping `prods.ts` (`Record` → array, `designerId` FK).
- Adding interfaces/IDs to `homepage.ts`, `s34.ts`, `about.ts`.
- Creating `prisma/schema.prisma`.
- Rewiring any `app/**` page to a data-access layer.

## Validation
- `grep` confirms `productCategoriesCollection` has zero importers before deletion.
- After deletion, `npm run lint` and `tsc --noEmit` still pass (no dangling imports).
- `AGENTS.md` (or a plan note) records: PK = `id` string, routing key = `slug` unique;
  `string[]` content → JSONB (pass 1).

## Open questions (blockers for the reshape phase, not for Phase 0)
1. Confirm Postgres as the target engine (the installed `pg`/`@prisma/adapter-pg`
   imply it; `TEXT[]`/`JSONB`/`UUID` are used in the full schema).
2. `id` format for placeholder products: reuse the existing composite
   `category/slug` as the PK, or assign a stable surrogate? (Recommend: reuse the
   composite key as `id` for Phase 0's simplicity, revisit before production.)
