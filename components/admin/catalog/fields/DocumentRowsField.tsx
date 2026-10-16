"use client";

import { ListFieldShell } from "@/components/admin/catalog/fields/ListFieldShell";
import { useList } from "@/components/admin/catalog/fields/form";
import { DocumentUploadControls } from "@/components/admin/DocumentUpload";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Localized } from "@/lib/i18n/localized";

/**
 * One row: a localized label plus an UPLOADED document (`href` + `name`).
 *
 * `href` is the stored object URL and `name` the presentable filename, exactly
 * the pair `/admin/catalogue` keeps in its two columns and the pair the download
 * route needs for `Content-Disposition`. The label is the only thing the
 * operator types; the file itself always comes from the picker — there is no URL
 * input here, which is the whole point of the field.
 */
type DocumentRow = { label: Localized; href: string; name: string };

/**
 * Rows of `{ label: Localized, href, name }` where `href`/`name` are produced by
 * the shared {@link DocumentUploadControls}.
 *
 * The product form's `downloads` column is a jsonb array in this shape. It used
 * to be edited as `{ label, href }` rows with a pasted URL (`linkSchema`); the
 * operator now picks a PDF/PowerPoint file the same way a catalogue card does,
 * so the two upload experiences cannot drift — both go through the one control,
 * the one client upload, and the one server path.
 */
export function DocumentRowsField({
  name,
  label,
  hint,
  optional,
  labelPlaceholder,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  /** Shown as the row's EN/FA label inputs' placeholder pair. */
  labelPlaceholder?: string;
  addLabel?: string;
  className?: string;
}) {
  const [values, setValues, error] = useList<DocumentRow>(name);
  const { t } = useLanguage();

  return (
    <ListFieldShell<DocumentRow>
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
      addLabel={addLabel}
      values={values}
      onChange={setValues}
      emptyRow={{ label: { en: "", fa: "" }, href: "", name: "" }}
    >
      {(row, update) => {
        // The row index in `values` — needed to address the row's own form
        // paths so the SHARED upload controls write into THIS row.
        const index = values.indexOf(row);
        const base = `${name}.${index}`;
        return (
          <>
            <div className="space-y-2">
              <span className="text-muted-foreground text-[11px] font-medium">
                {labelPlaceholder ?? t("admin.product.field.downloadLabel")}
              </span>
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
            </div>
            {/* The upload writes `href` and `name` through setValue, so the
                row object stays in RHF's control — no local mirror to sync. */}
            <DocumentUploadControls
              urlName={`${base}.href`}
              nameName={`${base}.name`}
              label={t("admin.product.field.downloads")}
            />
          </>
        );
      }}
    </ListFieldShell>
  );
}
