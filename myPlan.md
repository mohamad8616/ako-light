## Plan — security-focused admin/auth test coverage

**Context gathered:** all 10 action modules under `lib/admin/actions/` follow the same contract (`await requireAdminAccess()` first → zod `safeParse` → repository → `toActionResult`), `lib/admin/access.ts` gates via `auth.api.getSession()` + `redirect()` (never returns on deny), `requireOwnerAccess()` exists but no `lib/admin/actions/admins/*` backend exists yet (owner/admin difference lives only in `lib/auth/permissions.ts` `impersonate-admins`), OTP is `allowedAttempts: 3` in `lib/auth/auth.ts` (better-auth `phoneNumber` plugin stores `Verification.value` as `otp:attempts`, deletes code + throws 403 `TOO_MANY_ATTEMPTS` on excess), `toActionResult` maps `P2002` on `slug`/`id` → `{formError:"invalid", issues:[{field, code:"slugTaken"}]}`, zod primitives in `lib/admin/schemas/common.ts` have **no max-length** (oversized-string finding expected).

### Step 1 — IDOR / direct-action access as `user` (req §1)
- **New file:** `tests/unit/admin/actions/access.test.ts` (unit tier: network-free, no Neon dependency).
- **Mocking (proven pattern — see `tests/unit/proxy.test.ts`, `tests/unit/admin/revalidate.test.ts`):**
  - `vi.mock("@/lib/auth/auth")` with hoisted `mockGetSession` returning `{ user: { role: "user" } }` — drives the *real* `requireAdminAccess()`, not a stub of it.
  - `vi.mock("next/headers")` (`headers()` → empty `Headers`), `vi.mock("next/navigation")` (`redirect()` throws `NEXT_REDIRECT`-tagged error — assert on that, matching Next semantics), `vi.mock("next/cache")` (`revalidatePath`/`refresh` no-ops).
  - `vi.spyOn` every repository write (`createProduct`, `updateProduct`, `deleteProduct`, … all 9 CRUD entities) — assert **not called**, proving the gate fires before persistence.
- **Coverage matrix (32 calls):** products, product-categories, designers, collections, materials, flagships, projects, fabrics, catalogue × create/update/delete (27) + homepage 5 singleton updates (`updateFlagshipOneFeatureAction`, `updateProjectBannerFeatureAction`, `updateProjectDarkBackgroundFeatureAction`, `updateHomeCollectionFeatureAction`, `updateCatalogueFeatureAction` — update-only by design, no create/delete to test).
- **Payloads:** reuse the valid fixtures from `tests/unit/admin/schemas/*.test.ts` so validation would pass and only the auth gate can reject; one assertion helper `expectRedirectDenied(promise, "/sign-in?denied=1")` keeps the 32 cases to ~1 line each.
- **Tradeoff:** unit-tier with mocked session vs live-DB test — live proves end-to-end but needs Neon + is slow/flaky; mocked is deterministic and directly proves "repository never touched", which is the IDOR property. DB-mutation safety additionally covered by spies.

### Step 2 — same matrix with no session (req §2)
- Same file, second `describe` with `mockGetSession.mockResolvedValue(null)` (raw unauthenticated POST simulation). Expect identical `/sign-in?denied=1` redirect + zero repository calls for all 32 actions.
- No extra mocking needed — shares Step 1 harness.

### Step 3 — owner-only boundary (req §3)
- **Finding to lock into the test:** no `lib/admin/actions/admins/*` or user-management backend exists (verified by search: only `requireOwnerAccess` in `lib/admin/access.ts` + `impersonate-admins` in `lib/auth/permissions.ts`, UI is placeholder). So there is **nothing to IDOR-test beyond the gate itself** — the test documents that.
- **New file:** `tests/unit/admin/access.test.ts`: `requireOwnerAccess()` with mocked roles — `admin` → redirect to `/admin` (rejected, proving admin ≠ owner), `owner` → returns `"owner"`, `user`/`null` → redirect to `/sign-in?denied=1`. Plus a permissions-matrix assertion (`ownerRole` has `impersonate-admins`, `adminRole` does not).
- **Value statement:** if a future `admins/*` action mistakenly calls `requireAdminAccess()` instead of `requireOwnerAccess()`, this file is where its regression test lands.

### Step 4 — OTP `allowedAttempts: 3` actually enforced (req §4)
- **Primary:** `tests/integration/otp-attempts.test.ts` (DB tier, `skipIf(!hasDatabaseUrl)`): mock `sendOtpSms`, `auth.api.sendPhoneNumberOTP` (or `phoneNumber.sendOtp`) once, then 3× wrong-code `verify` → expect 400 `INVALID_OTP`, 4th wrong-code verify → expect **distinct** 403 `TOO_MANY_ATTEMPTS` + `Verification` row deleted, and even the *correct* code now fails (code consumed). Asserts the config value is `3` by reading it off the auth options where possible.
- **Tradeoff / fallback:** better-auth's verify endpoint names differ across versions (`verifyPhoneNumber` vs `phoneNumber.verify` vs `consumePhoneNumberOTP`) — exact import resolved in Act mode against installed `better-auth@^1.6.29`. If the live endpoint proves un drivable without phone infra, fallback is a contract test (config === 3 + pure simulation of the `otp:attempts` counter semantics documented in the plugin) clearly labelled as such — never silently skipped.
- **Expected SHOULD-fail finding:** none hoped; if the 4th attempt returns the same 400 as the first 3 (no distinct 403), that is reported as "documented-but-unenforced".

### Step 5 — zod adversarial edge cases (req §5)
- **New file:** `tests/unit/admin/schemas/adversarial.test.ts` (pure, no DB):
  - `productFormSchema.images`: entry with `url: 42` (wrong type), `isPrimary: "yes"`, `alt: 123` (must be string|null), `images: "not-an-array"`, oversized `url` (10k chars — **expected to PASS, no max length: report as SHOULD-have-failed-but-didn't**), `images: null`.
  - `projectFormSchema.credits`: `42`, `null`, `""`, `{}`, `{en:"x"}` (half-pair), oversized plain string (10k chars — expected to PASS, same finding), array containing a bad entry mid-list.
  - Cross-check each rejection maps via `zodIssuesToFieldIssues` to `required`/`invalid` (never throws, never prose).
- **Tradeoff:** adding `.max()` lengths would fix the oversized finding but changes the contract + translations; out of scope — only *report* it.

### Step 6 — slug-collision → clean `slugTaken`, not raw P2002 (req §6)
- **New file:** `tests/server/slug-collision.test.ts` (`describe.skipIf(!hasDatabaseUrl)`, rolled-back transactions like `slug-change-fk.test.ts`):
  - Repository level: create two categories, `updateProductCategory(b, {…b, slug: a.slug})` → expect `P2002`.
  - Action level (with admin session mocked as in Step 1 + real DB): `updateProductCategoryAction` / `createProductAction` with colliding slug → expect `{ ok:false, formError:"invalid", issues:[{field:"slug",code:"slugTaken"}] }`, assert no `P2002` code/message leaks.
  - Cover one slug-entity (product-category) + one id-entity (fabric, `field:"id"`) to pin both branches of `toActionResult`.
- **Note:** existing `slug-change-fk.test.ts` covers rename-success FK preservation, not collision — no overlap.

### Step 7 — verify + report (req §7)
1. `npx tsc --noEmit` (must be clean before tests).
2. `pnpm test` (full `unit` + `integration` + `server` projects); on Neon `P1001` (cold-compute can't reach DB) retry once after ~60s, then report as infra-flake vs real failure.
3. Report: per-tier pass/fail counts, full failure output, and a dedicated **"SHOULD have failed but didn't"** section (expected candidates: oversized strings accepted due to no `.max()`; confirm whether `requireOwnerAccess` has any callable backend beyond the helper — currently none).

**Files to create (Act mode):** the 4 test files above. **Files to modify:** none (no prod code changes; `docs/testing.md` status line update optional). **Commands to run:** `npx tsc --noEmit`, `pnpm test`, plus targeted `pnpm vitest run <file>` during development.

> Toggle to **Act mode** so I can implement the 4 test files, run `tsc` + `pnpm test` (with the one P1001 retry), and report pass/fail counts plus anything that SHOULD have failed but didn't.
