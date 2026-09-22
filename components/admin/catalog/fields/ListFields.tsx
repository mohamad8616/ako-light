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
 * string[] list (gallery, portfolioImages, plain address lines…): add, remove
 * and reorder rows, each a single controlled input.
 */
export function StringListField({
  name,
  label,
  hint,
  optional,
  placeholder,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  placeholder?: string;
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
            <Input
              dir="ltr"
              placeholder={placeholder}
              value={value ?? ""}
              onChange={(event) =>
                setValues(
                  values.map((v, i) => (i === index ? event.target.value : v)),
                )
              }
            />
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

/**
 * (Localized | string)[] list — `Project.credits` and
 * `FlagshipDetail.info.addressLines` are genuinely mixed in the source data
 * (plain strings AND localized pairs), so every row carries a toggle that
 * converts it between the two representations.
 */
export function MixedListField({
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
  const { t } = useLanguage();
  const [values, setValues, error] = useList<Localized | string>(name);

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
    >
      <ul className="space-y-2">
        {values.map((value, index) => {
          const isLocalized = typeof value === "object" && value !== null;
          const toggle = () =>
            setValues(
              values.map((v, i) =>
                i === index
                  ? isLocalized
                    ? ((value as Localized).en ?? "")
                    : { en: value, fa: value }
                  : v,
              ),
            );

          return (
            <ListRow
              key={index}
              index={index}
              onRemove={() => setValues(values.filter((_, i) => i !== index))}
              onMoveUp={
                index > 0
                  ? () => setValues(swapAt(values, index, -1))
                  : undefined
              }
              onMoveDown={
                index < values.length - 1
                  ? () => setValues(swapAt(values, index, 1))
                  : undefined
              }
            >
              <div className="space-y-2">
                {isLocalized ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      dir="ltr"
                      value={(value as Localized).en ?? ""}
                      onChange={(event) =>
                        setValues(
                          values.map((v, i) =>
                            i === index
                              ? { ...(v as Localized), en: event.target.value }
                              : v,
                          ),
                        )
                      }
                    />
                    <Input
                      dir="rtl"
                      value={(value as Localized).fa ?? ""}
                      onChange={(event) =>
                        setValues(
                          values.map((v, i) =>
                            i === index
                              ? { ...(v as Localized), fa: event.target.value }
                              : v,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <Input
                    dir="ltr"
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) =>
                      setValues(
                        values.map((v, i) =>
                          i === index ? event.target.value : v,
                        ),
                      )
                    }
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={toggle}
                >
                  {isLocalized
                    ? t("admin.crud.asPlain")
                    : t("admin.crud.asLocalized")}
                </Button>
              </div>
            </ListRow>
          );
        })}
      </ul>
      <AddRowButton
        onClick={() => setValues([...values, ""])}
        label={addLabel}
      />
    </FieldRow>
  );
}

/**
 * Rows shaped `{ label: Localized, [valueName]: string }` —
 * `FlagshipDetail.info.hours` and `Product.downloads` share this shape (only
 * the value field's name differs: "value" vs "href"), so one component covers
 * both.
 */
export function LocalizedLabeledRowsField({
  name,
  label,
  hint,
  optional,
  valueName,
  valuePlaceholder,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  /** The row's string field name: "value" (hours) or "href" (downloads). */
  valueName: string;
  valuePlaceholder?: string;
  addLabel?: string;
  className?: string;
}) {
  type Row = { label: Localized; value: string };
  const [values, setValues, error] = useList<Row>(name);

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
    >
      <ul className="space-y-2">
        {values.map((row, index) => {
          const raw = row
            ? (row as unknown as Record<string, string | undefined>)[valueName]
            : undefined;

          return (
            <ListRow
              key={index}
              index={index}
              onRemove={() => setValues(values.filter((_, i) => i !== index))}
              onMoveUp={
                index > 0
                  ? () => setValues(swapAt(values, index, -1))
                  : undefined
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
                  value={row?.label?.en ?? ""}
                  onChange={(event) =>
                    setValues(
                      values.map((v, i) =>
                        i === index
                          ? {
                              ...v,
                              label: { ...v.label, en: event.target.value },
                            }
                          : v,
                      ),
                    )
                  }
                />
                <Input
                  dir="rtl"
                  placeholder="FA"
                  value={row?.label?.fa ?? ""}
                  onChange={(event) =>
                    setValues(
                      values.map((v, i) =>
                        i === index
                          ? {
                              ...v,
                              label: { ...v.label, fa: event.target.value },
                            }
                          : v,
                      ),
                    )
                  }
                />
              </div>
              <Input
                dir="ltr"
                placeholder={valuePlaceholder}
                value={raw ?? ""}
                onChange={(event) =>
                  setValues(
                    values.map((v, i) =>
                      i === index
                        ? { ...v, [valueName]: event.target.value }
                        : v,
                    ),
                  )
                }
              />
            </ListRow>
          );
        })}
      </ul>
      <AddRowButton
        onClick={() =>
          setValues([...values, { label: { en: "", fa: "" }, value: "" }])
        }
        label={addLabel}
      />
    </FieldRow>
  );
}
