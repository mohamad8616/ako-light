/**
 * The preview state of a media field (Pass D.1).
 *
 * ── Why this is a separate, pure module ─────────────────────────────────────
 *
 * The admin image field's preview is the thing that broke, and the project's
 * test tiers are all `node` (no jsdom, no renderer — see vitest.config.ts), so
 * the decision has to be testable WITHOUT a DOM. Pulling it out of the
 * component makes every case — empty, present, present-but-failed, and the
 * transition between them — a pure function of two values.
 *
 * ── The rule, and the one detail that matters ───────────────────────────────
 *
 * `failedUrl` is the URL THAT FAILED, not a boolean. That is what makes
 * REPLACING an image clear the failure by construction: once the value changes
 * it no longer equals the recorded failure, so the preview is live again
 * without an effect to reset a sticky flag. A boolean would leave a fresh,
 * perfectly good image showing "preview unavailable" — the classic shape of
 * this bug.
 */

/** What the preview box should render for the current field value. */
export type MediaPreviewState =
  /** No value: the field's "nothing selected yet" placeholder. */
  | { kind: "empty" }
  /** A value is set but that URL would not load. */
  | { kind: "broken" }
  /** A value is set and (so far) loads. */
  | { kind: "media"; url: string };

/**
 * Decide the preview state.
 *
 * An empty string is the field's "not configured" value (the same convention
 * every clearable admin field uses), so it maps to `empty` rather than being
 * treated as a broken URL.
 */
export function mediaPreviewState(
  value: string | null | undefined,
  failedUrl: string | null | undefined,
): MediaPreviewState {
  const url = value ?? "";
  if (url === "") return { kind: "empty" };
  if (failedUrl != null && failedUrl === url) return { kind: "broken" };
  return { kind: "media", url };
}
