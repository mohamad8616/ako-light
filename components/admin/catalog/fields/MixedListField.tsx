"use client";

import { ListFieldShell } from "@/components/admin/catalog/fields/ListFieldShell";
import { useList } from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
    <ListFieldShell
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
      addLabel={addLabel}
      values={values}
      onChange={setValues}
      emptyRow=""
    >
      {(value, update) => {
        const isLocalized = typeof value === "object" && value !== null;

        return (
          <div className="space-y-2">
            {isLocalized ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  dir="ltr"
                  value={(value as Localized).en ?? ""}
                  onChange={(event) =>
                    update({ ...(value as Localized), en: event.target.value })
                  }
                />
                <Input
                  dir="rtl"
                  value={(value as Localized).fa ?? ""}
                  onChange={(event) =>
                    update({ ...(value as Localized), fa: event.target.value })
                  }
                />
              </div>
            ) : (
              <Input
                dir="ltr"
                value={typeof value === "string" ? value : ""}
                onChange={(event) => update(event.target.value)}
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() =>
                update(
                  isLocalized
                    ? ((value as Localized).en ?? "")
                    : { en: value as string, fa: value as string },
                )
              }
            >
              {isLocalized
                ? t("admin.crud.asPlain")
                : t("admin.crud.asLocalized")}
            </Button>
          </div>
        );
      }}
    </ListFieldShell>
  );
}
