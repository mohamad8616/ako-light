"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import AuthTextField from "./AuthTextField";
import type { AuthMode, FormState } from "./types";

interface EmailPasswordFieldsProps {
  /** Current mode — decides whether the name field is rendered. */
  mode: AuthMode;
  /** Whole form object; this component renders only email/name/password. */
  form: FormState;
  /**
   * Field setter from `useSignInForm.updateField(field, value)`. Passing the
   * field name (rather than one callback per input) keeps the signature stable
   * when `FormState` grows.
   */
  onChange: (field: keyof FormState, value: string) => void;
}

/**
 * Credential fields for the "Email & password" method.
 *
 * Which inputs appear (and therefore what the request may contain):
 *
 *   mode          inputs rendered          endpoint
 *   signIn        email, password          POST /sign-in/email
 *   createAccount name, email, password    POST /sign-up/email
 *
 * Usage (from SignInForm.tsx — the state lives in the hook, not here):
 *
 *   <EmailPasswordFields
 *     mode={authMode}
 *     form={form}
 *     onChange={updateField}
 *   />
 *
 * Instructions:
 *   - The name field is hidden in sign-in mode on purpose: `/sign-in/email`
 *     has no `name` parameter, and showing it invites users to think they can
 *     rename themselves while logging in. `useSignInForm` also falls back to
 *     the email when signing up with an empty name.
 *   - `autoComplete` is set per flow (`new-password` vs `current-password`) so
 *     password managers offer "save" while registering and "fill" while
 *     signing in. Keep that distinction if you reshuffle the fields.
 *   - `onChange` takes a field name — never lift this state locally. If you add
 *     an input here, add its key to `FormState` first (see types.ts), then
 *     `onChange("yourField", value)` needs no other wiring.
 *   - Purely presentational: no validation, no auth calls, so the same markup
 *     can be reused by another card as long as the props line up.
 */
export default function EmailPasswordFields({
  mode,
  form,
  onChange,
}: EmailPasswordFieldsProps) {
  const { t } = useLanguage();
  const isSignIn = mode === "signIn";

  return (
    <>
      {!isSignIn && (
        <AuthTextField
          autoComplete="name"
          label={t("auth.name.label")}
          placeholder={t("auth.name.placeholder")}
          value={form.name}
          onChange={(value) => onChange("name", value)}
        />
      )}

      <AuthTextField
        type="email"
        autoComplete="email"
        label={t("auth.email.label")}
        placeholder={t("auth.email.placeholder")}
        value={form.email}
        onChange={(value) => onChange("email", value)}
      />

      <AuthTextField
        type="password"
        autoComplete={isSignIn ? "current-password" : "new-password"}
        label={t("auth.password.label")}
        placeholder={t("auth.password.placeholder")}
        value={form.password}
        onChange={(value) => onChange("password", value)}
      />
    </>
  );
}
