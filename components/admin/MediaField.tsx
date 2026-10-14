"use client";

import { FieldRow, type FieldIssue } from "@/components/admin/catalog/fields/form";
import { MediaPickerDialog } from "@/components/admin/settings/MediaPickerField";
import { Button } from "@/components/ui/button";
import { removeMediaUrlAction } from "@/lib/admin/actions/media";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MediaKind } from "@/lib/media/library";
import { mediaPreviewState } from "@/lib/media/preview";
import { maxBytesFor, uploadMediaFile } from "@/lib/media/upload-client";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import * as React from "react";

/**
 * The admin's media field: preview + real upload to Liara Object Storage, for
 * an IMAGE or a VIDEO (Pass D.1).
 *
 * ── Why this replaced the image-only component ──────────────────────────────
 *
 * `ImageUpload` and a would-be `VideoUpload` differ only in the `accept` filter
 * and which element paints the preview. Everything else — the upload path, the
 * library picker, the clear button, the error fallback — is identical, and the
 * upload path is security-relevant (it is the only thing that writes into the
 * bucket). So there is ONE implementation here, and `ImageUpload` is now a thin
 * image-flavoured wrapper over it: every existing form keeps its exact API and
 * silently gains the fixes below.
 *
 * ── The preview is DERIVED from the form value ──────────────────────────────
 *
 * `watch(name)` is the single source of truth, so an upload, a library pick and
 * a clear all repaint from the same place with no effect and no local copy of
 * the URL to fall out of step. The load-failure flag stores the URL THAT FAILED
 * rather than a boolean: replacing the image therefore clears the failure by
 * construction, instead of needing an effect to reset a sticky flag (the shape
 * that leaves a good image showing "broken" after a bad one).
 *
 * ── What the field guarantees ───────────────────────────────────────────────
 *
 *   - a successful upload appears immediately, as does a library selection;
 *   - a missing value shows a placeholder, and a URL that will not load shows a
 *     labelled fallback rather than the browser's broken-image glyph;
 *   - clearing removes the preview and the extra controls;
 *   - exactly ONE upload runs per file pick, and re-picking the same file fires
 *     `change` again (the input is reset);
 *   - the value written is still a plain URL string, so no zod schema changes
 *     shape and every seeded external URL keeps working.
 *
 * Reads and writes through `useFormContext()` like the rest of the field kit
 * (components/admin/catalog/fields/*), so it must be rendered inside a
 * FormProvider. Nested paths ("images.0.url") work for reading and for errors.
 */

/**
 * Resolves a (possibly nested) field path against react-hook-form's error
 * object. The kit's other fields index `formState.errors[name]` directly,
 * which silently misses nested paths — this walks them instead.
 */
function errorAtPath(errors: unknown, path: string): FieldIssue | undefined {
  let current: unknown = errors;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return (current as FieldIssue | undefined) ?? undefined;
}

/** The file types each kind accepts; also the hidden input's filter. */
const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif",
  video: "video/mp4,video/webm",
};

export function MediaField({
  name,
  label,
  hint,
  required,
  optional,
  kind = "image",
  folder,
  disabled,
  bare,
  className,
}: {
  /** The form field path holding the media URL string. */
  name: string;
  /**
   * Omitted when `bare` is set — inside a `ListRow` the row already carries its
   * own chrome, so a second label/error block would double up.
   */
  label?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  /** Which element paints the preview and which types the picker accepts. */
  kind?: MediaKind;
  /** Storage key group ("products", "homepage", …). */
  folder?: string;
  disabled?: boolean;
  /** Render just the control (for embedding in list rows). */
  bare?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const { watch, setValue, formState } = useFormContext();
  const value = (watch(name) as string | undefined) ?? "";

  const inputRef = React.useRef<HTMLInputElement>(null);
  /** The reusable Media picker — "select existing", not "upload again". */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  /** True while the stored object is being deleted behind the Remove button. */
  const [removing, setRemoving] = React.useState(false);
  /** 0–100 while the browser transfers bytes directly to the provider. */
  const [progress, setProgress] = React.useState<number | null>(null);
  /** The URL that failed to load — NOT a boolean, see the header note. */
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

  const preview = mediaPreviewState(value, failedUrl);

  /**
   * Copy per kind. The image keys are unchanged, so every existing form reads
   * exactly as before; a video field must not say "Upload image" or quote the
   * 5 MB image ceiling, which is why the kind selects the whole set rather than
   * a single word.
   */
  const copy =
    kind === "video"
      ? {
          pick: t("admin.upload.pickVideo"),
          done: t("admin.upload.videoDone"),
          empty: t("admin.upload.videoEmpty"),
          hint: t("admin.upload.videoHint"),
        }
      : {
          pick: t("admin.upload.pick"),
          done: t("admin.upload.done"),
          empty: t("admin.upload.empty"),
          hint: t("admin.upload.hint"),
        };

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      // Cheap client-side gate so an obviously oversized file never leaves the
      // browser. This is NOT the security boundary — the server re-checks the
      // byte length and sniffs the content type regardless.
      if (file.size > maxBytesFor(file)) {
        toast.error(t("admin.error.tooLarge"));
        return;
      }

      setUploading(true);
      setProgress(null);
      try {
        const outcome = await uploadMediaFile(file, {
          folder,
          onProgress: setProgress,
        });

        if (outcome.ok) {
          setValue(name, outcome.url, {
            shouldValidate: true,
            shouldDirty: true,
          });
          toast.success(copy.done);
        } else {
          // Structured code -> the shared translated message, exactly like
          // every other admin failure (useCrudSubmit's contract).
          toast.error(t(`admin.error.${outcome.code}`));
        }
      } finally {
        setUploading(false);
        // Progress only ever describes the run that just finished; leaving it
        // set would show a stale bar beside a fresh file picker.
        setProgress(null);
      }
    },
    [copy.done, folder, name, setValue, t],
  );

  const error = errorAtPath(formState.errors, name);

  /**
   * "Remove" = clear the field, and delete the object it pointed at.
   *
   * The order matters: the field is cleared FIRST so the control is responsive
   * and the value can never be half-applied, then the object is removed. The
   * delete is guarded the same way the library's own delete is, so a file still
   * referenced elsewhere is refused — in which case the field is already clear
   * (the intended edit) and only the toast explains that the file is still in
   * the library, which is the safe outcome.
   *
   * ── A REQUIRED field stops after the clear ─────────────────────────────────
   *
   * `imageRefSchema` is `.min(1)`, so a cleared required field can NEVER be
   * saved: the form refuses to submit until a replacement is chosen. Deleting
   * the object at that moment would therefore destroy a file the database still
   * points at — the live page goes broken and, if the operator navigates away,
   * there is no way back. So on a required field the clear is the whole edit and
   * the object is left alone; the owning action's `removedUrls` sweep deletes it
   * once a replacement is actually saved.
   */
  const handleRemove = React.useCallback(async () => {
    const removed = value;
    // `""` is the kit's "not configured" value; it maps to SQL NULL on save.
    setValue(name, "", { shouldValidate: true, shouldDirty: true });

    // Nothing was selected → nothing to delete, and nothing to report.
    if (!removed) return;

    if (required) {
      toast.message(t("admin.upload.clearedRequired"));
      return;
    }

    setRemoving(true);
    try {
      const result = await removeMediaUrlAction({ url: removed });
      if (result.ok) {
        toast.success(t("admin.upload.removed"));
      } else {
        // Structured code → the shared translated message. `inUse` is the
        // interesting one: it means something else still points at this file.
        toast.error(t(`admin.error.${result.formError}`));
      }
    } catch {
      toast.error(t("admin.error.unknown"));
    } finally {
      setRemoving(false);
    }
  }, [name, required, setRemoving, setValue, t, value]);

  const control = (
    <>
      <div className="flex items-start gap-3">
        <div className="border-border bg-muted size-20 shrink-0 overflow-hidden rounded-md border">
          {preview.kind === "empty" ? (
            <span className="text-muted-foreground flex size-20 items-center justify-center text-center text-[10px]">
              {copy.empty}
            </span>
          ) : preview.kind === "broken" ? (
            /*
              A URL that will not load is reported as such. Without this the
              browser paints its own broken-image glyph, which reads as a
              rendering bug in the admin rather than as "this URL is dead".
            */
            <span className="text-muted-foreground flex size-20 flex-col items-center justify-center gap-1 p-1 text-center text-[10px] leading-tight">
              <ImageOff aria-hidden="true" className="size-4 shrink-0" />
              {t("admin.upload.previewUnavailable")}
            </span>
          ) : kind === "video" ? (
            <video
              src={preview.url}
              muted
              playsInline
              preload="metadata"
              onError={() => setFailedUrl(preview.url)}
              className="size-20 object-cover"
            />
          ) : (
            // A plain <img> on purpose: the value can be ANY https URL the
            // operator pasted, and next/image would reject a host that is not
            // in `remotePatterns` — turning a legal value into a crash.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt=""
              className="size-20 object-cover"
              loading="lazy"
              onError={() => setFailedUrl(preview.url)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? t("admin.upload.uploading") : copy.pick}
            </Button>

            {/*
              "upload new OR select existing". Before this, the only way to set
              an image was to upload it again — so reusing a file that was
              already in the library meant duplicating it in the store. The
              picker writes the chosen Media's URL into the same field, and the
              server resolves the `mediaId` relationship from that URL on save,
              so nothing about this field's contract changes.
            */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => setPickerOpen(true)}
            >
              {t("admin.upload.fromLibrary")}
            </Button>

            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                disabled={disabled || uploading || removing}
                onClick={() => void handleRemove()}
              >
                {removing ? t("admin.upload.removing") : t("admin.upload.remove")}
              </Button>
            ) : null}
          </div>

          <p className="text-muted-foreground text-[11px]">{copy.hint}</p>

          {/*
            Honest progress for the direct-upload path. A 200 MB transfer with
            no feedback looks like a hang.
          */}
          {uploading && progress !== null ? (
            <div className="space-y-1" aria-live="polite">
              <p className="text-muted-foreground text-[11px]">
                {t("admin.upload.uploading")} {Math.round(progress)}%
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
              >
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-200"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
            </div>
          ) : null}

          {value ? (
            <p
              dir="ltr"
              className={cn(
                "text-muted-foreground truncate font-mono text-[11px]",
              )}
              title={value}
            >
              {value}
            </p>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so re-picking the SAME file fires `change` again.
          event.target.value = "";
          void handleFile(file);
        }}
      />

      {/*
        The picker reports a Media item; this field stores its URL. The
        `mediaId` relationship is resolved from that URL server-side on save, so
        the form contract stays exactly what it always was.
      */}
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mediaType={kind}
        onSelect={(item) =>
          setValue(name, item.url, { shouldValidate: true, shouldDirty: true })
        }
      />
    </>
  );

  if (bare) return <div className={className}>{control}</div>;

  return (
    <FieldRow
      label={label ?? ""}
      hint={hint}
      required={required}
      optional={optional}
      error={error}
      className={className}
    >
      {control}
    </FieldRow>
  );
}
