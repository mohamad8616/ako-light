import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output (never lint or hand-fix build artifacts):
    ".vitest/**",
    "coverage/**",
    // Tool/local data that must never be traversed by ESLint:
    ".continue/**",
    ".kilo/**",
  ]),
  {
    // TanStack Table's `useReactTable()` returns functions that React Compiler
    // cannot memoize safely, so the compiler deliberately SKIPS memoizing these
    // two components. That is the correct, intended behavior — the warning is
    // informational and cannot be "fixed" without dropping TanStack Table.
    //
    // Both components keep all table state in their own `useState`, and the
    // `table` instance is only read during render (never handed to a memoized
    // child), so skipping memoization is harmless. Scoped to exactly these two
    // files so the rule still guards every other component.
    files: [
      "components/admin/data-table/DataTable.tsx",
      "components/admin/dashboard/data-table.tsx",
    ],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
