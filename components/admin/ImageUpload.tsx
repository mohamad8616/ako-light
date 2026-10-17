"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  swapAt,
  useList,
} from "@/components/admin/catalog/fields/form";
import { MediaField } from "@/components/admin/MediaField";

/**
 * The admin's IMAGE field: preview + real upload to Liara Object Storage.
 *
 * A drop-in replacement for the plain URL text inputs every image field used
 * to be. The component's OUTPUT IS STILL JUST A URL STRING — it writes the
 * uploaded file's public URL into its react-hook-form field and nothing else —
 * so no zod schema changes shape (`imageRefSchema` still validates a URL
 * string) and every existing seeded/external URL keeps working.
 *
 * ── It is now a thin wrapper over `MediaField` (Pass D.1) ───────────────────
 *
 * The preview, the upload path, the library picker, the clear button and the
 * broken-URL fallback all live in ONE implementation, because the hero and
 * video sections need the identical field for a different media kind. Keeping
 * a second copy here would have meant two copies of the only code that writes
 * into the storage bucket.
 *
 * The public API is unchanged on purpose — every caller below this line
 * (`ProductFields`, `FlagshipForm`, `CollectionForm`, the five homepage slot
 * forms, `ImageListField`, …) is untouched, and each one silently gains the
 * restored thumbnail and the load-failure fallback.
 */
export function ImageUpload(props: {
  /** The form field path holding the image URL string. */
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  /** Storage key group ("products", "designers", …); defaults to "uploads". */
  folder?: string;
  disabled?: boolean;
  /** Render just the control (for embedding in list rows). */
  bare?: boolean;
  className?: string;
}) {
  return <MediaField {...props} kind="image" />;
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
  required,
  optional,
  folder,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  /** Marks the list as a necessary input (the form schema still enforces it). */
  required?: boolean;
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
      required={required}
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
