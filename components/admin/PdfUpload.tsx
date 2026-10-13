"use client";

/**
 * The admin's PDF field: a real upload to object storage, for the catalogue
 * CTA's downloadable file.
 *
 * ── Why it is not `ImageUpload` ─────────────────────────────────────────────
 *
 * `ImageUpload` is built around a thumbnail and an image picker, and its value
 * is a single URL string. A PDF has no thumbnail, must not offer the image
 * library, and needs a SECOND value alongside the URL: the presentable filename
 * that the download is served with. So this component writes TWO fields —
 * `urlName` and `nameName` — and always writes them together, so the two
 * columns can never disagree about what the button downloads.
 *
 * The two-field contract is why it is a sibling rather than an option on the
 * image field: an optional second name on a component every image field in the
 * admin uses would be a flag almost every caller ignores.
 *
 * Reads and writes through `useFormContext()`, like the rest of the field kit,
 * so it must be rendered inside a `FormProvider`.
 */
import {
  FieldRow,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import { removeMediaUrlAction } from "@/lib/admin/actions/media";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { uploadCataloguePdfAction } from "@/lib/admin/actions/upload";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import * as React from "react";

export function PdfUpload({
  urlName,
  nameName,
  label,
  hint,
  optional,
  className,
}: {
  /** The form field holding the uploaded file's public URL. */
  urlName: string;
  /** The form field holding the presentable filename. */
  nameName: string;
  label: string;
  hint?: string;
  optional?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const { watch, setValue, formState } = useFormContext();
  const url = (watch(urlName) as string | undefined) ?? "";
  const storedName = (watch(nameName) as string | undefined) ?? "";

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  /** True while the stored object is being deleted behind the Remove button. */
  const [removing, setRemoving] = React.useState(false);

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      setUploading(true);
      try {
        const payload = new FormData();
        payload.set("file", file);

        const result = await uploadCataloguePdfAction(payload);
        if (result.ok) {
          // Both halves at once — a URL without its name would make the
          // download fall back to a storage-key filename.
          setValue(urlName, result.data.url, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setValue(nameName, result.data.name, {
            shouldValidate: true,
            shouldDirty: true,
          });
          toast.success(t("admin.upload.pdfDone"));
        } else {
          // The structured code maps to the shared translated message, exactly
          // like every other admin failure.
          toast.error(t(`admin.error.${result.formError}`));
        }
      } catch {
        toast.error(t("admin.error.unknown"));
      } finally {
        setUploading(false);
        // Let the same file be chosen again after a rejection.
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [nameName, setValue, t, urlName],
  );

  /**
   * Clear BOTH fields, then delete the object.
   *
   * Same shape as `MediaField`'s remove: the fields clear first so the control
   * is never half-applied, then the object goes. A PDF has no Media row, so
   * `removeMediaUrlAction` takes its direct-delete branch — the catalogue key
   * lives under `media/catalogue/`, which the cleanup helper accepts.
   */
  const clear = React.useCallback(async () => {
    const removed = url;
    setValue(urlName, "", { shouldValidate: true, shouldDirty: true });
    setValue(nameName, "", { shouldValidate: true, shouldDirty: true });

    if (!removed) return;

    setRemoving(true);
    try {
      const result = await removeMediaUrlAction({ url: removed });
      if (result.ok) {
        toast.success(t("admin.upload.removed"));
      } else {
        toast.error(t(`admin.error.${result.formError}`));
      }
    } catch {
      toast.error(t("admin.error.unknown"));
    } finally {
      setRemoving(false);
    }
  }, [nameName, setValue, t, url, urlName]);

  const error = formState.errors[urlName] as FieldIssue;

  return (
    <FieldRow label={label} hint={hint} optional={optional} error={error} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {/* A plain input, opened by the button — the same pattern the image
            field uses, so the control looks identical in both places. */}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? t("admin.upload.uploading")
            : url
              ? t("admin.upload.pdfReplace")
              : t("admin.upload.pdfPick")}
        </Button>

        {url ? (
          <>
            {/* `dir="ltr"` — a filename is not prose, and the admin shell is
                RTL, so without it an English name renders mirrored. */}
            <span
              dir="ltr"
              className="text-muted-foreground max-w-[16rem] truncate text-xs"
              title={storedName || url}
            >
              {storedName || url.split("/").pop()}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              {t("admin.crud.view")}
            </a>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={uploading || removing}
          onClick={() => void clear()}
        >
          {removing ? t("admin.upload.removing") : t("admin.upload.remove")}
        </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("admin.upload.pdfEmpty")}
          </span>
        )}
      </div>
    </FieldRow>
  );
}
