import { getCatalogueDocument } from "@/lib/repositories/catalogue";
import { storageKeyFromUrl } from "@/lib/admin/storage-cleanup";
import { contentDispositionFilename } from "@/lib/media/content-disposition";
import { isLiaraStorageHost } from "@/lib/media/storage";
import {
  DOCUMENT_MAX_BYTES,
  documentMimeForExtension,
  safeDocumentFilename,
} from "@/lib/media/document-sniff";
import { NextResponse } from "next/server";

/**
 * Serve an uploaded catalogue-card PDF/PPTX as an attachment.
 *
 * The database stores a Liara CDN URL, which browsers otherwise open inline and
 * which cannot use the cross-origin `download` attribute. This same-origin route
 * is the controlled download boundary: the target must be our storage host AND
 * an app-owned `media/catalogue/` key; redirects are refused to prevent SSRF;
 * only the two sniffed extensions are served; the response forces attachment,
 * `nosniff`, and `no-store`.
 *
 * The byte sniffing occurs before the row is saved by the upload registration
 * action. Here, the URL can only have entered the database through that upload
 * action or the explicit admin write boundary (`CatalogueItem.pdfUrl`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!id || id.length > 200) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  const document = await getCatalogueDocument(id);
  if (!document) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  let parsed: URL;
  try {
    parsed = new URL(document.url);
  } catch {
    return new NextResponse("Document not found.", { status: 404 });
  }
  if (parsed.protocol !== "https:" || !isLiaraStorageHost(parsed.hostname)) {
    console.error("[catalogue] refusing document from untrusted host", parsed.hostname);
    return new NextResponse("Document not found.", { status: 404 });
  }

  const key = storageKeyFromUrl(document.url);
  if (!key || !key.startsWith("media/catalogue/")) {
    return new NextResponse("Document not found.", { status: 404 });
  }
  const extension = key.split("/").pop()?.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = documentMimeForExtension(extension);
  if (!mimeType) {
    return new NextResponse("Document not found.", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(document.url, {
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    console.error("[catalogue] could not reach stored document", error);
    return new NextResponse("The catalogue document is unavailable.", {
      status: 502,
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("The catalogue document is unavailable.", {
      status: 502,
    });
  }

  const headerLength = upstream.headers.get("content-length");
  const length = headerLength ? Number(headerLength) : null;
  if (length !== null && (!Number.isSafeInteger(length) || length > DOCUMENT_MAX_BYTES)) {
    return new NextResponse("The catalogue document is too large.", {
      status: 502,
    });
  }

  const filename = safeDocumentFilename(
    document.name || key.split("/").pop() || "catalogue",
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
