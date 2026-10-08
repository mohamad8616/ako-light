import { IMAGE_EXTENSIONS } from "@/lib/admin/image-sniff";
import { getAdminRole } from "@/lib/admin/access";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/limits";
import { getStorageProvider } from "@/lib/media/storage";
import { VIDEO_EXTENSIONS } from "@/lib/media/video-sniff";
import { StorageAccessMismatchError } from "@/lib/media/types";
import { buildStorageKey } from "@/lib/media/validation";
import { signLiaraUploadAuthorization } from "@/lib/media/storage/liara-upload-token";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * Pass 13.5E — the direct-upload authorization endpoint.
 *
 * A large file must not travel through the Next server, so the browser asks
 * this route for permission and then writes to the provider itself. That makes
 * this route the ONLY thing standing between an arbitrary visitor and write
 * access to the media store, so it does four things in order, and refuses
 * before doing any of them if the caller is not an admin:
 *
 *   1. AUTHORIZE — `getAdminRole()`, which resolves the session from the request
 *      cookies. A `user` or an anonymous caller gets 403 and no token. Note this
 *      uses the ROLE helper rather than `requireAdminAccess()`: the latter
 *      `redirect()`s, which is right for a page and wrong for an API that must
 *      answer with a status code.
 *   2. VALIDATE THE PATH — the requested pathname must live under the `media/`
 *      prefix, so a caller cannot mint a token for `admin/…` or for the root of
 *      the store. This is the path-generation guard the plan asks for.
 *   3. DERIVE THE CONSTRAINTS from the requested extension, never from anything
 *      the browser asserts. The provider then enforces those on the wire, so
 *      the type and the byte ceiling cannot be widened by the client.
 *   4. MINT — delegated to the storage provider, which holds the read-write
 *      token. That token is NEVER returned; only a scoped client token is.
 *
 * `runtime = "nodejs"` is required: the provider SDK is a Node library.
 */
export const runtime = "nodejs";

const IMAGE_EXTENSIONS_SET: ReadonlySet<string> = new Set(
  Object.values(IMAGE_EXTENSIONS),
);
const VIDEO_EXTENSIONS_SET: ReadonlySet<string> = new Set(
  Object.values(VIDEO_EXTENSIONS),
);

/** The lowercase extension of a pathname, without the dot. */
function extensionOf(pathname: string): string {
  const last = pathname.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  return dot === -1 ? "" : last.slice(dot + 1).toLowerCase();
}

export async function GET(): Promise<Response> {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ provider: getStorageProvider().name });
}

/** The pathname the client is asking to write to, from the SDK's own body. */
function requestedPathname(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const payload = (body as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") return null;
  const pathname = (payload as { pathname?: unknown }).pathname;
  return typeof pathname === "string" && pathname.length > 0 ? pathname : null;
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authorization, before the body is even parsed.
  const role = await getAdminRole();
  if (!role) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const provider = getStorageProvider();
  const payload =
    body && typeof body === "object"
      ? (body as { payload?: unknown }).payload
      : null;
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  // Preserve Vercel Blob's established SDK request/response protocol unchanged.
  if (provider.name !== "liara") {
    const pathname = requestedPathname(body);
    if (!pathname || !pathname.startsWith("media/")) {
      return NextResponse.json({ error: "path_not_allowed" }, { status: 400 });
    }
    const extension = extensionOf(pathname);
    const image = IMAGE_EXTENSIONS_SET.has(extension);
    const video = VIDEO_EXTENSIONS_SET.has(extension);
    if (!image && !video)
      return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
    if (!provider.supportsClientUpload || !provider.authorizeClientUpload) {
      return NextResponse.json(
        { error: "unsupported_provider" },
        { status: 501 },
      );
    }
    try {
      const result = await provider.authorizeClientUpload({
        body,
        request,
        constraints: {
          key: pathname,
          allowedContentTypes: Object.keys(
            image ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS,
          ),
          maximumSizeInBytes: image ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES,
        },
      });
      return NextResponse.json(result);
    } catch (error) {
      // A store whose visibility does not match the app's write mode is a
      // CONFIGURATION fault. Reported as its own code (and 400, not 500) so the
      // client can show actionable copy instead of "authorization failed".
      if (error instanceof StorageAccessMismatchError) {
        console.error(
          `[media] client upload access mismatch: app writes "${error.expectedAccess}" ` +
            `but the store refused it. Store said: ${error.storeMessage ?? "(no message)"}`,
        );
        return NextResponse.json(
          { error: "storage_access_mismatch" },
          { status: 400 },
        );
      }
      console.error("[media] Vercel client upload authorization failed", error);
      return NextResponse.json(
        { error: "authorization_failed" },
        { status: 500 },
      );
    }
  }

  const filename =
    typeof payloadObject.filename === "string" ? payloadObject.filename : "";
  const extension = extensionOf(filename);
  const requestedSize = payloadObject.size;
  if (
    !filename ||
    !Number.isSafeInteger(requestedSize) ||
    Number(requestedSize) <= 0
  ) {
    return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  }
  const pathname = buildStorageKey({
    folder: "library",
    baseName: `${filename}-${randomUUID()}`,
    extension,
    now: Date.now(),
  });
  const contentType = Object.entries({
    ...IMAGE_EXTENSIONS,
    ...VIDEO_EXTENSIONS,
  }).find(([, ext]) => ext === extension)?.[0];
  if (!contentType)
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  let allowedContentTypes: string[];
  let maximumSizeInBytes: number;

  if (IMAGE_EXTENSIONS_SET.has(extension)) {
    allowedContentTypes = Object.keys(IMAGE_EXTENSIONS);
    maximumSizeInBytes = IMAGE_MAX_BYTES;
  } else if (VIDEO_EXTENSIONS_SET.has(extension)) {
    allowedContentTypes = Object.keys(VIDEO_EXTENSIONS);
    maximumSizeInBytes = VIDEO_MAX_BYTES;
  } else {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  if (!provider.supportsClientUpload || !provider.authorizeClientUpload) {
    // Honest failure rather than a silent fallback that would route the file
    // through the server anyway.
    return NextResponse.json(
      { error: "unsupported_provider" },
      { status: 501 },
    );
  }

  if (Number(requestedSize) > maximumSizeInBytes) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  try {
    // 4. Mint. Liara returns a short-lived URL for one server-generated key.
    const result = await provider.authorizeClientUpload({
      body,
      request,
      constraints: {
        key: pathname,
        allowedContentTypes: [contentType],
        maximumSizeInBytes,
      },
    });
    const nonce = randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const uploadToken =
      provider.name === "liara"
        ? signLiaraUploadAuthorization({
            nonce,
            key: pathname,
            filename,
            size: Number(requestedSize),
            contentType,
            expiresAt,
          })
        : undefined;
    return NextResponse.json({
      ...(result as object),
      provider: provider.name,
      key: pathname,
      filename,
      size: Number(requestedSize),
      contentType: allowedContentTypes[0],
      maximumSizeInBytes,
      expiresAt,
      ...(uploadToken ? { uploadToken } : {}),
    });
  } catch (error) {
    // A store whose visibility does not match the app's write mode is a
    // CONFIGURATION fault. Reported as its own code (and 400, not 500) so the
    // client can show actionable copy instead of "authorization failed", and so
    // the operator gets a named cause in the log.
    if (error instanceof StorageAccessMismatchError) {
      console.error(
        `[media] client upload access mismatch: app writes "${error.expectedAccess}" ` +
          `but the store refused it. Store said: ${error.storeMessage ?? "(no message)"}`,
      );
      return NextResponse.json(
        { error: "storage_access_mismatch" },
        { status: 400 },
      );
    }
    console.error("[media] client upload authorization failed", error);
    return NextResponse.json(
      { error: "authorization_failed" },
      { status: 500 },
    );
  }
}
