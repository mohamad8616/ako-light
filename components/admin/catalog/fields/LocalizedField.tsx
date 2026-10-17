"use client";

import {
  AddRowButton,
  FieldMessage,
  FieldRow,
  ListRow,
  useFieldMessage,
  type FieldIssue,
} from "@/components/admin/catalog/fields/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFieldArray, useFormContext } from "react-hook-form";

/**
 * The EN/FA tint of every localized text control in the admin panel.
 *
 * Color is the direction cue the operator asked for: the pale-yellow half is
 * where ENGLISH text goes (the LTR control), the pale-green half is where
 * PERSIAN text goes (the RTL control) — regardless of which locale the admin
 * shell is being viewed in.
 */
const EN_FIELD_CLASS = "bg-[#fbf8cc]";
const FA_FIELD_CLASS = "bg-[#ecf39e]";

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
  textareaClassName,
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
  /**
   * Extra classes for the TEXTAREA controls only — e.g. `text-sm` where the
   * text runs long (the collection paragraphs) and the default size reads
   * oversized. The inputs are unaffected.
   */
  textareaClassName?: string;
  className?: string;
}) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name] as
    { en?: FieldIssue; fa?: FieldIssue } | undefined;
  const enMessage = useFieldMessage(error?.en);
  const faMessage = useFieldMessage(error?.fa);

  const control = (path: string, dir: "ltr" | "rtl") => {
    const tint = dir === "ltr" ? EN_FIELD_CLASS : FA_FIELD_CLASS;
    const size = textarea ? textareaClassName : undefined;
    return textarea ? (
      <Textarea
        dir={dir}
        rows={rows}
        className={size ? `${tint} ${size}` : tint}
        {...register(path)}
      />
    ) : (
      <Input dir={dir} className={tint} {...register(path)} />
    );
  };

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
          {enMessage ? <FieldMessage>{enMessage}</FieldMessage> : null}
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            FA
          </span>
          {control(`${name}.fa`, "rtl")}
          {faMessage ? <FieldMessage>{faMessage}</FieldMessage> : null}
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
                    className={EN_FIELD_CLASS}
                    rows={rows}
                    {...register(`${name}.${index}.en`)}
                  />
                  <Textarea
                    dir="rtl"
                    className={FA_FIELD_CLASS}
                    rows={rows}
                    {...register(`${name}.${index}.fa`)}
                  />
                </>
              ) : (
                <>
                  <Input
                    dir="ltr"
                    className={EN_FIELD_CLASS}
                    {...register(`${name}.${index}.en`)}
                  />
                  <Input
                    dir="rtl"
                    className={FA_FIELD_CLASS}
                    {...register(`${name}.${index}.fa`)}
                  />
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
