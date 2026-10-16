"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  swapAt,
  useList,
} from "@/components/admin/catalog/fields/form";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * The ProductImage list: add/remove/reorder rows and mark the primary one.
 *
 * `sortOrder` is derived from array position by the repository (never sent), and
 * "no primary" falls back to the first row server-side, so the star toggle is a
 * convenience rather than a correctness requirement.
 *
 * `Product.related` is NOT edited here: it is a denormalized snapshot of other
 * products, so the form uses `ProductsUsedField` in "snapshot" mode (a
 * category → product picker) instead of hand-typed rows.
 */
export function ProductImagesField({
  name,
  label,
  hint,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  addLabel?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  type Row = {
    id?: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
  };
  const [values, setValues, error] = useList<Row>(name);

  return (
    <FieldRow label={label} hint={hint} error={error} className={className}>
      <ul className="space-y-2">
        {values.map((row, index) => (
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
            <div className="space-y-2">
              {/* Upload-aware URL field: still writes a plain URL string into
                  `images.<index>.url`, so the schema shape is untouched. */}
              <ImageUpload
                bare
                name={`${name}.${index}.url`}
                folder="products"
              />
              <div className="space-y-2">
                <Input
                  dir="ltr"
                  placeholder={t("admin.crud.alt")}
                  value={row?.alt ?? ""}
                  onChange={(event) =>
                    setValues(
                      values.map((v, i) =>
                        i === index ? { ...v, alt: event.target.value } : v,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant={row?.isPrimary ? "default" : "outline"}
                  size="xs"
                  onClick={() =>
                    setValues(
                      values.map((v, i) => ({ ...v, isPrimary: i === index })),
                    )
                  }
                >
                  {row?.isPrimary ? "★ " : ""}
                  {t("admin.crud.primary")}
                </Button>
              </div>
            </div>
          </ListRow>
        ))}
      </ul>
      <AddRowButton
        onClick={() =>
          setValues([...values, { url: "", alt: "", isPrimary: false }])
        }
        label={addLabel}
      />
    </FieldRow>
  );
}
