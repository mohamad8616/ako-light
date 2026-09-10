import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration (Pass 8.5 testing foundation).
 *
 * - `node` environment: this checkpoint tests pure application logic
 *   (routing, localization, data helpers, SEO metadata). No jsdom/Renderer
 *   environment is needed yet — component and E2E tests are later
 *   checkpoints.
 * - `@` aliases to the repository root so tests can import modules with the
 *   same specifier the app uses ("@/lib/...").
 */
const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});