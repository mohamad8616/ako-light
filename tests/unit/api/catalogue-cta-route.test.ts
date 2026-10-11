/**
 * Pass C.4 — the catalogue CTA's download Route Handler, `app/api/catalogue/cta`.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * This route is the ONLY thing that makes the CTA actually download. The CTA
 * cannot point at the stored object: the CDN serves it as `application/pdf`,
 * which a browser renders INLINE, and the `download` attribute is ignored for a
 * cross-origin href. So the public href is this same-origin route, and if the
 * route is wrong the operator's button silently stops downloading — the exact
 * symptom Pass C.4 was opened to fix. It therefore deserves its own coverage
 * rather than being assumed correct.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the handler, `NextResponse`, `isLiaraStorageHost`, and
 * `safePdfFilename` — i.e. every decision the route makes.
 *
 * STUBBED: the two things that reach outside the process. The repository read
 * is mocked (this is a hermetic unit test — no database), and `global.fetch` is
 * a spy standing in for the CDN.
 *
 * Hermetic: no DB, no network, no Next request context.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pdf: null as { url: string; name: string } | null,
}));

vi.mock("@/lib/repositories/homepage-features", () => ({
  getCatalogueCtaPdf: async () => state.pdf,
}));

import { GET } from "@/app/api/catalogue/cta/route";

/** A Liara storage URL — the shape the upload action actually produces. */
const STORAGE_URL =
  "https://homeform.liara.space/media/catalogue/1-henge-catalogue.pdf";

const upstream = (body = "%PDF-1.4 fake", init: ResponseInit = {}) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "application/pdf", "content-length": "13" },
    ...init,
  });

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  state.pdf = null;
  fetchSpy = vi.fn(async () => upstream());
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/catalogue/cta", () => {
  it("404s when the slot has no uploaded file, and never fetches", async () => {
    state.pdf = null;

    const response = await GET();

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("404s — and does not fetch — when the stored URL is not our storage host", async () => {
    // An admin-authored column, so it is NOT trusted: without this guard the
    // route would fetch any address a compromised row named (an SSRF lever).
    state.pdf = { url: "https://evil.test/media/catalogue/x.pdf", name: "x.pdf" };

    const response = await GET();

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("404s when the stored URL is not a URL at all", async () => {
    state.pdf = { url: "not-a-url", name: "x.pdf" };

    const response = await GET();

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-serves the object as a DOWNLOAD with the right headers", async () => {
    state.pdf = { url: STORAGE_URL, name: "Henge Catalogue S34-5.pdf" };

    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(STORAGE_URL, { cache: "no-store" });

    // The header that actually starts a download, rather than the inline PDF
    // viewer the CDN's own `application/pdf` response would trigger.
    const disposition = response.headers.get("content-disposition") ?? "";
    expect(disposition.startsWith("attachment;")).toBe(true);
    expect(disposition).toContain('filename="Henge Catalogue S34-5.pdf"');
    // RFC 5987 form, so a Persian name survives intact.
    expect(disposition).toContain(
      "filename*=UTF-8''Henge%20Catalogue%20S34-5.pdf",
    );

    expect(response.headers.get("content-type")).toBe("application/pdf");
    // A replacement must be visible at once — never a cached copy.
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe("13");

    expect(await response.text()).toBe("%PDF-1.4 fake");
  });

  it("sanitizes a name that would break the Content-Disposition HEADER", async () => {
    // A header value, so a quote or a newline would be header injection. The
    // name column is admin-authored, so it is sanitized, not trusted.
    state.pdf = {
      url: STORAGE_URL,
      name: 'bad"\r\nX-Evil: 1.pdf',
    };

    const response = await GET();
    const disposition = response.headers.get("content-disposition") ?? "";

    expect(response.status).toBe(200);
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain("\n");
    expect(response.headers.get("x-evil")).toBeNull();
    // A quote inside the value would terminate it early.
    expect(disposition.match(/"/g)).toHaveLength(2);
    expect(disposition).toContain(".pdf");
  });

  it("falls back to a neutral filename when the name is empty", async () => {
    // The pair is not enforced by the schema, so a file with no name is a real
    // row shape — and the download must still have a usable filename.
    state.pdf = { url: STORAGE_URL, name: "" };

    const response = await GET();

    expect(response.headers.get("content-disposition")).toContain(
      'filename="catalogue.pdf"',
    );
  });

  it("502s when the stored object cannot be reached", async () => {
    state.pdf = { url: STORAGE_URL, name: "x.pdf" };
    fetchSpy.mockRejectedValueOnce(new Error("network down"));

    const response = await GET();

    expect(response.status).toBe(502);
  });

  it("502s when the storage host answers with an error", async () => {
    state.pdf = { url: STORAGE_URL, name: "x.pdf" };
    fetchSpy.mockResolvedValueOnce(new Response("gone", { status: 404 }));

    const response = await GET();

    expect(response.status).toBe(502);
  });
});
