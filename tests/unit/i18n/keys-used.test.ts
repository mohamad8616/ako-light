import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { adminTranslations } from "@/lib/i18n/admin-strings";
import { translations } from "@/lib/i18n/translations";

/**
 * Every `t("literal")` in the codebase must name a key that EXISTS.
 *
 * ── Why this test exists ─────────────────────────────────────────────────────
 *
 * `LanguageProvider.t` falls back to the KEY ITSELF when a lookup misses, so a
 * typo does not throw, does not log, and does not fail a type-check (the key is
 * just a string) — it renders the raw key in the UI. That is exactly what
 * happened to the homepage video section: it asked for `t("video.brand")`, a key
 * that has never existed in either dictionary, so the placeholder painted the
 * literal text "video.brand" over the video. The existing dictionary test only
 * checks that the two languages AGREE with each other, which cannot see a key
 * that is missing from both.
 *
 * The scan is static (no renderer), matching the rest of the `unit` tier. Keys
 * built at runtime — `t(`admin.error.${code}`)` — are template literals and are
 * deliberately NOT collected: their shape is pinned by the closed
 * `AdminErrorCode` union instead.
 */

const ROOT = process.cwd();

/** CRLF-safe comment stripping — see tests/unit/ui/dialog-contract.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The dictionary modules define the keys; they do not look them up.
      if (path.endsWith(join("lib", "i18n", "translations"))) continue;
      sourceFiles(path, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

/** `t("a.b.c")` — plain literals only; templates are handled elsewhere. */
const T_CALL = /\bt\(\s*"([^"]+)"\s*\)/g;

function keysUsedIn(dirs: readonly string[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const dir of dirs) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const source = stripComments(readFileSync(file, "utf8"));
      for (const match of source.matchAll(T_CALL)) {
        const key = match[1];
        if (!found.has(key)) found.set(key, relative(ROOT, file));
      }
    }
  }
  return found;
}

/** The admin shell is its own dictionary, so the two are checked separately. */
const PUBLIC_DIRS = ["components", "app", "lib"] as const;

function missingKeys(
  used: Map<string, string>,
  dictionary: Record<string, string>,
  isAdminFile: (file: string) => boolean,
  wantAdmin: boolean,
): string[] {
  const missing: string[] = [];
  for (const [key, file] of used) {
    if (isAdminFile(file) !== wantAdmin) continue;
    if (!(key in dictionary)) missing.push(`${key}  (${file})`);
  }
  return missing.sort();
}

const isAdminFile = (file: string) =>
  file.startsWith(join("components", "admin")) ||
  file.startsWith(join("lib", "admin"));

describe("every t() key in the source exists in its dictionary", () => {
  const used = keysUsedIn(PUBLIC_DIRS);

  it("scans a non-vacuous number of keys", () => {
    // Guards the guard: a regex or walker regression would otherwise make both
    // assertions below pass by finding nothing.
    expect(used.size).toBeGreaterThan(100);
  });

  it("has no missing PUBLIC key (the video.brand class of bug)", () => {
    expect(missingKeys(used, translations.en, isAdminFile, false)).toEqual([]);
  });

  it("has no missing ADMIN key", () => {
    expect(missingKeys(used, adminTranslations.en, isAdminFile, true)).toEqual(
      [],
    );
  });

  it("no longer references the never-defined video.brand key", () => {
    expect(used.has("video.brand")).toBe(false);
    // …and the brand placeholder it should use does exist, in both languages.
    expect(translations.en["video.akoLighting"]).toBeTruthy();
    expect(translations.fa["video.akoLighting"]).toBeTruthy();
  });
});
