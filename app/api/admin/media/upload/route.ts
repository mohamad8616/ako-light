import { IMAGE_EXTENSIONS } from "@/lib/admin/image-sniff";
import { getAdminRole } from "@/lib/admin/access";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/limits";
import { storageProvider } from "@/lib/media/storage";
import { signLiaraUploadAuthorization } from "@/lib/media/storage/liara-upload-token";
import { VIDEO_EXTENSIONS } from "@/lib/media/video-sniff";
import { buildStorageKey } from "@/lib/media/validation";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * The direct-upload authorization endpoint (Pass 13.5E).
 *
 * A large file must not travel through the Next server, so the browser asks
 * this route for permission and then writes to Liara itself. That makes this
 * route the ONLY thing standing between an arbitrary visitor and write access
 * to the bucket, so it does four things in order, and refuses before doing any
 * of them if the caller is not an admin:
 *
 *   1. AUTHORIZE — `getAdminRole()`, which resolves the session from the request
 *      cookies. A `user` or an anonymous caller gets 403 and no URL. Note this
 *      uses the ROLE helper rather than `requireAdminAccess()`: the latter
 *      `redirect()`s, which is right for a page and wrong for an API that must
 *      answer with a status code.
 *   2. VALIDATE THE INPUT — a filename and a positive size, nothing else. The
 *      browser never gets to choose the key, the content type or the ceiling.
 *   3. DERIVE THE CONSTRAINTS from the requested extension, never from anything
 *      the browser asserts, so the type and the byte ceiling cannot be widened
 *      by the client.
 *   4. MINT — a short-lived presigned PUT for the server-generated key, plus an
 *      HMAC token the registration step re-verifies. The bucket credentials are
 *      never returned; only the presigned URL is.
 *
 * There is no provider discovery here any more. Liara is the only provider, so
 * `GET` was removed: it could only ever answer "liara".
 *
 * `runtime = "nodejs"` is required: the AWS SDK is a Node library.
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

  const payload =
    body && typeof body === "object"
      ? (body as { payload?: unknown }).payload
      : null;
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  // 2. The browser supplies a name and a size; everything else is derived.
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

  // 3. The ceiling comes from the extension, not from the client's claim.
  let maximumSizeInBytes: number;
  if (IMAGE_EXTENSIONS_SET.has(extension)) {
    maximumSizeInBytes = IMAGE_MAX_BYTES;
  } else if (VIDEO_EXTENSIONS_SET.has(extension)) {
    maximumSizeInBytes = VIDEO_MAX_BYTES;
  } else {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  if (Number(requestedSize) > maximumSizeInBytes) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  try {
    // 4. Mint. Liara returns a short-lived presigned PUT for the server's key.
    const result = await storageProvider.authorizeClientUpload!({
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
    const uploadToken = signLiaraUploadAuthorization({
      nonce,
      key: pathname,
      filename,
      size: Number(requestedSize),
      contentType,
      expiresAt,
    });

    return NextResponse.json({
      ...(result as object),
      key: pathname,
      filename,
      size: Number(requestedSize),
      contentType,
      maximumSizeInBytes,
      expiresAt,
      uploadToken,
    });
  } catch (error) {
    console.error("[media] client upload authorization failed", error);
    return NextResponse.json(
      { error: "authorization_failed" },
      { status: 500 },
    );
  }
}
