"use client";

import {
  AddRowButton,
  FieldRow,
  ListRow,
  useFieldMessage,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFieldArray, useFormContext } from "react-hook-form";

/**
 * A paired {en, fa} control for one localized jsonb value.
 *
 * The FA input carries dir="rtl" explicitly: the admin shell is RTL, but under
 * /en/admin the html element still says ltr, so Persian text needs the
 * direction set on the input to lay out correctly inside the form.
 */
export function LocalizedField({
  name,
  label,
  hint,
  required,
  optional,
  textarea,
  rows = 4,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  /** Renders textareas (descriptions, paragraphs) instead of inputs. */
  textarea?: boolean;
  rows?: number;
  className?: string;
}) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name] as
    { en?: FieldIssue; fa?: FieldIssue } | undefined;
  const enMessage = useFieldMessage(error?.en);
  const faMessage = useFieldMessage(error?.fa);

  const control = (path: string, dir: "ltr" | "rtl") =>
    textarea ? (
      <Textarea dir={dir} rows={rows} {...register(path)} />
    ) : (
      <Input dir={dir} {...register(path)} />
    );

  return (
    <FieldRow
      label={label}
      hint={hint}
      required={required}
      optional={optional}
      className={className}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            EN
          </span>
          {control(`${name}.en`, "ltr")}
          {enMessage ? (
            <p role="alert" className="text-destructive text-xs font-medium">
              {enMessage}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            FA
          </span>
          {control(`${name}.fa`, "rtl")}
          {faMessage ? (
            <p role="alert" className="text-destructive text-xs font-medium">
              {faMessage}
            </p>
          ) : null}
        </div>
      </div>
    </FieldRow>
  );
}

/**
 * A Localized[] list (Designer.bio, Project.moreDescription): add/remove/reorder
 * rows, each an EN/FA pair.
 */
export function LocalizedListField({
  name,
  label,
  hint,
  optional,
  textarea,
  rows = 2,
  addLabel,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  textarea?: boolean;
  rows?: number;
  addLabel?: string;
  className?: string;
}) {
  const { control, register, formState } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const error = formState.errors[name] as FieldIssue | undefined;

  return (
    <FieldRow
      label={label}
      hint={hint}
      optional={optional}
      error={error}
      className={className}
    >
      <ul className="space-y-2">
        {fields.map((field, index) => (
          <ListRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
            onMoveUp={index > 0 ? () => move(index, index - 1) : undefined}
            onMoveDown={
              index < fields.length - 1
                ? () => move(index, index + 1)
                : undefined
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {textarea ? (
                <>
                  <Textarea
                    dir="ltr"
                    rows={rows}
                    {...register(`${name}.${index}.en`)}
                  />
                  <Textarea
                    dir="rtl"
                    rows={rows}
                    {...register(`${name}.${index}.fa`)}
                  />
                </>
              ) : (
                <>
                  <Input dir="ltr" {...register(`${name}.${index}.en`)} />
                  <Input dir="rtl" {...register(`${name}.${index}.fa`)} />
                </>
              )}
            </div>
          </ListRow>
        ))}
      </ul>
      <AddRowButton
        onClick={() => append({ en: "", fa: "" })}
        label={addLabel}
      />
    </FieldRow>
  );
}
