import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
