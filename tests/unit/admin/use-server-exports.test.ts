/**
 * Contract: a `"use server"` module may only export ASYNC FUNCTIONS.
 *
 * ── Why this test exists ────────────────────────────────────────────────────
 *
 * Pass C.4 shipped `lib/admin/actions/upload.ts` with
 *
 *     export const CATALOGUE_PDF_FOLDER = "catalogue";
 *
 * alongside its actions. Next's compiler rejects that — "Only async functions
 * are allowed to be exported in a \"use server\" file" — and it does not fail
 * quietly or partially: **the whole module ends up with no exports at all**.
 *
 * The blast radius was the entire client graph that imports it. `ImageUpload`
 * and `PdfUpload` both import actions from that module, so
 * `app/[locale]/(admin)/admin/homepage/[slot]/page.tsx` failed to build, the
 * form never hydrated, and the operator saw a Save button that did NOTHING —
 * no request, no toast, no error — while the DB row stayed untouched. Nothing
 * about that symptom points at a constant in an unrelated module, so it cost a
 * long debugging session. This test turns it into a one-line failure.
 *
 * ── What is checked, and what is deliberately NOT ───────────────────────────
 *
 * BANNED (a value exported from a server-action module):
 *   `export const|let|var`, `export function` (non-async), `export class`,
 *   `export default function` (non-async).
 *
 * ALLOWED: `export async function` (the point of the directive), `export type`
 * and `export interface` (erased at compile time, so not runtime exports), and
 * a BARE re-export such as `export { MAX_ITEM_QUANTITY }` in
 * `lib/actions/checkout.ts`. The bare form is not a new binding and is
 * tolerated by the compiler — verified by observation, not assumption: that
 * module compiles cleanly in the dev server while the `export const` form in
 * `upload.ts` did not.
 *
 * Hermetic: reads files from disk, starts nothing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCAN_DIRS = ["lib", "app", "components"];

/** Directories that never contain source we ship. */
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "generated"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Drop block and line comments, CRLF-SAFELY.
 *
 * The CRLF part is not paranoia: `tests/unit/ui/dialog-contract.test.ts` spent
 * a long time red on a CORRECT component because `\r` is a line terminator for
 * `.`, so a `/\/\/.*$/` pattern never matched on a Windows checkout and a
 * comment naming the very class under assertion leaked into it. Normalise the
 * line endings first, and anchor with `[\s\S]` rather than `$`.
 */
function stripComments(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** The directive must be the first statement, before any import. */
function isServerModule(source: string): boolean {
  const head = source.split("\n").slice(0, 3).join("\n");
  return /^\s*["']use server["']/.test(head) || /^\s*(?:\/\/[^\n]*\n)*["']use server["']/.test(head);
}

/** The offending `export …` lines in a `"use server"` module. */
function violations(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];

  for (const line of code.split("\n")) {
    const text = line.trim();
    if (!text.startsWith("export ")) continue;

    // Async function — the only thing the directive allows.
    if (/^export\s+(default\s+)?async\s+function\b/.test(text)) continue;
    // Types are erased before the "only async functions" rule is applied.
    if (/^export\s+(type|interface)\b/.test(text)) continue;
    // A bare re-export introduces no new binding (see the file header).
    if (/^export\s*(\{|\*)/.test(text)) continue;
    // A default export of an identifier we cannot resolve statically.
    if (/^export\s+default\s+[A-Za-z_$][\w$]*\s*;?$/.test(text)) continue;

    if (
      /^export\s+(const|let|var)\b/.test(text) ||
      /^export\s+class\b/.test(text) ||
      /^export\s+(default\s+)?function\b/.test(text)
    ) {
      found.push(text);
    }
  }

  return found;
}

describe('"use server" modules export only async functions', () => {
  const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));

  it("scans a non-trivial number of files (guards against a vacuous pass)", () => {
    // A discovery bug that finds nothing would make every assertion below pass
    // for the wrong reason — exactly the failure mode this test exists to stop.
    expect(files.length).toBeGreaterThan(200);
  });

  it("finds the server-action modules it is meant to police", () => {
    const serverModules = files.filter((file) =>
      isServerModule(readFileSync(file, "utf8")),
    );

    // The admin actions directory alone holds a couple of dozen of these; a
    // handful would mean the directive sniffing is broken.
    expect(serverModules.length).toBeGreaterThan(15);
    // ...and at least one of them must be the module whose breakage motivated
    // this test, so a rename cannot silently make the scan meaningless.
    expect(
      serverModules.some((file) => file.endsWith(join("admin", "actions", "upload.ts"))),
    ).toBe(true);
  });

  it("has no non-async export in any server-action module", () => {
    const offenders = files
      .filter((file) => isServerModule(readFileSync(file, "utf8")))
      .flatMap((file) => {
        const bad = violations(readFileSync(file, "utf8"));
        return bad.map((line) => `${relative(ROOT, file).replace(/\\/g, "/")}: ${line}`);
      });

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("would actually catch the bug it was written for", () => {
    // The detector is exercised against the exact line that shipped broken, so
    // this file cannot rot into a tautology.
    const broken = `"use server";\n\nexport const CATALOGUE_PDF_FOLDER = "catalogue";\n`;
    expect(isServerModule(broken)).toBe(true);
    expect(violations(broken)).toHaveLength(1);

    // ...and it does not flag the shapes that are legal.
    const fine = `"use server";\n\nexport async function go() {}\nexport type T = string;\nexport { MAX };\n`;
    expect(violations(fine)).toEqual([]);
  });
});
