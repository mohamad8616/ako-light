"use client";

import { ListFieldShell } from "@/components/admin/catalog/fields/ListFieldShell";
import { useList } from "@/components/admin/catalog/fields/form";
import { Input } from "@/components/ui/input";
import type { Localized } from "@/lib/i18n/localized";

/** One row: a localized label plus a single string field. */
type LocalizedLabeledRow = { label: Localized; value: string };

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
  const [values, setValues, error] = useList<LocalizedLabeledRow>(name);

  return (
    <ListFieldShell<LocalizedLabeledRow>
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
      addLabel={addLabel}
      values={values}
      onChange={setValues}
      emptyRow={{ label: { en: "", fa: "" }, value: "" }}
    >
      {(row, update) => {
        const raw = row
          ? (row as unknown as Record<string, string | undefined>)[valueName]
          : undefined;

        return (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                dir="ltr"
                placeholder="EN"
                value={row?.label?.en ?? ""}
                onChange={(event) =>
                  update({
                    ...row,
                    label: { ...row.label, en: event.target.value },
                  })
                }
              />
              <Input
                dir="rtl"
                placeholder="FA"
                value={row?.label?.fa ?? ""}
                onChange={(event) =>
                  update({
                    ...row,
                    label: { ...row.label, fa: event.target.value },
                  })
                }
              />
            </div>
            <Input
              dir="ltr"
              placeholder={valuePlaceholder}
              value={raw ?? ""}
              onChange={(event) =>
                update({ ...row, [valueName]: event.target.value })
              }
            />
          </>
        );
      }}
    </ListFieldShell>
  );
}
