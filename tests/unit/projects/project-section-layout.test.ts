import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The project page's paragraphs must not overflow the viewport.
 *
 * WHAT THIS PINS
 *
 * An operator pasted a run of unbroken characters into a section's text field.
 * Because the token had no space to wrap at, the browser let the line run past
 * its box and past the viewport: the page grew a horizontal scrollbar and the
 * text could only be read by dragging sideways.
 *
 * Two things have to be true together, and each is asserted here because neither
 * works alone:
 *
 *   1. `overflow-wrap: break-word` (`break-words`) on the paragraph — gives the
 *      browser permission to break INSIDE a long word. Without it there is
 *      simply nowhere to wrap.
 *   2. `min-w-0` on the flex/grid ANCESTORS — a flex or grid item defaults to
 *      `min-width: auto` and refuses to shrink below its widest word, so it
 *      widens its container (and the page) before the paragraph ever gets a
 *      chance to wrap. `break-words` does NOT change intrinsic sizing, so
 *      `min-w-0` is required separately.
 *
 * Also pinned: the text+image block is a SINGLE column. It used to be a
 * two-column row on `lg+` with the paragraph in a 40% column, which wraps every
 * few words.
 *
 * Static source assertions, not rendered-DOM ones: every vitest project here is
 * `environment: "node"` (see vitest.config). Comments are stripped before
 * matching — these files DOCUMENT the class names they no longer use, so a raw
 * substring search would "find" the very thing being asserted absent.
 */

const here = dirname(fileURLToPath(import.meta.url));

const code = (relative: string) =>
  readFileSync(join(here, relative), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PARAGRAPH = code("../../../utility/Paragraph.tsx");
const TEXT_IMAGE = code(
  "../../../components/projects/project/ProjectTextImageSection.tsx",
);
const FULL_IMAGE = code(
  "../../../components/projects/project/ProjectFullImageSection.tsx",
);
const INFO = code(
  "../../../components/projects/project/ProjectInfoSection.tsx",
);

describe("a long unbreakable token can never widen the page", () => {
  it("the shared paragraph breaks inside a long word", () => {
    expect(PARAGRAPH).toMatch(/break-words/);
  });

  it("the text+image block lets its column shrink", () => {
    // The paragraph's own `break-words` only applies once the box may shrink.
    expect(TEXT_IMAGE).toMatch(/min-w-0/);
  });

  it("the full-image caption block lets its column shrink", () => {
    expect(FULL_IMAGE).toMatch(/min-w-0/);
  });

  it("both grid columns of the info section let themselves shrink", () => {
    // A grid item is `min-width: auto` by default, so a long token in the
    // description would widen the 2fr column and then the whole grid.
    const minWidthZero = INFO.match(/min-w-0/g) ?? [];
    expect(minWidthZero.length).toBeGreaterThanOrEqual(2);
  });

  it("credit lines break inside a long word too", () => {
    // Credits are raw <p> elements, not `Paragraph`, so they need their own
    // guard — they are operator-entered like everything else here.
    const credits = INFO.slice(
      INFO.indexOf("project.credits.map"),
      INFO.indexOf("project.credits.map") + 400,
    );
    expect(credits).toMatch(/break-words/);
  });
});

describe("the text+image block is ONE column", () => {
  it("stacks, with no desktop row", () => {
    expect(TEXT_IMAGE).toMatch(/flex flex-col/);
    expect(TEXT_IMAGE).not.toMatch(/lg:flex-row/);
  });

  it("gives the paragraph no fixed column width", () => {
    expect(TEXT_IMAGE).not.toMatch(/lg:w-\[40%\]/);
    expect(TEXT_IMAGE).not.toMatch(/lg:w-\[60%\]/);
    expect(TEXT_IMAGE).not.toMatch(/lg:order-/);
  });

  it("sizes the photo for the full width it now occupies", () => {
    // It was `(min-width: 1024px) 60vw, 100vw` when it shared the row.
    expect(TEXT_IMAGE).toMatch(/sizes="100vw"/);
    expect(TEXT_IMAGE).not.toMatch(/60vw/);
  });
});

describe("the full-image caption is a normal paragraph", () => {
  it("is not pinned into the narrower `max-w-md` column", () => {
    // `max-w-md` (28rem) is narrower than the `max-w-prose` measure every other
    // paragraph on the site uses, so the same caption wrapped differently here.
    expect(FULL_IMAGE).not.toMatch(/max-w-md/);
  });
});
