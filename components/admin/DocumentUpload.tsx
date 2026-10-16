"use client";

import {
  FieldRow,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  DOCUMENT_ACCEPT,
  uploadCatalogueDocumentFile,
  type CatalogueDocumentUploadPhase,
} from "@/lib/media/document-upload-client";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import * as React from "react";

/**
 * Upload/replace/remove a catalogue-card document (PDF or PowerPoint).
 *
 * Edits the stored URL and presentable filename together. No URL text input and
 * no library picker: catalogue documents are uploads, not pasted links or Media
 * rows. Remove is staged in the form; the save action clears the DB reference
 * first and deletes the previous object afterwards, so navigating away without
 * saving keeps the live card's file intact.
 */
export function DocumentUpload({
  urlName,
  nameName,
  label,
  hint,
  required,
  optional,
  className,
}: {
  urlName: string;
  nameName: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const { watch, setValue, formState } = useFormContext();
  const url = (watch(urlName) as string | undefined) ?? "";
  const name = (watch(nameName) as string | undefined) ?? "";
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [phase, setPhase] = React.useState<CatalogueDocumentUploadPhase>("uploading");
  const [progress, setProgress] = React.useState<number | null>(null);
  const error = formState.errors[urlName] as FieldIssue;

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setUploading(true);
      setPhase("uploading");
      setProgress(null);
      try {
        const outcome = await uploadCatalogueDocumentFile(file, {
          onProgress: setProgress,
          onPhase: setPhase,
        });
        if (!outcome.ok) {
          toast.error(t(`admin.error.${outcome.code}`));
          return;
        }
        setValue(urlName, outcome.url, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue(nameName, outcome.name, {
          shouldValidate: true,
          shouldDirty: true,
        });
        toast.success(t("admin.upload.documentDone"));
      } catch {
        toast.error(t("admin.error.unknown"));
      } finally {
        setUploading(false);
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [nameName, setValue, t, urlName],
  );

  const clear = React.useCallback(() => {
    setValue(urlName, "", { shouldValidate: true, shouldDirty: true });
    setValue(nameName, "", { shouldValidate: true, shouldDirty: true });
    toast.message(t("admin.upload.documentCleared"));
  }, [nameName, setValue, t, urlName]);

  const displayedName = name || url.split("/").pop() || "";

  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      error={error}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? phase === "saving"
              ? t("admin.upload.documentSaving")
              : t("admin.upload.uploading")
            : url
              ? t("admin.upload.documentReplace")
              : t("admin.upload.documentPick")}
        </Button>

        {url ? (
          <>
            <span
              dir="ltr"
              className="text-muted-foreground max-w-[16rem] truncate text-xs"
              title={displayedName}
            >
              {displayedName}
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
              disabled={uploading}
              onClick={clear}
            >
              {t("admin.upload.remove")}
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("admin.upload.documentEmpty")}
          </span>
        )}
      </div>

      {uploading && progress !== null ? (
        <div className="mt-2 space-y-1" aria-live="polite">
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
    </FieldRow>
  );
}
