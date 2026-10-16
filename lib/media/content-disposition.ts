/**
 * The `Content-Disposition` value for a served document download.
 *
 * ONE implementation for every download route (the catalogue file proxy, the
 * catalogue CTA, and product downloads): the header is where an unsafe or
 * mis-encoded filename becomes a response-splitting bug or a mangled Persian
 * name, so it is built in exactly one place.
 *
 * Both parameters are emitted:
 *   - `filename` — the historical ASCII-only form, for older clients.
 *   - `filename*=UTF-8''…` — RFC 5987, so a non-ASCII name survives intact.
 */
export function contentDispositionFilename(name: string): string {
  const fallback = name
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
