"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  initialForm,
  type AuthMethod,
  type AuthMode,
  type FormState,
} from "./types";

/**
 * The auth proxy (proxy.ts) appends `?redirectTo=<path>` to the sign-in URL
 * when it bounces an unauthenticated request away from a protected page, e.g.
 * `/sign-in?redirectTo=%2Fadmin%2Fproducts%3Fpage%3D2`.
 *
 * Read lazily, at submit time (inside a click handler), instead of mirroring it
 * into state from an effect: `setState` inside an effect body triggers
 * cascading renders (react-hooks/set-state-in-effect) and the value is never
 * needed during render. Only same-origin paths are honoured (`/...` but not
 * `//...`) so a crafted `?redirectTo=https://evil.example` cannot turn this
 * page into an open redirect.
 *
 * Instructions:
 *   - Do not "fix" this by moving the value into `useState` + `useEffect`.
 *     That reintroduces the lint error and an extra render pass, and the value
 *     would still only be consumed in the same handler.
 *   - If the destination is ever needed *while rendering*, reach for
 *     `useSearchParams()` from next/navigation and wrap the consumer in
 *     <Suspense> — note that this route is prerendered, so a
 *     `useSearchParams` call would make the whole card client-rendered.
 *   - Keep the allowlist as tight as this: a leading `/` that is not `//`.
 *     Widening it to accept absolute URLs hands an attacker an open redirect.
 */
function readRedirectTo(): string | null {
  const redirectTo = new URLSearchParams(window.location.search).get(
    "redirectTo",
  );

  if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return null;
}

/**
 * The sign-in state machine: selection, form values, validation, the
 * better-auth calls and the translated labels — everything the card needs.
 * `SignInForm.tsx` renders what this returns and nothing else holds state.
 *
 * Request matrix (each row is one click of the submit button):
 *
 *   mode \ method   email                        phone
 *   signIn          POST /sign-in/email          POST /sign-in/phone-number
 *                   { email, password,           { phoneNumber, password,
 *                     rememberMe }                 rememberMe }
 *   createAccount   POST /sign-up/email          POST /phone-number/verify
 *                   { email, password, name }    { phoneNumber, code }
 *
 * The rendered inputs mirror those bodies exactly (see EmailPasswordFields /
 * PhoneFields): a field is only shown when the request on that row consumes it.
 * That is what fixed phone sign-in, which used to collect an OTP and then send
 * an empty password.
 *
 * Server error codes are mapped to one translated sentence each:
 *
 *   INVALID_EMAIL_OR_PASSWORD        -> auth.errors.wrongPassword
 *   INVALID_PHONE_NUMBER_OR_PASSWORD -> auth.errors.wrongPassword
 *   USER_NOT_FOUND                   -> auth.errors.unknownAccount
 *   USER_ALREADY_EXISTS              -> auth.errors.unknownAccount
 *   PHONE_NUMBER_NOT_VERIFIED        -> auth.errors.invalidOtp
 *   INVALID_OTP                      -> auth.errors.invalidOtp
 *   TOO_MANY_ATTEMPTS                -> auth.errors.tooManyAttempts
 *   anything else                    -> the server's own message, or
 *                                       auth.errors.generic
 *
 * Returned API (consumed by SignInForm.tsx):
 *
 *   authMode / authMethod   current selection — feed the two toggles
 *   form                    controlled values — feed the field components
   *   otpSent                 show the OTP section (both modes, after code requested)
 *   isSubmitting            submit in flight — disable submit + send/resend
 *   isSendingOtp            sendOtp in flight — disable send/resend
 *   error / success         translated feedback for <FeedbackMessage>
 *   title / submitLabel     translated heading and button label
 *   changeMode / changeMethod  toggle handlers (also reset feedback + OTP)
 *   updateField             `(field, value)` for every input's onChange
 *   handleSubmit            the card's submit button
   *   handleSendOtp         "Send code" / "Resend code"
   *   onEditNumber          clear OTP and hide code section (phone entry)
 *
 * Instructions:
 *   - Keep the auth calls here, not in the field components: the client only
 *     needs one owner for `isSubmitting`, feedback and post-auth navigation.
 *   - After a successful call, `goToAfterAuth()` pushes `redirectTo` (when the
 *     proxy supplied a safe one) or `/`. Success feedback is set first, so it
 *     is visible even if navigation is slow.
 *   - `updateField` clears only `error` on typing (leaving a "code sent"
 *     success in place), while `changeMode` / `changeMethod` clear both and
 *     drop `otpSent` — a code requested for the previous choice must not
 *     linger.
   *   - Validation is deliberately minimal (non-empty number / code):
 *     formats and lengths are the server's business and its messages are
 *     surfaced verbatim when they have no dedicated mapping.
 *   - Anything async is wrapped in try/catch/finally so a thrown rejection
 *     still clears the spinner flags.
 *
 * Adding a third method (e.g. username):
 *   1. widen `AuthMethod` in types.ts and the fields of `FormState`;
 *   2. add the inputs to a new field component next to EmailPasswordFields;
 *   3. add a `handle<Method>Submit` here, a branch in `handleSubmit`, and an
 *      option in SignInForm's method segmented control.
 */
export function useSignInForm() {
  const { t } = useLanguage();
  const router = useRouter();

  // Selection: mode starts at "sign in", method at "email". Both toggles go
  // through changeMode/changeMethod below so feedback and any pending OTP are
  // cleared on every switch.
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  // All input values; per-field ownership is documented on FormState.
  const [form, setForm] = useState<FormState>(initialForm);
  // True while a code is waiting to be typed (phone sign-up only); reset by
  // changeMode/changeMethod.
  const [otpSent, setOtpSent] = useState(false);
  // Request flags: they drive the spinner labels and disable the buttons that
  // would otherwise fire a second request while the first is still in flight.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  // Feedback rendered by <FeedbackMessage>; error wins if both are ever set.
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  /** Post-auth navigation: the proxy's `redirectTo` when it is a safe local
   *  path, otherwise the home page (see {@link readRedirectTo}). */
  const goToAfterAuth = () => {
    router.push(readRedirectTo() ?? "/");
  };

  /** Drops both feedback strings — used before every new attempt. */
  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };

  /**
   * Single setter for every input (`onChange("email", value)`). Clears a stale
   * error as soon as the user edits anything; a success (e.g. "code sent")
   * stays until the next attempt so it does not flicker away while typing.
   */
  const updateField = (field: keyof FormState, value: string) => {
    setForm((cur) => ({ ...cur, [field]: value }));
    if (error) setError("");
  };

  /** Switching either toggle clears the previous attempt's feedback/OTP. */
  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    resetFeedback();
    setOtpSent(false);
  };

  /** Email/phone toggle. Same reset as {@link changeMode} — see above. */
  const changeMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    resetFeedback();
    setOtpSent(false);
  };

  /**
   * Requests an SMS code for the typed number
   * (`POST /phone-number/send-otp`). Wired to both "Send code" and
   * "Resend code"; on success `otpSent` reveals the OTP input and the
   * confirmation appears in <FeedbackMessage>. Failures (missing or invalid
   * number, provider error) land in `error`.
   */
  const handleSendOtp = async () => {
    const phone = form.phoneNumber.trim();
    if (!phone) {
      setError(t("auth.errors.phoneRequired"));
      return;
    }

    resetFeedback();
    setIsSendingOtp(true);

    try {
      await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
      setOtpSent(true);
      setSuccess(t("auth.phone.codeSent"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.errors.generic");
      setError(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  /**
   * Email flows: `POST /sign-in/email` or `POST /sign-up/email`, chosen by
   * `authMode`. An empty password is rejected before the network call so the
   * user reads "enter your password" rather than a generic server error;
   * sign-up falls back to the email address when no name was typed, because
   * the endpoint requires a non-empty `name`.
   */
  const handleEmailSubmit = async () => {
    if (!form.password) {
      setError(t("auth.errors.passwordRequired"));
      return;
    }

    resetFeedback();
    setIsSubmitting(true);

    try {
      if (authMode === "signIn") {
        const result = await authClient.signIn.email({
          email: form.email,
          password: form.password,
          rememberMe: true,
        });

        if (result?.error) {
          const code = result.error?.code ?? "";
          if (code === "INVALID_EMAIL_OR_PASSWORD") {
            setError(t("auth.errors.wrongPassword"));
          } else if (code === "USER_NOT_FOUND") {
            setError(t("auth.errors.unknownAccount"));
          } else {
            setError(result.error.message || t("auth.errors.generic"));
          }
          return;
        }

        setSuccess(t("auth.success.email.signIn"));
        goToAfterAuth();
        return;
      }

      const result = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: form.name.trim() || form.email,
      });

      if (result?.error) {
        const code = result.error?.code ?? "";
        if (code === "USER_ALREADY_EXISTS") {
          setError(t("auth.errors.unknownAccount"));
        } else {
          setError(result.error.message || t("auth.errors.generic"));
        }
        return;
      }

      setSuccess(t("auth.success.email.signUp"));
      goToAfterAuth();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.errors.generic");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Phone flows use the same verify endpoint for both modes:
   *
   *   signIn        POST /phone-number/verify  { phoneNumber, code }
   *   createAccount POST /phone-number/verify  { phoneNumber, code }
   *
   * The code is sent via `handleSendOtp` (triggered by the "Send code"
   * button in PhoneFields) before submitting. The success message
   * differs by mode.
   */
  const handlePhoneSubmit = async () => {
    const phone = form.phoneNumber.trim();
    if (!phone) {
      setError(t("auth.errors.phoneRequired"));
      return;
    }

    if (!form.otp.trim()) {
      setError(t("auth.errors.otpRequired"));
      return;
    }

    resetFeedback();
    setIsSubmitting(true);

    try {
      const verify = await authClient.phoneNumber.verify({
        phoneNumber: phone,
        code: form.otp,
      });

      if (verify?.error) {
        const code = verify.error?.code ?? "";
        if (code === "INVALID_OTP") {
          setError(t("auth.errors.invalidOtp"));
        } else if (code === "TOO_MANY_ATTEMPTS") {
          setError(t("auth.errors.tooManyAttempts"));
        } else {
          setError(verify.error.message || t("auth.errors.generic"));
        }
        return;
      }

      setSuccess(
        authMode === "signIn"
          ? t("auth.success.phone.signIn")
          : t("auth.success.phone.signUp"),
      );
      goToAfterAuth();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.errors.generic");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Clears the OTP and hides the code section so the user can edit their number. */
  const handleEditNumber = useCallback(() => {
    setOtpSent(false);
    setForm((cur) => ({ ...cur, otp: "" }));
  }, []);

  /**
   * Submit-button entry point. Kept as a thin dispatcher on `authMethod` so
   * the card's onClick is stable across all four flows — the mode-specific
   * branching lives in the handlers above.
   */
  const handleSubmit = async () => {
    if (authMethod === "email") {
      await handleEmailSubmit();
      return;
    }
    await handlePhoneSubmit();
  };

  // The card's whole surface. Adding a key here is the only step needed to
  // hand a new capability to SignInForm.tsx (and on to the field components
  // through props) — see the API table in the doc comment above.
  return {
    authMode,
    authMethod,
    form,
    otpSent,
    isSubmitting,
    isSendingOtp,
    error,
    success,
    title:
      authMode === "signIn"
        ? t("auth.title.signIn")
        : t("auth.title.createAccount"),
    submitLabel:
      authMode === "signIn"
        ? t("auth.submit.signIn")
        : t("auth.submit.createAccount"),
    changeMode,
    changeMethod,
    updateField,
    handleSubmit,
    handleSendOtp,
    onEditNumber: handleEditNumber,
  };
}
