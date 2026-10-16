import { getProductDownload } from "@/lib/repositories/products";
import { contentDispositionFilename } from "@/lib/media/content-disposition";
import { storageKeyFromUrl } from "@/lib/admin/storage-cleanup";
import { isLiaraStorageHost } from "@/lib/media/storage";
import {
  DOCUMENT_MAX_BYTES,
  documentMimeForExtension,
  safeDocumentFilename,
} from "@/lib/media/document-sniff";
import { NextResponse } from "next/server";

/**
 * Serve an uploaded product download (PDF/PPTX) as an attachment.
 *
 * Mirrors `/api/catalogue/file/[id]` — and exists for the same reason. The row
 * stores a Liara CDN URL, which a browser opens INLINE instead of downloading,
 * and the cross-origin `download` attribute is ignored. Only a same-origin
 * response can carry `Content-Disposition: attachment`.
 *
 * The stored URL is admin-authored, so this route is a controlled boundary
 * rather than a blind proxy: the target must be our storage host AND an
 * app-owned `media/` key, redirects are refused (no SSRF), and only the two
 * sniffed extensions are served. `[slot]` is the download's index within the
 * product's `downloads` array.
 *
 * `runtime = "nodejs"` for the storage helpers; `force-dynamic` because Route
 * Handlers are cached by default in Next 16 and a cached file would outlive a
 * replacement.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; slot: string }> },
): Promise<Response> {
  const { id, slot } = await params;
  const index = Number.parseInt(slot, 10);
  if (!id || id.length > 200 || !Number.isInteger(index) || index < 0) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  const download = await getProductDownload(id, index);
  if (!download) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  let parsed: URL;
  try {
    parsed = new URL(download.href);
  } catch {
    return new NextResponse("Document not found.", { status: 404 });
  }
  if (parsed.protocol !== "https:" || !isLiaraStorageHost(parsed.hostname)) {
    console.error(
      "[products] refusing download from untrusted host",
      parsed.hostname,
    );
    return new NextResponse("Document not found.", { status: 404 });
  }

  const key = storageKeyFromUrl(download.href);
  // The `media/` prefix comes back from `storageKeyFromUrl`; a download must
  // additionally live under a product-owned folder.
  if (!key || !key.startsWith("media/")) {
    return new NextResponse("Document not found.", { status: 404 });
  }
  const extension = key.split("/").pop()?.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = documentMimeForExtension(extension);
  if (!mimeType) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(download.href, { cache: "no-store", redirect: "error" });
  } catch (error) {
    console.error("[products] could not reach stored document", error);
    return new NextResponse("The document is unavailable.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("The document is unavailable.", { status: 502 });
  }

  const headerLength = upstream.headers.get("content-length");
  const length = headerLength ? Number(headerLength) : null;
  if (
    length !== null &&
    (!Number.isSafeInteger(length) || length > DOCUMENT_MAX_BYTES)
  ) {
    return new NextResponse("The document is too large.", { status: 502 });
  }

  const filename = safeDocumentFilename(
    download.name || key.split("/").pop() || "download",
    extension,
  );
  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": contentDispositionFilename(filename),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (length !== null) headers.set("Content-Length", String(length));

  return new NextResponse(upstream.body, { status: 200, headers });
}
