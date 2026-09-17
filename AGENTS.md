<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Libraries

- UI: shadcn/ui + Tailwind (do NOT use Material UI or Bootstrap)
- HTTP: native fetch
- Forms: React Hook Form + Zod

## Data identity convention (DB migration)

Content currently lives as typed TS modules under `lib/data/`. Before moving
data to Postgres the following conventions are locked:

- **Primary key:** every entity has an `id: string` (PK). For placeholder data
  the `id` is a stable derived key (commonly the `slug`); it may be swapped for a
  UUID/serial surrogate before production. This is a placeholder convention only.
- **Routing key:** every entity has a `slug: string` used for URL routes and
  `getBySlug`-style lookups.
- **`id` vs `slug`:** `id` identifies the row; `slug` is the human/route handle.
  They are allowed to coincide for now but are not required to.
- **Parent/child FKs** reference the parent's `id`, never `slug` (added during
  the catalog FK-migration pass). `id` is stable; `slug` is the human/route handle
  and may be renamed — when it is, the old value is recorded in `SlugHistory` so
  inbound URLs can be 301-redirected. `slug` stays `@unique` for routing but is
  not load-bearing for relational integrity.

## Data storage policy (`string[]` content)

Ordered `string[]` and object-list content fields map to Postgres `jsonb`
on the first pass (preserves order, no child table joins needed). Fields affected:
`designers.bio`, `about` paragraph blocks, `s34` paragraph blocks,
`flagshipDetails.info.addressLines`/`hours`/`gallery`. If per-row querying of
individual array elements is ever needed, normalize into child tables with a
`sort_order` column and revisit the column type.
