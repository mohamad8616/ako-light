"use client";

import {
  FieldRow,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";

/**
 * Numeric input bound through `valueAsNumber` (no `z.coerce` anywhere: the
 * schema's `z.input` stays equal to its `z.output`). An empty field yields NaN,
 * which zod rejects as invalid_type — surfacing the translated "required".
 */
export function NumberField({
  name,
  label,
  hint,
  required,
  optional,
  min,
  max,
  step = 1,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const { register, formState } = useFormContext();

  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      error={formState.errors[name] as FieldIssue}
      className={className}
    >
      <Input
        type="number"
        dir="ltr"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        className="w-28 tabular-nums"
        {...register(name, { valueAsNumber: true })}
      />
    </FieldRow>
  );
}

/**
 * Boolean toggle (existsInStore) bound through `Controller`, since base-ui's
 * Switch is not a native input react-hook-form can register.
 */
export function SwitchField({
  name,
  label,
  hint,
  description,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  description?: string;
  className?: string;
}) {
  const { control } = useFormContext();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label className="text-foreground text-xs leading-none font-medium">
            {label}
          </Label>
          {description ? (
            <p className="text-muted-foreground text-[11px]">{description}</p>
          ) : null}
        </div>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(checked)}
            />
          )}
        />
      </div>
      {hint ? (
        <p className="text-muted-foreground text-[11px]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Hex colour input (swatch / cover colours) with a live preview chip, so the
 * editor sees the colour without leaving the form.
 */
export function ColorField({
  name,
  label,
  hint,
  optional,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  className?: string;
}) {
  const { register, watch, formState } = useFormContext();
  const value = (watch(name) as string) ?? "";
  const previewable =
    /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?$/.test(value);

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={formState.errors[name] as FieldIssue}
      className={className}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="border-border bg-muted size-6 shrink-0 rounded-full border"
          style={previewable ? { background: value } : undefined}
        />
        <Input dir="ltr" className="font-mono text-xs" {...register(name)} />
      </div>
    </FieldRow>
  );
}

/**
 * Single-line text/URL field — the plain, non-list sibling of the list fields
 * (image references, codes, locations…). `dir="ltr"` by default since these
 * values are URLs, codes and ids, not prose.
 */
export function TextField({
  name,
  label,
  hint,
  required,
  optional,
  dir = "ltr",
  placeholder,
  mono,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  const { register, formState } = useFormContext();

  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      error={formState.errors[name] as FieldIssue}
      className={className}
    >
      <Input
        dir={dir}
        placeholder={placeholder}
        className={mono ? "font-mono text-xs" : undefined}
        {...register(name)}
      />
    </FieldRow>
  );
}
