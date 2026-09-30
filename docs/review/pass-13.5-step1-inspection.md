# Pass 13.5 — Step 1: Inspection of the Existing Implementation

> Read-only reconnaissance performed before any code change. Nothing in this
> document alters the codebase; it is the baseline the Media foundation will be
> built on.

---

## 1. Existing Vercel Blob implementation

Only **two** modules import `@vercel/blob`:

| File | Role | Imports |
| --- | --- | --- |
| `lib/admin/actions/upload.ts` | Server Action `uploadImageAction(formData)` — the only writer | `put` |
| `lib/admin/blob.ts` | Server-side cleanup helpers | `del` |

### `lib/admin/actions/upload.ts` — the single write path

`uploadImageAction(formData) => ActionResult<{ url: string }>` is the **only**
place a blob is ever created. Flow:

1. `await requireAdminAccess()` — authorization is the first statement.
2. Hard-fails (`actionFail("unknown")`) when `BLOB_READ_WRITE_TOKEN` is absent.
3. Reads `file` + `folder` from `FormData`; rejects empty (`"required"`),
   oversized (`"tooLarge"`), and a non-allow-listed declared MIME (`"notImage"`).
4. **Reads the bytes once** (`file.arrayBuffer()`), runs `sniffImageType()` on
   them, and uploads *that same buffer* — so validated bytes and stored bytes
   can never diverge.
5. Pathname: `admin/${group}/${Date.now()}-${base}.${extension}`, where `group`
   is matched against `FOLDER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` and falls
   back to `uploads`; `base` comes from `safeBaseName(file.name)` with the image
   extension stripped.
6. `put(pathname, buffer, { access: "public", contentType: sniffed, addRandomSuffix: true })`
   → returns `{ url }`. **No metadata is persisted anywhere.**
7. On throw: `console.error` + `actionFail("unknown")`.

### `lib/admin/blob.ts` — the cleanup half

- `isBlobUrl(url)` — true only for `https?://*.blob.vercel-storage.com`
  (suffix match, so private *and* public store subdomains are covered).
  Rejects relative paths, `"#"` placeholders, non-http schemes, look-alike hosts.
- `removedUrls(before, after)` — order-insensitive, de-duplicated set difference.
- `deleteBlobUrls(urls)` — filters to blob URLs, de-dupes, `await del(targets)`;
  **failures are logged and swallowed on purpose** (cleanup runs *after* the DB
  write already succeeded, so it must never fail a successful save).

### Garbage collection today (per-entity, duplicated 12+ times)

Every catalog action module repeats the same pattern — read URLs → persist →
sweep the dropped ones:

```ts
const beforeUrls = await getMaterialImageUrls(id);
await updateWithSlugHistory("material", id, slug, (tx) => updateMaterial(id, data, tx));
await deleteBlobUrls(removedUrls(beforeUrls, [parsed.data.image]));
```

`getXImageUrls(id)` repository helpers exist per entity (`materials.ts` is
representative; `products.ts`, `designers.ts`, `collections.ts`,
`flagships.ts`, `projects.ts`, `fabrics.ts`, `homepage-features.ts` follow suit).

---

## 2. Existing image upload UI

`components/admin/ImageUpload.tsx` (client) holds both pieces:

- **`ImageUpload`** — preview thumbnail + *Pick* / *Remove* buttons + hidden
  `<input type="file" accept="image/jpeg,image/png,image/webp,image/avif">`.
  Calls `uploadImageAction` with `{ file, folder }`, then
  `setValue(name, result.data.url, …)`.
- **`ImageListField`** — the `string[]` variant (flagship gallery), one
  `ImageUpload bare` per `ListRow`.

**Key contract (must not break):** the component's *output is still a plain URL
string*. It is a drop-in replacement for the old URL text inputs, so
`imageRefSchema` and every zod form schema are unchanged, and all seeded/external
URLs keep working.

---

## 3. Validation (security behaviour to preserve)

`lib/admin/image-sniff.ts` — deliberately pure: no SDK, no server-only imports.

- `MAX_UPLOAD_BYTES = 5 * 1024 * 1024`.
- `IMAGE_EXTENSIONS`: `image/jpeg→jpg`, `image/png→png`, `image/webp→webp`,
  `image/avif→avif`.
- `sniffImageType(bytes)`: JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`;
  WebP `"RIFF"`@0 + `"WEBP"`@8; AVIF `"ftyp"`@4 + brand `avif|avis`@8. Returns
  `null` otherwise — MP4 (`isom`), WAVE and scripts are all rejected.
- `safeBaseName(name)`: drops directory components, lowercases, `[^a-z0-9._-]→-`,
  strips leading `.`/`-`, caps at 60 chars, falls back to `"image"`.

Declared `File.type` is treated as a *claim*; the bytes are the evidence. This
must not be weakened (myPlan §5).

---

## 4. Authorization

`lib/admin/access.ts` (server-only):

- `getAdminRole()` → role only if in `ADMIN_ROLES`, else `undefined`.
- `getAdminIdentity()` → `{ id, role }` for admin-level sessions, else `null`.
- `requireAdminAccess()` → `redirect("/sign-in?denied=1")` when not admin-level;
  returns the role otherwise.
- `requireOwnerAccess()` → `user`/anonymous → sign-in; `admin` → `/admin`;
  returns `"owner"` otherwise.

`lib/auth/permissions.ts`: `ROLES = { user, admin, owner }`,
`ADMIN_ROLES = ["admin", "owner"]`; owner differs from admin only by
`impersonate-admins`. **No RBAC change is permitted** (myPlan §6, §14).

Two enforcement layers today: `proxy.ts` (edge gate) + `requireAdminAccess()` in
`app/[locale]/(admin)/layout.tsx` (React-tree backstop).

---

## 5. Prisma models carrying image/media URLs

Schema: `prisma/schema.prisma`; client output `../generated/prisma`, provider
`prisma-client` with the `@prisma/adapter-pg` driver adapter (see
`lib/db/prisma.ts`).

| Model | Media-bearing columns |
| --- | --- |
| `User` | `image String?` |
| `Designer` | `image String` |
| `Product` | `hoverImage`, `heroImage String` |
| `ProductImage` | `url String`, `alt String?`, `sortOrder`, `isPrimary` |
| `Collection` | `image String` |
| `Material` | `image String` |
| `Flagship` | `image String`, `detail Json?` (heroImage/video/gallery) |
| `Project` | `image String`, `portfolioImages String[]` |
| `FlagshipOneFeature` / `ProjectBannerFeature` / `ProjectDarkBackgroundFeature` / `HomeCollectionFeature` / `CatalogueFeature` | `image String?` / `image String` |
| `OrderItem` | `image String` (immutable snapshot) |
| `AboutPageSection` / `S34PageSection` | image/video refs inside `content Json` |

**Conventions to follow:**
- `Localized { en, fa }` → one `Json` (jsonb) column; ordered `string[]`/object[]
  lists also `Json`; but `Project.portfolioImages` is a native `String[]`.
- `id` identifies the row, `slug` is the human/route handle; **FKs reference the
  parent's `id`**, never `slug`.
- Enum members use snake_case with `@map` when the source string has hyphens
  (`MaterialType.stone_composite @map("stone-composite")`).
- Every model is `@@map`ped to snake_case (`order_item`, `product_image`, …) and
  carries `createdAt @default(now())` / `updatedAt @updatedAt`.
- `SlugHistory` (`modelType`, `oldSlug`, `entityId`) backs 308 redirects via
  `lib/repositories/slug-history.ts#updateWithSlugHistory`.
- Migrations: 16 directories under `prisma/migrations/`, hand-named
  `YYYYMMDDHHMMSS_snake_case`. Config lives in `prisma7.config.ts`
  (`pnpm build` runs `prisma generate --config prisma7.config.ts`).

---

## 6. Repository / data-access conventions

`lib/repositories/*` — 18 modules:

- Reads are plain exported `const getX = cache(async …)` (React `cache()`, so
  request-scoped de-duping is real and is *tested* against the react-server build).
- Writes are `export const createX = async (input, db: Prisma.TransactionClient = prisma)` —
  the optional transaction client is the standard seam so a write can join a
  caller's `$transaction`.
- Repository mappers return the app's `lib/data/*` interfaces, not raw rows.
- "Narrow read" helpers (`getMaterialImageUrls`) exist purely so the cleanup pass
  can get URLs without loading a full DTO.

`lib/admin/result.ts` / `result-server.ts` — the structured action contract:
`AdminErrorCode` union (`invalid | required | tooLong | tooLarge | notImage |
slugTaken | notFound | relationViolation | selfTarget | unknown`),
`ActionResult<T>`, `actionOk`/`actionFail`, `zodIssuesToFieldIssues`,
`toActionResult(error)` (maps `P2002`→`slugTaken` on `slug`/`id`, `P2025`→`notFound`,
`P2003`→`relationViolation`; rethrows anything else).

`lib/admin/revalidate.ts` — `AdminSection` union + `revalidateCatalog(section, {id})`
with `PUBLIC_ROUTES`; note **`revalidateCatalog` currently has no `"media"` section**.

---

## 7. Existing tests (the tier structure the new tests must fit)

Four Vitest projects (`vitest.config.ts`), `pool: "forks"`, `fileParallelism: false`,
`maxWorkers: 1`:

| Project | Include | Nature |
| --- | --- | --- |
| `unit` | `tests/unit/**/*.test.ts` | pure, network-free |
| `integration` | `tests/integration/**` (excl. `auth/`) | real dev DB, read-only |
| `server` | `tests/server/**` | repositories + actions, real dev DB |
| `auth` | `tests/integration/auth/**` | boots real Next app over HTTP |

Directly relevant existing tests:

- `tests/unit/admin/image-sniff.test.ts` — JPEG/PNG/WebP/AVIF sniffing, the
  "script renamed .png" bypass, MP4/WAVE rejection, `safeBaseName` cases,
  `MAX_UPLOAD_BYTES === 5 MB`.
- `tests/unit/admin/blob.test.ts` — `isBlobUrl` / `removedUrls` pure predicates
  (never calls `deleteBlobUrls`).
- `tests/unit/admin/actions/{user-role-denied,no-session-denied,admins-denied,
  admin-and-owner-control}.test.ts` — hermetic `vi.mock` of `@/lib/auth/auth`,
  `next/headers`, `next/navigation`, `next/cache`, `@/lib/admin/result-server`
  and **every** repository module; asserts `redirect("/sign-in?denied=1")` and
  that no repo/`revalidatePath`/`refresh` was touched.
- `tests/unit/admin/access-owner-boundary.test.ts` — `requireOwnerAccess` matrix
  (admin → `/admin`, user/none → sign-in, owner → `"owner"`).
- `tests/helpers/db.ts` — `hasDatabaseUrl`, `expectLocalized`, `withRequestCache`.
- DB-tier lesson recorded in `.workbuddy-ai/memory/2026-09-30.md`: **every
  `$transaction` against the Neon dev DB needs an explicit `maxWait`**
  (default 2000 ms reads as an app bug but is pooler latency); use e.g.
  `{ maxWait: 30_000, timeout: 30_000 }`.

---

## 8. Environment variables

- `BLOB_READ_WRITE_TOKEN` — the only Blob variable, documented in `.env.example`
  (§Vercel Blob) and never hardcoded; `.env` stays git-ignored.
- `lib/env.ts` (`assertEnv`, called from `instrumentation.ts` at boot) validates
  `ZARINPAL_MERCHANT_ID` (shape only, never reachability) and notification
  delivery. It does **not** currently check the Blob token; Blob is treated as
  optional so the admin loads without it.
- `lib/db/prisma.ts` reads `DATABASE_URL` through `PrismaPg`.

---

## 9. Gaps this pass must close

1. **No persistence** — uploads return a URL that is only ever held in a form
   string; nothing records filename/size/mime/dimensions/alt.
2. **`@vercel/blob` is imported directly** in two modules; there is no storage
   interface, so a future Iranian provider would require touching action code.
3. **No `Media` model / no `media` section** — `AdminSection` and
   `revalidateCatalog` have no entry, and there is no `/admin/media` route.
   *(Gap closed in Step 2 — the `Media` model + `MediaType` enum now exist. The
   `revalidateCatalog` entry is still pending and lands with the media service.)*
4. **Cleanup is per-entity and URL-string based** (`isBlobUrl` + `removedUrls`),
   not key-based, and cannot see an orphan created when a DB write fails *after*
   a successful `put` (today `put` is the last step, so the case cannot arise —
   introducing metadata makes it possible and it must be handled).
5. **Duration/dimensions** are not captured; there is no `mediaType` enum.

## 10. Risks & constraints for the next steps

- **Do not touch** the URL-string contract of `ImageUpload` — every zod schema and
  every seeded/external URL depends on it (myPlan §7).
- **Do not raise** `MAX_UPLOAD_BYTES`/the server-action limit (myPlan §5); large
  video uploads are deferred to a later hardening pass.
- `addRandomSuffix: true` means the stored key is **not** the computed pathname —
  any `storageKey` column must be derived from `put()`'s returned blob, not
  reconstructed. (Vercel Blob is *not* S3-compatible; do not fake an S3 API.)
- Any new `$transaction` must pass an explicit `maxWait`.
- Adding a model requires a hand-named migration (`YYYYMMDDHHMMSS_add_media`),
  `prisma generate --config prisma7.config.ts`, and must remain additive — no
  existing image URL column may be dropped (myPlan §10).
