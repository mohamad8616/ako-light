"use client";

import { cn } from "@/lib/utils";

/** One selectable chip: the value passed to `onChange` plus its label. */
export interface AuthSegmentedOption<T extends string> {
  /** Value handed back to `onChange` when this chip is clicked. */
  value: T;
  /** Already-translated text shown on the chip. */
  label: string;
}

interface AuthSegmentedControlProps<T extends string> {
  /**
   * The chips to render, in display order. Two options is the intended shape,
   * but any number works — `flex-1` splits the row evenly.
   */
  options: readonly AuthSegmentedOption<T>[];
  /** Currently selected value; one option must match it. */
  value: T;
  /** Called with the clicked option's `value` (including the active one). */
  onChange: (value: T) => void;
  /** Accessible name for the button group, e.g. "Sign-in method". */
  ariaLabel: string;
  /** Extra classes merged onto the track (e.g. spacing: `mb-6`). */
  className?: string;
}

/**
 * Controlled two-or-more option toggle — the "Email & password / Phone number"
 * and "Sign in / Create account" switches in the sign-in card.
 *
 * Usage (options are cheap to build on each render):
 *
 *   <AuthSegmentedControl
 *     ariaLabel={t("auth.method.groupLabel")}
 *     options={[
 *       { value: "email", label: t("auth.method.email") },
 *       { value: "phone", label: t("auth.method.phone") },
 *     ]}
 *     value={authMethod}
 *     onChange={changeMethod}
 *     className="mb-4"
 *   />
 *
 * Invisible behaviour worth preserving:
 *   - Every option is a real `<button type="button">`, so it is focusable,
 *     keyboard-operable and announced by screen readers.
 *   - Selection is exposed with `aria-pressed` and the group is named by
 *     `ariaLabel` (`role="group"`), which is why both texts must be passed in
 *     already translated rather than as raw keys.
 *   - `cursor-pointer` is set explicitly: Tailwind v4's preflight resets
 *     buttons to `cursor: default`.
 *   - It is fully controlled (no internal state) — the parent decides what
 *     "selected" means, which is what lets one component serve both toggles.
 *
 * Do not "simplify" this back into a single button that renders only the
 * current value and re-selects it: that variant looks identical but can never
 * switch, because the inactive option is not on screen to click.
 */
export default function AuthSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: AuthSegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "border-border bg-muted/30 flex gap-2 rounded-xl border p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-background text-background-secondary shadow-sm"
                : "text-muted hover:text-background-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
