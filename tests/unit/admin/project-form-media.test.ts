import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The project images are picked with the SHARED media field, not typed as links.
 *
 * WHAT THIS PINS
 *
 * The project form used to ask for `image` and every `portfolioImages` entry as a
 * raw URL — so the one thing an operator actually wants to do with a photo, put a
 * new one there, could only be done by uploading somewhere else and pasting a
 * link. Both now go through the same field the product and about forms use:
 * `ImageUpload` for the hero still, `ImageListField` for the gallery (upload,
 * pick from the library, preview, reorder, remove).
 *
 * Wiring that is only correct when several files agree, so each leg is asserted.
 * Static source assertions, not rendered-DOM ones: every vitest project here is
 * `environment: "node"` (see vitest.config).
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

/**
 * Comments stripped before matching. The page's own comment NAMES the
 * positional reads it no longer does (`portfolioImages[0]`), so a raw substring
 * search would "find" the very thing the assertion is checking is gone.
 */
const stripComments = (source: string) =>
  source
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const FORM = read(
  "../../../components/admin/catalog/projects/ProjectForm.tsx",
);
const ACTION = read("../../../lib/admin/actions/projects.ts");
const PROJECT_PAGE = stripComments(
  read("../../../app/[locale]/(site)/projects/[id]/page.tsx"),
);

describe("project form — the images use the shared media field", () => {
  it("the hero image is an ImageUpload bound to `image`", () => {
    expect(FORM).toMatch(/<ImageUpload\b/);
    expect(FORM).toMatch(/<ImageUpload[\s\S]{0,220}?name="image"/);
    expect(FORM).toMatch(/<ImageUpload[\s\S]{0,220}?folder="projects"/);
    // The column is NOT NULL, so the field stays required.
    expect(FORM).toMatch(/<ImageUpload[\s\S]{0,220}?required/);
  });

  it("the gallery is an ImageListField bound to `portfolioImages`", () => {
    expect(FORM).toMatch(/<ImageListField\b/);
    expect(FORM).toMatch(/<ImageListField[\s\S]{0,220}?name="portfolioImages"/);
    expect(FORM).toMatch(/<ImageListField[\s\S]{0,220}?folder="projects"/);
  });

  it("no longer offers a raw URL field for either image list", () => {
    // `StringListField` is the plain-URL list this replaced; a regression here
    // would silently take the upload control away again.
    expect(FORM).not.toMatch(/StringListField/);
    expect(FORM).not.toMatch(/<TextField[\s\S]{0,120}?name="image"/);
  });

  it("announces a rejected save instead of looking like a dead button", () => {
    // A client-side validation stop never calls the action, so without
    // `notifyInvalid` there is no request, no pending state and no toast.
    expect(FORM).toMatch(/const \{ run, pending, applyFieldIssues, notifyInvalid \}/);
    expect(FORM).toMatch(/\}, notifyInvalid\);/);
  });
});

describe("project images — replaced uploads are garbage-collected", () => {
  it("sweeps the dropped URLs AFTER the save", () => {
    // Uploads now land in the bucket, so a swapped-out photo would otherwise sit
    // there referenced by nothing, forever.
    expect(ACTION).toMatch(/deleteStorageUrls\(/);
    expect(ACTION).toMatch(/removedUrls\(/);
    expect(ACTION).toMatch(/getProjectAdminDetail\(id\)/);
  });

  it("covers BOTH the hero image and the gallery", () => {
    expect(ACTION).toMatch(/function projectImageUrls\([\s\S]*?portfolioImages/);
  });

  it("covers the two portfolio-SECTION overrides as well", () => {
    // They became upload targets with the rest of the media fields, so a
    // replaced section photo is a real orphan — leaving them out of the sweep
    // leaks one object per replacement, silently.
    const fn = ACTION.slice(
      ACTION.indexOf("function projectImageUrls"),
      ACTION.indexOf("}", ACTION.indexOf("function projectImageUrls")),
    );
    expect(fn).toMatch(/textImageUrl/);
    expect(fn).toMatch(/fullImageUrl/);
  });

  it("deletes the files of a DESTROYED project too", () => {
    // Ordering matters: capture the URLs, drop the row, then drop the files — a
    // failed delete leaves blobs referenced rather than deleting live files.
    const destroy = ACTION.slice(ACTION.indexOf("destroyProjectAction"));
    expect(destroy).toMatch(/projectImageUrls\(previous\)/);
    expect(destroy).toMatch(/deleteStorageUrls\(beforeUrls\)/);
  });
});

describe("the public project page reads the RESOLVED portfolio sections", () => {
  it("renders each section from the repository's resolved value, not an index", () => {
    // The sections used to be read positionally out of `portfolioImages`, so the
    // only way to change either photo was to change the gallery. They now come
    // resolved (an explicit override wins, otherwise the positional fallback),
    // and a `null` section is skipped — `next/image` THROWS on a missing `src`,
    // and the gallery is operator-editable.
    expect(PROJECT_PAGE).toMatch(
      /\{project\.textImageSection \? \(/,
    );
    expect(PROJECT_PAGE).toMatch(
      /\{project\.fullImageSection \? \(/,
    );
    expect(PROJECT_PAGE).toMatch(
      /image=\{project\.textImageSection\.image\}/,
    );
    expect(PROJECT_PAGE).toMatch(
      /caption=\{project\.fullImageSection\.caption\}/,
    );
    // The positional reads must be gone, or the page would ignore the overrides.
    expect(PROJECT_PAGE).not.toMatch(/portfolioImages\[0\]/);
    expect(PROJECT_PAGE).not.toMatch(/portfolioImages\[1\]/);
  });
});
