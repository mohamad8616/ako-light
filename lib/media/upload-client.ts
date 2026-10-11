import {
  registerDirectUploadAction,
  uploadMediaAction,
} from "@/lib/admin/actions/media";
import {
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "@/lib/media/limits";
import { uploadDirectToStorage } from "@/lib/media/storage/client";

/**
 * The ONE client-side media upload, shared by every admin affordance that
 * uploads a file (Pass D.1).
 *
 * ── Why this was extracted ──────────────────────────────────────────────────
 *
 * The two-path decision below used to live inline in `MediaUploadDialog`. The
 * hero and video fields need exactly the same behaviour, and a second copy of
 * a security-relevant flow is a second copy that will drift — the upload path
 * is the one place where a mistake means an unauthorised write into the
 * storage bucket. So the decision, the two action calls and the error mapping
 * live here, and callers only decide what to do with the result.
 *
 * ── The two paths ──────────────────────────────────────────────────────────
 *
 * SMALL files go through `uploadMediaAction`, the Pass 13.5A server action.
 * It re-runs `requireAdminAccess()` (the client is never the authorization),
 * validates by sniffing the leading BYTES rather than trusting `file.type`,
 * stores through the `StorageProvider` abstraction and registers the `Media`
 * row.
 *
 * LARGE files — and EVERY video — go straight from the browser to the provider
 * and are then registered by `registerDirectUploadAction`, which re-derives
 * the key, extension and size from the verified upload token. A Server Action
 * buffers the whole payload in memory on the Next server, which is precisely
 * the bottleneck this path removes.
 *
 * The switch is a SIZE, not a type: a 5 MB image still travels the old way,
 * and a small video still takes the direct path because video is the case the
 * server-action ceiling cannot serve.
 */

/** True when the file claims to be a video. */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

/**
 * The ceiling for a file, chosen by its claimed kind.
 *
 * Only a UX guard: the server re-checks the real byte length, and on the direct
 * path the PROVIDER enforces the limit on the wire.
 */
export function maxBytesFor(file: File): number {
  return isVideoFile(file) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}

/** What an upload produced, or the structured code explaining why it did not. */
export type MediaUploadOutcome =
  | { ok: true; id: string; url: string }
  | { ok: false; code: string };

/**
 * Uploads `file` and returns the created Media's `{ id, url }`.
 *
 * Never throws: an unexpected failure is logged and reported as the `unknown`
 * code, so every caller handles one shape. The `code` is an `AdminErrorCode`
 * (or the `unknown` fallback), which the admin dictionary already translates.
 */
/** Which step of the direct flow is running, for honest feedback. */
export type MediaUploadPhase = "uploading" | "saving";

export async function uploadMediaFile(
  file: File,
  options: {
    /** 0–100 while the browser transfers bytes directly to the provider. */
    onProgress?: (percent: number) => void;
    /**
     * Which step of the DIRECT flow is running. A 200 MB transfer followed by
     * a silent pause while the row is written looks like a hang, so a caller
     * that shows progress needs to be able to say which half it is in.
     */
    onPhase?: (phase: MediaUploadPhase) => void;
    /** Storage key group ("products", "homepage", …). */
    folder?: string;
    /** Optional Media metadata; the library dialog collects these. */
    alt?: string;
    title?: string;
  } = {},
): Promise<MediaUploadOutcome> {
  const useDirectUpload =
    isVideoFile(file) || file.size > DIRECT_UPLOAD_THRESHOLD_BYTES;

  try {
    if (useDirectUpload) {
      // Step 1 — the browser transfers the bytes itself.
      options.onPhase?.("uploading");
      const uploaded = await uploadDirectToStorage({
        file,
        onProgress: options.onProgress,
      });

      // Step 2 — an authorised action turns the object into a Media row.
      // Re-authorised independently: the token that allowed the upload came
      // from a different route, so this one cannot assume it.
      options.onPhase?.("saving");
      const registered = await registerDirectUploadAction({
        filename: file.name,
        uploadToken: uploaded.uploadToken ?? "",
        size: uploaded.size,
      });

      if (registered.ok) {
        return {
          ok: true,
          id: registered.data.id,
          url: registered.data.url,
        };
      }
      return {
        ok: false,
        code: registered.issues[0]?.code ?? registered.formError,
      };
    }

    const payload = new FormData();
    payload.set("file", file);
    if (options.folder) payload.set("folder", options.folder);
    if (options.alt !== undefined) payload.set("alt", options.alt);
    if (options.title !== undefined) payload.set("title", options.title);

    const result = await uploadMediaAction(payload);
    if (result.ok) {
      return { ok: true, id: result.data.id, url: result.data.url };
    }
    return {
      ok: false,
      code: result.issues[0]?.code ?? result.formError,
    };
  } catch (error) {
    // A DIRECT-upload failure never reaches the server, so this is its only
    // chance to report anything. It collapses to the generic message, the same
    // treatment a server-side storage failure gets.
    console.error("[media] upload failed", error);
    return { ok: false, code: "unknown" };
  }
}
