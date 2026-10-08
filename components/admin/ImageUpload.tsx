"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  swapAt,
  useList,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { MediaPickerDialog } from "@/components/admin/settings/MediaPickerField";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import * as React from "react";

import { uploadImageAction } from "@/lib/admin/actions/upload";

/**
 * The admin's image field: preview + real upload to Liara Object Storage.
 *
 * A drop-in replacement for the plain URL text inputs every image field used
 * to be. The component's OUTPUT IS STILL JUST A URL STRING — it writes the
 * uploaded file's public URL into its react-hook-form field and nothing else —
 * so no zod schema changes shape (`imageRefSchema` still validates a URL
 * string) and every existing seeded/external URL keeps working.
 *
 * Reads and writes through `useFormContext()` like the rest of the field kit
 * (components/admin/catalog/fields/*), so it must be rendered inside a
 * FormProvider. Nested paths ("detail.heroImage", "images.0.url") are
 * supported for both reading and error lookup.
 */

/**
 * Resolves a (possibly nested) field path against react-hook-form's error
 * object. The kit's other fields index `formState.errors[name]` directly,
 * which silently misses nested paths — this walks them instead.
 */
function errorAtPath(
  errors: unknown,
  path: string,
): FieldIssue | undefined {
  let current: unknown = errors;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return (current as FieldIssue | undefined) ?? undefined;
}

export function ImageUpload({
  name,
  label,
  hint,
  required,
  optional,
  /** Storage key group ("products", "designers", …); defaults to "uploads". */
  folder,
  disabled,
  bare,
  className,
}: {
  /** The form field path holding the image URL string. */
  name: string;
  /**
   * Omitted when `bare` is set — inside a `ListRow` the row already carries
   * its own chrome, so a second label/error block would double up.
   */
  label?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
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
  /** The reusable Media picker (Pass 13.5C) — "select existing", not "upload again". */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      setUploading(true);
      try {
        const payload = new FormData();
        payload.set("file", file);
        if (folder) payload.set("folder", folder);

        const result = await uploadImageAction(payload);
        if (result.ok) {
          setValue(name, result.data.url, {
            shouldValidate: true,
            shouldDirty: true,
          });
          toast.success(t("admin.upload.done"));
        } else {
          // Structured code -> the shared translated message, exactly like
          // every other admin failure (useCrudSubmit's contract).
          toast.error(t(`admin.error.${result.formError}`));
        }
      } catch {
        toast.error(t("admin.error.unknown"));
      } finally {
        setUploading(false);
      }
    },
    [folder, name, setValue, t],
  );

  const error = errorAtPath(formState.errors, name);

  const control = (
    <>
      <div className="flex items-start gap-3">
        <div className="border-border bg-muted size-20 shrink-0 overflow-hidden rounded-md border">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="size-20 object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-muted-foreground flex size-20 items-center justify-center text-[10px]">
              {t("admin.upload.empty")}
            </span>
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
              {uploading ? t("admin.upload.uploading") : t("admin.upload.pick")}
            </Button>

            {/*
              Pass 13.5C: "upload new OR select existing".
              
              Before this, the only way to set an image was to upload it again —
              so reusing a file that was already in the library meant duplicating
              it in the store. The picker writes the chosen Media's URL into the
              same field, and the server resolves the `mediaId` relationship from
              that URL on save, so nothing about this field's contract changes.
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
                disabled={disabled || uploading}
                onClick={() =>
                  setValue(name, "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                {t("admin.upload.remove")}
              </Button>
            ) : null}
          </div>

          <p className="text-muted-foreground text-[11px]">
            {t("admin.upload.hint")}
          </p>

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
        accept="image/jpeg,image/png,image/webp,image/avif"
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

/**
 * A `string[]` list of image URLs — the upload-aware sibling of the kit's
 * `StringListField` (used by the flagship gallery).
 *
 * Same row chrome (index, reorder, remove) as every other list field; only the
 * row's control changes, so each entry gets a preview + real upload instead of
 * a URL text input. Output stays a plain `string[]`, so the zod schema is
 * unchanged.
 */
export function ImageListField({
  name,
  label,
  hint,
  optional,
  folder,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  folder?: string;
  addLabel?: string;
  className?: string;
}) {
  const [values, setValues, error] = useList<string>(name);

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
    >
      <ul className="space-y-2">
        {values.map((value, index) => (
          <ListRow
            key={index}
            index={index}
            onRemove={() => setValues(values.filter((_, i) => i !== index))}
            onMoveUp={
              index > 0 ? () => setValues(swapAt(values, index, -1)) : undefined
            }
            onMoveDown={
              index < values.length - 1
                ? () => setValues(swapAt(values, index, 1))
                : undefined
            }
          >
            <ImageUpload bare name={`${name}.${index}`} folder={folder} />
          </ListRow>
        ))}
      </ul>
      <AddRowButton
        onClick={() => setValues([...values, ""])}
        label={addLabel}
      />
    </FieldRow>
  );
}
