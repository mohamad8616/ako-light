import { isLiaraStorageHost } from "@/lib/media/storage";
import { PDF_MIME_TYPE, safePdfFilename } from "@/lib/media/pdf-sniff";
import { getCatalogueCtaPdf } from "@/lib/repositories/homepage-features";
import { NextResponse } from "next/server";

/**
 * The catalogue CTA's DOWNLOAD endpoint (Pass C.4).
 *
 * ── Why this route exists ───────────────────────────────────────────────────
 *
 * The uploaded PDF lives on the Liara CDN, which serves it as
 * `application/pdf`. A browser handed that URL does not download it — it opens
 * it in its built-in viewer. The `download` attribute on an anchor does not help
 * either: browsers ignore it for a CROSS-ORIGIN href.
 *
 * The only reliable way to start a download is a response carrying
 * `Content-Disposition: attachment`, and that header can only be attached by
 * something that controls the response — so this route re-serves the stored
 * object with it. The public CTA therefore points at
 * `CATALOGUE_CTA_DOWNLOAD_PATH`, never at the storage URL directly.
 *
 * ── Why it does not become an open proxy ────────────────────────────────────
 *
 * The stored URL is admin-authored, so it is NOT trusted blindly here: this
 * route refuses to fetch anything that is not on the configured storage host
 * (`isLiaraStorageHost`). Without that check the endpoint would happily fetch
 * any https address a compromised row named — an SSRF lever pointed at the
 * deployment's own network. The check costs nothing and closes it.
 *
 * `runtime = "nodejs"` for the storage helper; `force-dynamic` because Route
 * Handlers are cached by default in Next 16 and a cached PDF would outlive a
 * replacement.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const pdf = await getCatalogueCtaPdf();
  if (!pdf) {
    return new NextResponse("No catalogue file is configured.", { status: 404 });
  }

  let hostname: string;
  try {
    hostname = new URL(pdf.url).hostname;
  } catch {
    return new NextResponse("No catalogue file is configured.", { status: 404 });
  }

  if (!isLiaraStorageHost(hostname)) {
    // The column is supposed to hold a storage URL produced by the upload
    // action. Anything else is either corruption or an attempt to aim this
    // endpoint somewhere it must not go.
    console.error(
      `[catalogue] refusing to proxy a CTA file from an untrusted host: ${hostname}`,
    );
    return new NextResponse("No catalogue file is configured.", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(pdf.url, { cache: "no-store" });
  } catch (error) {
    console.error("[catalogue] could not reach the stored file", error);
    return new NextResponse("The catalogue file is unavailable.", {
      status: 502,
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("The catalogue file is unavailable.", {
      status: 502,
    });
  }

  // A filename that is safe in a header, and always ends in `.pdf` so the
  // browser knows what it just received.
  const name = safePdfFilename(pdf.name);

  const headers = new Headers({
    "Content-Type": PDF_MIME_TYPE,
    // `filename` for older clients, `filename*` (RFC 5987) so a Persian or
    // otherwise non-ASCII name survives intact.
    "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    // A replacement must be visible immediately: this response is never a
    // cacheable copy of a file the operator may just have swapped.
    "Cache-Control": "no-store",
    // The stored object is a document, not something to be re-interpreted.
    "X-Content-Type-Options": "nosniff",
  });

  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { status: 200, headers });
}
