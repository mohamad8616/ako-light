"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  swapAt,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import * as React from "react";

/**
 * Shared chrome for the repeatable list fields.
 *
 * Every list field renders the same outer shape — a `FieldRow`, a `<ul>` of
 * `ListRow`s carrying the move-up / move-down / remove controls, and a trailing
 * "add another" button — and they differ only in what ONE row contains. That
 * wiring was previously copy-pasted three times; it lives here once.
 *
 * A field supplies `values` / `onChange` (from `useList`), the `emptyRow` the
 * add button appends, and a renderer for one row. The renderer receives
 * `update`, which replaces just that row, so no caller has to re-derive the
 * index itself.
 */
export function ListFieldShell<T>({
  label,
  hint,
  optional,
  error,
  className,
  addLabel,
  values,
  onChange,
  emptyRow,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: FieldIssue;
  className?: string;
  addLabel?: string;
  values: T[];
  onChange: (next: T[]) => void;
  /** The row the add button appends. */
  emptyRow: T;
  /** Renders one row's inputs; `update` replaces only that row. */
  children: (value: T, update: (next: T) => void) => React.ReactNode;
}) {
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
            onRemove={() => onChange(values.filter((_, i) => i !== index))}
            onMoveUp={
              index > 0 ? () => onChange(swapAt(values, index, -1)) : undefined
            }
            onMoveDown={
              index < values.length - 1
                ? () => onChange(swapAt(values, index, 1))
                : undefined
            }
          >
            {children(value, (next) =>
              onChange(values.map((v, i) => (i === index ? next : v))),
            )}
          </ListRow>
        ))}
      </ul>
      <AddRowButton
        onClick={() => onChange([...values, emptyRow])}
        label={addLabel}
      />
    </FieldRow>
  );
}
