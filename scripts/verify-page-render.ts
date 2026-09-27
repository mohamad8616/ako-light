/**
 * Part E — "both pages render identically to before the migration".
 *
 * Compares the BUILD'S PRERENDERED HTML for /about and /s34 (both locales)
 * against the translation-dictionary copy those pages used to render. The
 * dictionary is the pre-migration baseline: if every `about.*` / `s34.*` value
 * still appears in the rendered page — visible text, plus image alt attributes
 * — and no raw translation key leaks, the pages render the same copy they did
 * before the content moved into the database.
 *
 * `about.hero.play` is included on purpose: Part A classified it as UI chrome,
 * so it must STILL come from the dictionary after the migration.
 *
 * Run AFTER `pnpm run build`: npx tsx scripts/verify-page-render.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { aboutEn, aboutFa } from "@/lib/i18n/translations/about";
import { s34En, s34Fa } from "@/lib/i18n/translations/s34";

const APP_DIR = join(process.cwd(), ".next", "server", "app");

type Replacer = string | ((match: string, ...groups: string[]) => string);

const ENTITIES: [RegExp, Replacer][] = [
  [
    /&#x([0-9a-f]+);/gi,
    (_match, hex) => String.fromCodePoint(parseInt(hex, 16)),
  ],
  [/&#(\d+);/g, (_match, dec) => String.fromCodePoint(Number(dec))],
  [/&quot;/g, '"'],
  [/&apos;/g, "'"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&nbsp;/g, " "],
  [/&amp;/g, "&"],
];

/** Decodes entities and folds the apostrophe/dash variants React emits. */
function decode(value: string): string {
  let out = value;
  for (const [pattern, replacement] of ENTITIES) {
    out =
      typeof replacement === "function"
        ? out.replace(pattern, replacement)
        : out.replace(pattern, replacement);
  }
  return out
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Markup with every <script> body removed — i.e. what a visitor can see. */
function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

type Dictionary = Record<string, string>;

interface PageCase {
  label: string;
  file: string;
  dictionary: Dictionary;
  /** Alt texts are attributes, never visible text — checked in the markup. */
  attrOnlyKeys?: string[];
}

const cases: PageCase[] = [
  { label: "/en/about", file: join(APP_DIR, "en", "about.html"), dictionary: aboutEn },
  { label: "/fa/about", file: join(APP_DIR, "fa", "about.html"), dictionary: aboutFa },
  { label: "/en/s34", file: join(APP_DIR, "en", "s34.html"), dictionary: s34En },
  { label: "/fa/s34", file: join(APP_DIR, "fa", "s34.html"), dictionary: s34Fa },
];

const ALT_KEYS = new Set([
  "about.brandStory.block1Alt",
  "about.brandStory.block2Alt",
]);

let failures = 0;

for (const testCase of cases) {
  const html = readFileSync(testCase.file, "utf8");
  const markup = decode(html);
  const text = visibleText(html);

  console.log(`\n${testCase.label}`);

  for (const [key, value] of Object.entries(testCase.dictionary)) {
    const expected = decode(value);
    if (!expected) continue;

    // Every value must survive somewhere in the rendered markup.
    if (!markup.includes(expected)) {
      console.error(`  MISSING from markup  ${key}`);
      failures++;
      continue;
    }
    // ...and, unless it is an alt attribute, it must be visible on the page.
    if (!ALT_KEYS.has(key) && !text.includes(expected)) {
      console.error(`  NOT VISIBLE         ${key}`);
      failures++;
      continue;
    }
    // A value equal to its own key means a missing translation rendered raw.
    if (markup.includes(key)) {
      console.error(`  RAW KEY LEAKED      ${key}`);
      failures++;
      continue;
    }
    console.log(`  ok  ${key}`);
  }
}

console.log(
  failures === 0
    ? "\nPASS: every migrated about.*/s34.* value renders exactly as before, no key leaks."
    : `\nFAIL: ${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);