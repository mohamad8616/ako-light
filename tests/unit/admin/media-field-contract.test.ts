/**
 * Pass D.1 — the admin media field's contract.
 *
 * ── Why a source contract rather than a render test ─────────────────────────
 *
 * The project has no DOM test environment (vitest.config.ts runs every tier in
 * `node`, and says so: "component and E2E tests are later checkpoints"), and
 * `MediaField` imports Server Actions, which a hermetic unit test must never
 * load. So the RENDERED behaviour is pinned the way this codebase already pins
 * component shape — `tests/unit/ui/dialog-contract.test.ts` — by asserting the
 * structural facts that, if broken, are the bug.
 *
 * The pure decision logic is covered separately and exhaustively by
 * `tests/unit/media/media-preview.test.ts`; this file covers the WIRING between
 * that decision and the element that paints it, which is what actually broke.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Drop comments, CRLF-SAFELY.
 *
 * Not paranoia: `tests/unit/ui/dialog-contract.test.ts` was red for a long time
 * on a CORRECT component because `\r` is a line terminator for `.`, so a
 * `/\/\/.*$/` pattern never matched on a Windows checkout and a comment naming
 * the very class under assertion leaked into it.
 */
function stripComments(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const mediaField = stripComments(
  readFileSync(join(ROOT, "components/admin/MediaField.tsx"), "utf8"),
);
const imageUpload = stripComments(
  readFileSync(join(ROOT, "components/admin/ImageUpload.tsx"), "utf8"),
);

describe("MediaField — the shared image/video field", () => {
  it("derives the preview from the FORM VALUE, not from local state", () => {
    // A local copy of the URL is exactly how a preview goes stale: the upload
    // writes the form, and the preview must follow the form.
    expect(mediaField).toContain("watch(name)");
  });

  it("decides the preview through the tested pure helper", () => {
    expect(mediaField).toContain("mediaPreviewState(");
  });

  it("renders the value itself — both an <img> and a <video>", () => {
    expect(mediaField).toContain("<img");
    expect(mediaField).toContain("<video");
    // ...bound to the resolved url, not to a literal or a stale prop.
    expect(mediaField).toContain("src={preview.url}");
  });

  it("handles a load failure on BOTH elements", () => {
    // Two `onError` bindings: the image branch and the video branch. If only
    // one survives, one kind of field silently loses its fallback.
    const bindings = mediaField.match(/onError=\{\(\) => setFailedUrl\(/g) ?? [];
    expect(bindings).toHaveLength(2);
  });

  it("shows the broken-URL fallback instead of the browser's glyph", () => {
    expect(mediaField).toContain("admin.upload.previewUnavailable");
  });

  it("writes the uploaded URL into the field on success", () => {
    expect(mediaField).toContain("setValue(name, outcome.url");
  });

  it("reports a failed upload instead of failing silently", () => {
    expect(mediaField).toContain("admin.error.${outcome.code}");
  });

  it("clears the field with an empty string, the shared 'not configured' value", () => {
    expect(mediaField).toContain('setValue(name, ""');
  });

  it("accepts the file types of the field's kind", () => {
    expect(mediaField).toContain("ACCEPT[kind]");
    expect(mediaField).toContain("video/mp4");
    expect(mediaField).toContain("image/jpeg");
  });

  it("restricts the library picker to the field's kind", () => {
    // Without this a video field offers stills, and a video chosen for an image
    // field would be stored as one.
    expect(mediaField).toContain("mediaType={kind}");
  });

  it("re-picking the SAME file fires change again", () => {
    // A cleared input is what makes a repeated pick observable; without it the
    // second pick of one file is a silent no-op.
    expect(mediaField).toContain("event.target.value = \"\"");
  });

  it("deletes the stored object when the field is OPTIONAL", () => {
    expect(mediaField).toContain("removeMediaUrlAction({ url: removed })");
  });

  it("does NOT delete the object when the field is REQUIRED", () => {
    // A cleared required field can never be saved — the schema is `.min(1)` —
    // so deleting the object would destroy a file the database still points at,
    // breaking the live page with no way back. The clear is the whole edit; the
    // owning action's sweep deletes the file once a replacement is saved.
    expect(mediaField).toContain("if (required) {");
    expect(mediaField).toContain("admin.upload.clearedRequired");
  });
});

describe("ImageUpload — now a wrapper, so every existing form inherits the fix", () => {
  it("delegates to MediaField as an image field", () => {
    expect(imageUpload).toContain("<MediaField {...props} kind=\"image\" />");
  });

  it("no longer talks to the upload action itself", () => {
    // A second copy of the upload path is a second copy that can drift — and
    // this module's Server Action import is what a `"use server"` export
    // violation once made unresolvable, taking this whole component down.
    expect(imageUpload).not.toContain("@/lib/admin/actions/upload");
    expect(imageUpload).not.toContain("@/lib/admin/actions/media");
  });

  it("still exports the list field the gallery uses", () => {
    expect(imageUpload).toContain("export function ImageListField");
  });
});
