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

const FORM = read(
  "../../../components/admin/catalog/projects/ProjectForm.tsx",
);
const ACTION = read("../../../lib/admin/actions/projects.ts");
const PROJECT_PAGE = read("../../../app/[locale]/(site)/projects/[id]/page.tsx");

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

  it("deletes the files of a DESTROYED project too", () => {
    // Ordering matters: capture the URLs, drop the row, then drop the files — a
    // failed delete leaves blobs referenced rather than deleting live files.
    const destroy = ACTION.slice(ACTION.indexOf("destroyProjectAction"));
    expect(destroy).toMatch(/projectImageUrls\(previous\)/);
    expect(destroy).toMatch(/deleteStorageUrls\(beforeUrls\)/);
  });
});

describe("the public project page survives a shortened gallery", () => {
  it("skips the positional sections when their photo is gone", () => {
    // `next/image` THROWS on a missing `src`, and the gallery is now editable —
    // so an unguarded index turned a removed photo into a 500 for the whole
    // project page.
    expect(PROJECT_PAGE).toMatch(/\{project\.portfolioImages\[0\] \? \(/);
    expect(PROJECT_PAGE).toMatch(/\{project\.portfolioImages\[1\] \? \(/);
  });

  it("falls back to an empty caption rather than an undefined one", () => {
    // `pick(undefined, lang)` throws; `pick("")` is a legal empty string.
    expect(PROJECT_PAGE).toMatch(/text=\{project\.moreDescription\[0\] \?\? ""\}/);
    expect(PROJECT_PAGE).toMatch(
      /caption=\{project\.moreDescription\[1\] \?\? ""\}/,
    );
  });
});
