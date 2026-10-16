import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The category dialog's shape after the i18nKey field was removed.
 *
 * Reported: "in create new category modal or edit an existing category, there
 * is a form input for i18n key, I don't need that. I want it be automatic."
 *
 * The value is derived server-side now — that half of the contract is pinned in
 * `tests/unit/admin/project-i18n-key.test.ts` (which asserts the action's
 * `withI18nKey` and that the schema neither requires nor forwards the key).
 * These are the UI half: the form offers only what the operator owns, and it is
 * wide enough for the paired EN | FA row to be usable.
 *
 * STATIC source assertions rather than rendered-DOM ones: the `unit` tier is
 * node-only (no jsdom / React renderer in this project), matching every other
 * contract test in this directory.
 */

const ROOT = process.cwd();

const SOURCE = readFileSync(
  join(
    ROOT,
    "components",
    "admin",
    "catalog",
    "product-categories",
    "ProductCategoriesTable.tsx",
  ),
  "utf8",
);

/**
 * Source with comments removed.
 *
 * Load-bearing for the negative assertion below: the file DOCUMENTS the width
 * it moved away from (the comment explains that `sm:max-w-lg` squeezed the
 * paired fields), so a raw substring search would match the prose and report a
 * failure on correct code. `\r\n` is normalised first because `\r` is a line
 * terminator for `.`.
 */
const TABLE = SOURCE.replace(/\r\n?/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("category dialog — the i18n key is not an input", () => {
  it("renders no i18nKey field", () => {
    // The table still SHOWS the derived key as a read-only column, so the file
    // does mention it — the assertion is on the editable control.
    expect(TABLE).not.toMatch(/name="i18nKey"/);
  });

  it("does not seed the form with an i18nKey", () => {
    // The seed must describe exactly what the form owns. A key riding along
    // would be stripped by the schema anyway, but it would also make the
    // create and edit seeds differ for no reason.
    const fromSeed = TABLE.slice(TABLE.indexOf("const seed = React.useMemo("));
    const seedBody = fromSeed.slice(0, fromSeed.indexOf(");"));
    expect(seedBody).not.toMatch(/i18nKey/);
  });
});

describe("category dialog — wide enough for the EN | FA pair", () => {
  it("uses the 2xl content width rather than the old lg", () => {
    // The name field is a paired EN | FA grid. At `sm:max-w-lg` (512px) each
    // half was squeezed to ~228px, which is why the dialog was widened.
    expect(TABLE).toMatch(/sm:max-w-2xl/);
    expect(TABLE).not.toMatch(/sm:max-w-lg/);
  });
});
