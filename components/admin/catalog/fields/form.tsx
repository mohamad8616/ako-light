"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { errorCodeForType} from "@/lib/admin/result";
import { cn } from "@/lib/utils";
import { useWatch, useFormContext } from "react-hook-form";
import * as React from "react";

/** A react-hook-form error for one field path (as zodResolver produces them). */
export type FieldIssue = { type?: string } | undefined;

/** Resolves a field issue to its translated message, or null when valid. */
export function useFieldMessage(issue: FieldIssue): string | null {
  const { t } = useLanguage();
  if (!issue?.type) return null;
  return t(`admin.error.${errorCodeForType(issue.type)}`);
}

/**
 * Card that groups one form section (identity, relations, images…).
 *
 * `title`/`description` are already-translated strings passed by the entity's
 * form component — this kit never hardcodes copy.
 */
export function FormCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      {title ? (
        <div className="space-y-1">
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Label + hint + control + error: the exact wrapper every form control sits
 * in, so vertical rhythm and error styling are identical across sections.
 */
export function FieldRow({
  label,
  hint,
  required,
  optional,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Shows the shared "optional" hint when there is no other hint. */
  optional?: boolean;
  htmlFor?: string;
  error?: FieldIssue;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useLanguage();
  const message = useFieldMessage(error);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label
          htmlFor={htmlFor}
          className="text-foreground text-xs leading-none font-medium"
        >
          {label}
          {required ? (
            <span aria-hidden className="text-destructive ms-0.5">
              *
            </span>
          ) : null}
        </Label>
        {hint ??
          (optional ? (
            <span className="text-muted-foreground text-[11px]">
              {t("admin.crud.optional")}
            </span>
          ) : null)}
      </div>
      {children}
      {message ? (
        <p role="alert" className="text-destructive text-xs font-medium">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Row chrome shared by every repeatable list field (images, bio, credits…). */
export function ListRow({
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
  error,
}: {
  index: number;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: React.ReactNode;
  error?: FieldIssue;
}) {
  const { t } = useLanguage();
  const message = useFieldMessage(error);

  return (
    <li className="border-border bg-background/40 hover:border-ring/40 space-y-2 rounded-lg border p-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
          {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!onMoveUp}
            aria-label={t("admin.crud.moveUp")}
            onClick={onMoveUp}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!onMoveDown}
            aria-label={t("admin.crud.moveDown")}
            onClick={onMoveDown}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10"
            aria-label={t("admin.crud.remove")}
            onClick={onRemove}
          >
            ×
          </Button>
        </div>
      </div>
      {children}
      {message ? (
        <p role="alert" className="text-destructive text-xs font-medium">
          {message}
        </p>
      ) : null}
    </li>
  );
}

/** The "add another" button every repeatable list field ends with. */
export function AddRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useLanguage();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full border-dashed"
      onClick={onClick}
    >
      + {label ?? t("admin.crud.add")}
    </Button>
  );
}

/** Moves `index` by `delta` (-1 / +1); returns the same array at the edges. */
export function swapAt<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Controlled-array helper for the repeatable list fields.
 *
 * Drives the whole array with `useWatch` + `setValue` instead of
 * `useFieldArray`: these arrays hold scalars or unions, which field-array
 * typing cannot express, and a controlled swap keeps reorder/remove trivially
 * correct. (`LocalizedListField` still uses `useFieldArray` — its rows are
 * plain objects, which field-array handles natively.)
 */
export function useList<T>(
  name: string,
): [T[], (next: T[]) => void, FieldIssue | undefined] {
  const { control, setValue, formState } = useFormContext();
  const values = (useWatch({ control, name }) as T[] | undefined) ?? [];
  const setValues = React.useCallback(
    (next: T[]) => setValue(name, next, { shouldValidate: false }),
    [name, setValue],
  );
  return [values, setValues, formState.errors[name] as FieldIssue | undefined];
}
