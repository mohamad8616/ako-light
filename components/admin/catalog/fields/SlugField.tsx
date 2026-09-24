"use client";

import {
  FieldRow,
  useFieldMessage,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultSlugFromName, isSlug } from "@/lib/admin/slug";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useFormContext } from "react-hook-form";
import * as React from "react";

/**
 * The slug / route-handle control, with the item-5 rules:
 *
 *   - on CREATE, it auto-derives from the English name while the editor has
 *     not touched it (a Persian-only name slugifies to "" and the editor types
 *     one — see lib/admin/slug.ts);
 *   - "regenerate from name" re-derives on demand and marks the field manual;
 *   - typing a slug by hand switches the field to manual immediately, so
 *     later name edits never clobber it;
 *   - changing an EXISTING slug warns (never blocks) that public URLs change.
 *     No SlugHistory redemption exists yet — the action modules carry the TODO.
 */
export function SlugField({
  name,
  label,
  hint,
  required,
  source,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Form path of the (English) display name the slug derives from. */
  source?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const { register, watch, setValue, formState } = useFormContext();

  const [initialSlug] = React.useState(() => (watch(name) as string) ?? "");
  const [manual, setManual] = React.useState(false);
  const lastAuto = React.useRef("");

  const value = (watch(name) as string) ?? "";
  const sourceValue = source ? ((watch(source) as string) ?? "") : "";
  const error = formState.errors[name] as FieldIssue | undefined;
  const message = useFieldMessage(error);
  const invalid = value !== "" && !isSlug(value);

  React.useEffect(() => {
    if (manual || !source) return;
    const derived = defaultSlugFromName(sourceValue);
    if (value !== "" && value !== lastAuto.current) {
      setManual(true);
      return;
    }
    lastAuto.current = derived;
    if (value !== derived) {
      setValue(name, derived, { shouldValidate: false });
    }
  }, [manual, name, setValue, source, sourceValue, value]);

  const renamed = manual && initialSlug !== "" && value !== initialSlug;

  return (
    <FieldRow
      label={label}
      hint={hint ?? t("admin.crud.slugHint")}
      required={required}
      className={className}
    >
      <div className="flex items-center gap-2">
        <Input
          dir="ltr"
          aria-invalid={invalid || undefined}
          className="font-mono text-xs"
          {...register(name)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={regenerate}
        >
          {t("admin.crud.slugRegenerate")}
        </Button>
      </div>
      {renamed ? (
        <p className="bg-warning/10 text-warning rounded-md px-3 py-2 text-xs font-medium">
          {t("admin.crud.slugWarning")}
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-destructive text-xs font-medium">
          {message}
        </p>
      ) : null}
    </FieldRow>
  );

  function regenerate() {
    setManual(true);
    setValue(name, defaultSlugFromName(sourceValue), { shouldValidate: true });
  }
}
