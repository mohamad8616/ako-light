"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  swapAt,
  useList,
} from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * One "related product" row of the denormalized `Product.related` jsonb array
 * ({ name: Localized, slug, category, image }).
 *
 * The schema deliberately keeps this denormalized ("until the admin dashboard
 * decides whether this becomes a self-relation"), so the form edits the
 * snapshot fields directly — it is NOT a product picker; a self-relation would
 * be a later schema pass.
 */
export function RelatedField({
  name,
  label,
  hint,
  optional,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  addLabel?: string;
  className?: string;
}) {
  type Row = {
    name: Localized;
    slug: string;
    category: string;
    image: string;
  };
  const [values, setValues, error] = useList<Row>(name);

  const patch = (
    index: number,
    key: "slug" | "category" | "image",
    next: string,
  ) =>
    setValues(
      values.map((row, i) => (i === index ? { ...row, [key]: next } : row)),
    );

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
    >
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
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                dir="ltr"
                placeholder="EN"
                value={row?.name?.en ?? ""}
                onChange={(event) =>
                  setValues(
                    values.map((v, i) =>
                      i === index
                        ? { ...v, name: { ...v.name, en: event.target.value } }
                        : v,
                    ),
                  )
                }
              />
              <Input
                dir="rtl"
                placeholder="FA"
                value={row?.name?.fa ?? ""}
                onChange={(event) =>
                  setValues(
                    values.map((v, i) =>
                      i === index
                        ? { ...v, name: { ...v.name, fa: event.target.value } }
                        : v,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                dir="ltr"
                placeholder="slug"
                className="font-mono text-xs"
                value={row?.slug ?? ""}
                onChange={(event) => patch(index, "slug", event.target.value)}
              />
              <Input
                dir="ltr"
                placeholder="category"
                value={row?.category ?? ""}
                onChange={(event) =>
                  patch(index, "category", event.target.value)
                }
              />
              <Input
                dir="ltr"
                placeholder="https://…"
                value={row?.image ?? ""}
                onChange={(event) => patch(index, "image", event.target.value)}
              />
            </div>
          </ListRow>
        ))}
      </ul>
      <AddRowButton
        onClick={() =>
          setValues([
            ...values,
            { name: { en: "", fa: "" }, slug: "", category: "", image: "" },
          ])
        }
        label={addLabel}
      />
    </FieldRow>
  );
}

/**
 * The ProductImage list: add/remove/reorder rows and mark the primary one.
 *
 * `sortOrder` is derived from array position by the repository (never sent), and
 * "no primary" falls back to the first row server-side, so the star toggle is a
 * convenience rather than a correctness requirement.
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
            <div className="flex gap-3">
              <div className="border-border bg-muted size-16 shrink-0 overflow-hidden rounded-md border">
                {row?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.url}
                    alt=""
                    className="size-16 object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  dir="ltr"
                  placeholder="https://…"
                  value={row?.url ?? ""}
                  onChange={(event) =>
                    setValues(
                      values.map((v, i) =>
                        i === index ? { ...v, url: event.target.value } : v,
                      ),
                    )
                  }
                />
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
