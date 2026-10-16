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
 * Upload/replace/remove a catalogue-style document (PDF or PowerPoint).
 *
 * Edits the stored URL and presentable filename together. No URL text input and
 * no library picker: these documents are uploads, not pasted links or Media
 * rows. Remove is staged in the form; the save action clears the DB reference
 * first and deletes the previous object afterwards, so navigating away without
 * saving keeps the live row's file intact.
 *
 * TWO MOUTHS, ONE IMPLEMENTATION. {@link DocumentUpload} is the standalone
 * field with its own label (`/admin/catalogue` cards). {@link
 * DocumentUploadControls} is the same machinery for a caller that supplies its
 * own chrome — the product form's `downloads` rows, which are already inside a
 * `ListRow`. Everything between the file input and the toast lives in one
 * place; only the wrapper differs.
 */
export interface DocumentUploadProps {
  /** The form path holding the document URL. */
  urlName: string;
  /** The form path holding the presentable filename. */
  nameName: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

/** The label + hint + controls shell, shared by both entries below. */
function DocumentUploadView({
  label,
  hint,
  required,
  optional,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  error?: FieldIssue;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      error={error}
      className={className}
    >
      {children}
    </FieldRow>
  );
}

/** The standalone field: label + the upload controls. */
export function DocumentUpload(props: DocumentUploadProps) {
  return <DocumentUploadControls {...props} />;
}

/**
 * The upload/replace/remove controls for one catalogue-style document, WITHOUT
 * the surrounding `FieldRow`.
 *
 * Split out of {@link DocumentUpload} so the same controls can sit inside a
 * repeatable row (the product form's `downloads` list) where the row chrome is
 * already provided by the list field. Both callers share every line of the
 * upload, progress and clear logic — there is no second implementation.
 */
export function DocumentUploadControls({
  urlName,
  nameName,
  label,
  hint,
  required,
  optional,
  className,
}: DocumentUploadProps) {
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
    <DocumentUploadView
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      className={className}
      error={error}
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
    </DocumentUploadView>
  );
}
