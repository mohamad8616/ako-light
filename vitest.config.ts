import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import AIReporter from "vitest-ai-reporter";

/**
 * Vitest configuration (Pass 8.5 testing foundation, extended in Pass 10.5).
 *
 * - `node` environment everywhere: the tiers test pure logic, then database
 *   reads. No jsdom/Renderer environment is needed yet — component and E2E
 *   tests are later checkpoints.
 * - `@` aliases to the repository root so tests can import modules with the
 *   same specifier the app uses ("@/lib/...").
 * - Three projects (`test.projects`):
 *   - `unit`         — pure logic, network-free (Pass 8.5).
 *   - `integration`  — schema/seed integrity against the real dev database
 *                      (Pass 9.5).
 *   - `server`       — repository/data-access tier against the real dev
 *                      database (Pass 10.5). This project resolves `react` to
 *                      the **react-server build** (the build Next.js hands to
 *                      server components). The client build's `cache()` export
 *                      is a passthrough stub, so the repositories' React
 *                      `cache()` wrapping can only be exercised (and its
 *                      request-scope de-duping proven) against the server
 *                      build — see `tests/helpers/db.ts#withRequestCache`.
 *   - `auth`         — authentication tier (Pass 11.5): boots the real Next.js
 *                      app in-process and drives `app/api/auth/[...all]` over
 *                      HTTP against the real dev database, so route handlers,
 *                      cookies and the better-auth plugins are all exercised
 *                      end-to-end rather than through `auth.api.*`.
 */
const root = fileURLToPath(new URL("./", import.meta.url));
const reactServerBuild = fileURLToPath(
  new URL("./node_modules/react/react.react-server.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    reporters: [new AIReporter()],
    // DB-tier serialization (fabric_item 11-vs-10 drift + product-categories
    // count race): the `server` and `integration` projects share one dev
    // database, and Vitest schedules projects/files concurrently by default.
    // Even with every write rolled back, a count-assertion in one project can
    // interleave with an open (not-yet-rolled-back) transaction in the other
    // and observe its uncommitted rows. `fileParallelism: false` +
    // `maxWorkers: 1` forces test FILES to run strictly one-at-a-time across
    // ALL projects, so no two DB-touching files ever overlap. Slower, but
    // this exact flake has "looked fixed" three times on parallelism.
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          // `tests/integration/auth/**` is owned by the `auth` project below
          // (it boots the real Next app — a much heavier harness). Without
          // this exclusion the glob would also collect those files, so every
          // auth test would run TWICE: once under `integration` and once under
          // `auth`. The second run boots a second in-process Next dev server
          // against the same `.next/dev` directory, and the first server's
          // teardown leaves the route manifests in a partial state — which is
          // exactly what turned the whole `/api/auth/*` surface into 404s.
          exclude: ["tests/integration/auth/**"],
          include: ["tests/integration/**/*.test.ts"],
          // These tiers talk to the remote dev database; hook + test defaults
          // (10s / 5s) are too tight for a cold connection to Neon.
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
      {
        resolve: {
          alias: {
            "@": root,
            react: reactServerBuild,
          },
        },
        test: {
          name: "server",
          environment: "node",
          include: ["tests/server/**/*.test.ts"],
          // Action-tier tests do 2-3 sequential real DB writes each — more
          // round-trips than a typical repository test, hence more exposed to
          // connection-pressure delays against the remote dev DB.
          hookTimeout: 60_000,
          testTimeout: 60_000,
        },
      },
      {
        test: {
          name: "auth",
          environment: "node",
          include: ["tests/integration/auth/**/*.test.ts"],
          // Hard-blocks the two external gateways this tier drives for real:
          //   - the SMS gateway (lib/auth/sms.ts for OTP, and
          //     lib/notifications/sms.ts for order receipts). Next re-loads
          //     .env during prepare(), so unsetting the key alone is not enough.
          //   - ZarinPal, so the checkout callback route can be exercised
          //     end-to-end without a sandbox credential or moving real money.
          // Both guards chain to the previously installed `fetch`, so they
          // compose instead of clobbering one another.
          setupFiles: [
            "tests/helpers/auth-sms-guard.ts",
            "tests/helpers/zarinpal-guard.ts",
          ],
          // The first request after `next({ dev: true }).prepare()` compiles
          // the route on demand and can take tens of seconds on a cold cache;
          // the real DB round-trips of this tier add to it.
          hookTimeout: 180_000,
          testTimeout: 120_000,
        },
      },
    ],
  },
});
