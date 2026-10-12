/**
 * Pass D.1 — the admin media preview state.
 *
 * ── What failed, and why this is the test for it ────────────────────────────
 *
 * The admin's image preview stopped showing the selected image. The project's
 * test tiers are all `node` (no jsdom — see vitest.config.ts), so the preview
 * decision was extracted into `lib/media/preview.ts` precisely so the cases
 * that matter can be pinned without a DOM: what shows for an empty field, for a
 * value, for a value that failed to load, and — the one that actually bit — the
 * transition OUT of a failure when the operator picks a different image.
 *
 * The bug class this guards against is a STICKY failure flag: a boolean that
 * stays true after a new image is chosen, so a perfectly good image renders as
 * "preview unavailable" forever.
 */
import { describe, expect, it } from "vitest";

import { mediaPreviewState } from "@/lib/media/preview";

const URL_A = "https://bucket.liara.space/media/homepage/a.jpg";
const URL_B = "https://bucket.liara.space/media/homepage/b.jpg";

describe("mediaPreviewState", () => {
  it("is empty for the field's not-configured value", () => {
    expect(mediaPreviewState("", null)).toEqual({ kind: "empty" });
  });

  it("treats null and undefined as empty, not as a broken URL", () => {
    // A cleared field and a never-set field must render the same placeholder;
    // neither should claim the image is broken.
    expect(mediaPreviewState(null, null)).toEqual({ kind: "empty" });
    expect(mediaPreviewState(undefined, null)).toEqual({ kind: "empty" });
    expect(mediaPreviewState(null, URL_A)).toEqual({ kind: "empty" });
  });

  it("shows the media for a set value", () => {
    expect(mediaPreviewState(URL_A, null)).toEqual({
      kind: "media",
      url: URL_A,
    });
  });

  it("reports a broken URL as broken", () => {
    expect(mediaPreviewState(URL_A, URL_A)).toEqual({ kind: "broken" });
  });

  it("CLEARS the failure when the value changes — replacing updates the preview", () => {
    // The regression: a new image must not inherit the old image's failure.
    expect(mediaPreviewState(URL_B, URL_A)).toEqual({
      kind: "media",
      url: URL_B,
    });
  });

  it("clears the failure when the value is emptied", () => {
    expect(mediaPreviewState("", URL_A)).toEqual({ kind: "empty" });
  });

  it("stays broken only while the SAME url is the one that failed", () => {
    // A URL that fails, then is re-selected, must show as broken again only
    // once it has actually been retried and failed.
    expect(mediaPreviewState(URL_A, URL_A)).toEqual({ kind: "broken" });
    expect(mediaPreviewState(URL_A, URL_B)).toEqual({
      kind: "media",
      url: URL_A,
    });
  });

  it("does not confuse a root-relative asset with a failure", () => {
    expect(mediaPreviewState("/media/legacy-poster.jpg", null)).toEqual({
      kind: "media",
      url: "/media/legacy-poster.jpg",
    });
  });
});
