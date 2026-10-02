"use client";

import { ListFieldShell } from "@/components/admin/catalog/fields/ListFieldShell";
import { useList } from "@/components/admin/catalog/fields/form";
import { Input } from "@/components/ui/input";

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
      {(value, update) => (
        <Input
          dir="ltr"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(event) => update(event.target.value)}
        />
      )}
    </ListFieldShell>
  );
}
