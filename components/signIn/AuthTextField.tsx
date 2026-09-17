"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

interface AuthTextFieldProps {
  /** Already-translated visible label; also becomes the input's a11y name. */
  label: string;
  /** Controlled value — the parent owns it (see `useSignInForm.form`). */
  value: string;
  /** Called with the raw string on every keystroke; parent stores it. */
  onChange: (value: string) => void;
  /** Already-translated hint shown while the field is empty. */
  placeholder?: string;
  /** Native input type. Defaults to `"text"`. */
  type?: "text" | "email" | "password" | "tel";
  /** Virtual-keyboard hint on mobile (e.g. `"tel"`, `"numeric"`). */
  inputMode?: "numeric" | "tel" | "text";
  /** Optional HTML validation pattern, e.g. `"[0-9]*"`. */
  pattern?: string;
  /** Hard character cap, e.g. an OTP's digit count. */
  maxLength?: number;
  /**
   * Values like `"email"`, `"current-password"`, `"new-password"`, `"name"`,
   * `"tel"`. Pick the password flavour by flow: browsers offer saved
   * credentials for `current-password` but generate/offer a new one for
   * `new-password`.
   */
  autoComplete?: string;
  /** Extra classes merged over the default input styles via `cn`. */
  className?: string;
}

/**
 * One labelled text input — the building block of both field groups.
 *
 * Usage:
 *
 *   <AuthTextField
 *     type="password"
 *     autoComplete="current-password"
 *     label={t("auth.password.label")}
 *     placeholder={t("auth.password.placeholder")}
 *     value={form.password}
 *     onChange={(value) => onChange("password", value)}
 *   />
 *
 * Why it is written this way:
 *   - `useId()` links `<label htmlFor>` to the input, so clicking the label
 *     focuses the field and screen readers announce the right name. That is
 *     why the component (and therefore every field group) is a client
 *     component — `useId` is a hook.
 *   - It is controlled and stateless: it never calls the auth client, it only
 *     reports the typed string. Validation stays in useSignInForm.ts.
 *   - The label and placeholder arrive already translated (`t(...)`), so the
 *     component carries no i18n keys of its own.
 *   - `className` goes through `cn()` (tailwind-merge), so callers can override
 *     padding/height without fighting specificity — pass e.g. `className="h-12"`
 *     and the default `h-11` drops out.
 *   - There is intentionally no per-field error text: credentials problems are
 *     shown once, in the shared <FeedbackMessage> banner, because better-auth
 *     errors ("wrong password") are not attributable to a single input.
 *
 * Adding a new attribute (e.g. `required`, `aria-describedby`): declare it on
 * AuthTextFieldProps and forward it to the `<input>` below.
 */
export default function AuthTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  pattern,
  maxLength,
  autoComplete,
  className,
}: AuthTextFieldProps) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-foreground block text-sm">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={cn(
          "bg-input text-foreground placeholder:text-muted-foreground border-border h-11 w-full rounded-md border px-3 text-sm",
          className,
        )}
      />
    </div>
  );
}
