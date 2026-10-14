import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The admin's bilingual field tint.
 *
 * WHAT THIS PINS
 *
 * The dashboard edits EN and FA side by side, and the two halves looked
 * identical, so the wrong one got edited. The rule is: an LTR text field is
 * CREAM (#fbf8cc) and an RTL one is LIME (#ecf39e) — where "RTL" covers both an
 * explicit `dir="rtl"` and a field that declares no direction at all, because
 * the admin shell is RTL for every locale.
 *
 * Three properties make that work, and each is asserted here because each can
 * break silently:
 *
 *   1. The rule must sit OUTSIDE every `@layer`. Tailwind v4 emits its utilities
 *      — including the `bg-input/20` that the Input and Textarea primitives set
 *      — into the `utilities` layer, and an unlayered rule outranks every layer
 *      no matter how specific the layered one is. Wrapped in a layer, the tint
 *      would simply never paint, with nothing in the build to say so.
 *   2. It must be scoped to `[data-admin-shell]`. The public site's search box
 *      sets `dir` as well, and tinting it would be a public-site bug.
 *   3. The scope has to REACH the fields. Admin dialogs portal to
 *      `document.body`, i.e. outside the layout's wrapper, so every admin
 *      `DialogContent` carries the marker too.
 *
 * Static source assertions, not rendered-DOM ones: every vitest project here is
 * `environment: "node"` (see vitest.config), and what broke is a property of the
 * stylesheet and the class list, not of a render tree.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const GLOBALS_CSS = read("../../../app/globals.css").replace(/\r\n/g, "\n");
const ADMIN_LAYOUT = read("../../../app/[locale]/(admin)/layout.tsx");

const LTR_TINT = "#fbf8cc";
const RTL_TINT = "#ecf39e";

const LTR_SELECTOR = '[data-admin-shell] [data-slot="input"][dir="ltr"]';
const RTL_SELECTOR = '[data-admin-shell] [data-slot="input"]:not([dir="ltr"])';

/** Comment bodies removed, so braces in prose cannot skew the depth count. */
const CSS_CODE = GLOBALS_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** How many blocks are still open at `index`; 0 means "not inside any block". */
function braceDepthAt(source: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") depth -= 1;
  }
  return depth;
}

/** The declarations of the rule whose selector starts at `selector`. */
function declarationsFor(selector: string): string {
  const start = CSS_CODE.indexOf(selector);
  expect(start, `no rule for ${selector}`).toBeGreaterThan(-1);
  const open = CSS_CODE.indexOf("{", start);
  const close = CSS_CODE.indexOf("}", open);
  return CSS_CODE.slice(open + 1, close);
}

/** The selector list that owns the declaration at `index`. */
function selectorOwning(index: number): string {
  const open = CSS_CODE.lastIndexOf("{", index);
  const previousClose = CSS_CODE.lastIndexOf("}", open);
  return CSS_CODE.slice(previousClose + 1, open);
}

describe("admin field tint — the rule", () => {
  it("paints LTR fields cream and RTL (or direction-less) fields lime", () => {
    expect(declarationsFor(LTR_SELECTOR)).toContain(LTR_TINT);
    expect(declarationsFor(RTL_SELECTOR)).toContain(RTL_TINT);
  });

  it("covers the textarea of both directions, not only the single-line input", () => {
    // Most editable copy (descriptions, paragraphs) is a textarea, so a rule
    // that matched only `[data-slot="input"]` would miss the majority of fields.
    expect(CSS_CODE).toContain(
      '[data-admin-shell] [data-slot="textarea"][dir="ltr"]',
    );
    expect(CSS_CODE).toContain(
      '[data-admin-shell] [data-slot="textarea"]:not([dir="ltr"])',
    );
  });

  it("uses each tint exactly once, and never outside the admin shell", () => {
    let seen = 0;
    for (const colour of [LTR_TINT, RTL_TINT]) {
      let index = CSS_CODE.indexOf(colour);
      while (index !== -1) {
        seen += 1;
        expect(
          selectorOwning(index),
          `${colour} is used by a rule that is not admin-scoped`,
        ).toContain("[data-admin-shell]");
        index = CSS_CODE.indexOf(colour, index + 1);
      }
    }
    expect(seen, "expected exactly one declaration per tint").toBe(2);
  });

  it("is UNLAYERED, because Tailwind's utilities layer would otherwise win", () => {
    for (const selector of [LTR_SELECTOR, RTL_SELECTOR]) {
      const depth = braceDepthAt(CSS_CODE, CSS_CODE.indexOf(selector));
      expect(
        depth,
        `${selector} must sit outside every @layer to outrank the primitives`,
      ).toBe(0);
    }
  });
});

/** Every `.tsx` under `components/admin`, recursively. */
function adminTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) adminTsxFiles(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** The full opening tag of every `<DialogContent …>` in `source`. */
function dialogContentTags(source: string): string[] {
  const tags: string[] = [];
  const opener = /<DialogContent\b/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source)) !== null) {
    let i = match.index + match[0].length;
    let depth = 0;
    // Walk to the `>` that closes the tag, ignoring `{...}` expression bodies.
    while (i < source.length) {
      const char = source[i];
      if (char === "{" || char === "(" || char === "[") depth += 1;
      else if (char === "}" || char === ")" || char === "]") depth -= 1;
      else if (char === ">" && depth === 0) break;
      i += 1;
    }
    tags.push(source.slice(match.index, i + 1));
  }
  return tags;
}

describe("admin field tint — the scope reaches the fields", () => {
  it("marks the admin shell in the layout", () => {
    expect(ADMIN_LAYOUT).toMatch(
      /<SidebarProvider[\s\S]{0,600}?data-admin-shell/,
    );
  });

  it("marks EVERY admin dialog, whose popup portals out of the shell", () => {
    const unmarked: string[] = [];
    let total = 0;

    for (const file of adminTsxFiles(
      join(here, "../../../components/admin"),
    )) {
      const source = readFileSync(file, "utf8");
      for (const tag of dialogContentTags(source)) {
        total += 1;
        if (!tag.includes("data-admin-shell")) unmarked.push(file);
      }
    }

    // Non-vacuous: the scan has to actually be finding the dialogs.
    expect(total, "expected to find the admin dialogs").toBeGreaterThanOrEqual(
      10,
    );
    expect(unmarked, "admin dialogs missing data-admin-shell").toEqual([]);
  });
});
