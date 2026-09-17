"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import AuthSegmentedControl, {
  type AuthSegmentedOption,
} from "./AuthSegmentedControl";
import EmailPasswordFields from "./EmailPasswordFields";
import FeedbackMessage from "./FeedbackMessage";
import PhoneFields from "./PhoneFields";
import type { AuthMethod } from "./types";
import { useSignInForm } from "./useSignInForm";

/**
 * The sign-in / create-account card — the only component the route renders.
 *
 * Layout, top to bottom:
 *   1. privacy eyebrow `auth.footer.privacy` + the `title` heading (the heading
 *      follows the selected mode);
 *   2. method toggle — "Email & password" | "Phone number";
 *   3. mode toggle — "Sign in" | "Create account";
 *   4. the field group for that combination (EmailPasswordFields/PhoneFields);
 *   5. <FeedbackMessage> plus the submit button;
 *   6. a footer line that duplicates the mode toggle ("New here? /
 *      Already have an account?") because a text link is the more discoverable
 *      affordance under a form.
 *
 * Usage — from a route (see app/[locale]/sign-in/page.tsx):
 *
 *   <main className="...">
 *     <SignInForm />
 *   </main>
 *
 * Instructions:
 *   - No props. The component is self-contained and takes its state, labels
 *     and validation from {@link useSignInForm}; to reuse it, either import it
 *     as is or build a new card from the hook plus the field components.
 *   - Every user-visible string is `t("auth.*")` from
 *     lib/i18n/translations/auth.ts. English and Persian must both define a
 *     key — tests/unit/i18n/translations.test.ts enforces parity — so add new
 *     copy there, never inline.
 *   - Both toggles are the same `AuthSegmentedControl`, fed different arrays:
 *     adding a method or mode is local (extend the array here and the union in
 *     types.ts, then teach the hook the new flow).
 *   - `cursor-pointer` on the raw `<button>`s is deliberate: Tailwind v4's
 *     preflight resets buttons to `cursor: default`. The shared `<Button>`
 *     already carries it in its base classes.
 *   - No effects belong here — the card is pure render. The usual temptation
 *     ("sync a value into state on mount") is what
 *     react-hooks/set-state-in-effect rejects; put that state in the hook
 *     instead.
 */
export default function SignInForm() {
  const { t } = useLanguage();
  const {
    authMode,
    authMethod,
    form,
    otpSent,
    isSubmitting,
    isSendingOtp,
    error,
    success,
    title,
    submitLabel,
    changeMode,
    changeMethod,
    updateField,
    handleSubmit,
    handleSendOtp,
  } = useSignInForm();

  const methodOptions: AuthSegmentedOption<AuthMethod>[] = [
    { value: "email", label: t("auth.method.email") },
    { value: "phone", label: t("auth.method.phone") },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="border-border bg-background w-full max-w-md rounded-2xl border p-6 shadow-lg shadow-black/10"
    >
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
          {t("auth.footer.privacy")}
        </div>
        <h1 className="text-background-secondary text-3xl font-medium">
          {title}
        </h1>
      </div>

      {/* Method first, then mode: users decide *how* they authenticate before
          whether they are signing in or registering. */}
      <AuthSegmentedControl
        ariaLabel={t("auth.method.groupLabel")}
        options={methodOptions}
        value={authMethod}
        onChange={changeMethod}
        className="mb-4"
      />

      <div className="space-y-4">
        {/* The field group changes the shape of the request, so it is the only
            part that varies by method; feedback and submit stay shared. */}
        {authMethod === "email" ? (
          <EmailPasswordFields
            mode={authMode}
            form={form}
            onChange={updateField}
          />
        ) : (
          <PhoneFields
            mode={authMode}
            form={form}
            onChange={updateField}
            otpSent={otpSent}
            isSendingOtp={isSendingOtp}
            isSubmitting={isSubmitting}
            onSendOtp={handleSendOtp}
          />
        )}

        <FeedbackMessage error={error} success={success} />

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isSendingOtp}
          className="h-11 w-full cursor-pointer"
        >
          {isSubmitting
            ? authMode === "signIn"
              ? t("auth.submit.signingIn")
              : t("auth.submit.creatingAccount")
            : submitLabel}
        </Button>
      </div>

      <div className="text-muted-foreground mt-6 text-center text-sm">
        {/* Secondary affordance for the same switch as the mode toggle above;
            both go through changeMode, so neither can leave stale feedback. */}
        {authMode === "signIn"
          ? t("auth.toggle.help.signIn")
          : t("auth.toggle.help.createAccount")}{" "}
        <button
          type="button"
          onClick={() =>
            changeMode(authMode === "signIn" ? "createAccount" : "signIn")
          }
          className="cursor-pointer font-medium underline-offset-4 hover:underline"
        >
          {authMode === "signIn"
            ? t("auth.toggle.link.signIn")
            : t("auth.toggle.link.createAccount")}
        </button>
      </div>
    </motion.section>
  );
}
