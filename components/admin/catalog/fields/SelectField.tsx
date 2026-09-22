"use client";

import {
  FieldRow,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { Controller, useFormContext } from "react-hook-form";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A select bound to react-hook-form via `Controller`.
 *
 * `items` is passed to the base-ui root so SelectValue renders the selected
 * option's LABEL rather than its raw value (an id/slug would be unreadable).
 * The popup renders into document.body, outside the shell's RTL wrapper, so it
 * carries ADMIN_SHELL_DIR explicitly (see components/ui/direction.tsx).
 *
 * `allowEmpty` renders a nullable option whose selection writes `null`,
 * matching the schemas' `.nullable()` fields (designer, coverTextColor…).
 */
export function SelectField({
  name,
  label,
  hint,
  required,
  optional,
  options,
  placeholder,
  allowEmpty,
  emptyLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  options: SelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const { control, formState } = useFormContext();

  const items = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      error={formState.errors[name] as FieldIssue}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            items={items}
            value={(field.value as string | null) ?? ""}
            onValueChange={(value) =>
              field.onChange(value === "" ? null : value)
            }
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder={placeholder ?? label} />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {allowEmpty ? (
                <SelectItem value="">
                  {emptyLabel ?? placeholder ?? label}
                </SelectItem>
              ) : null}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldRow>
  );
}
