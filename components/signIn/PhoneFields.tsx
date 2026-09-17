"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import { useId } from "react";
import AuthTextField from "./AuthTextField";
import { OTP_LENGTH, type AuthMode, type FormState } from "./types";

interface PhoneFieldsProps {
  /** Current mode — decides between password (sign-in) and OTP (sign-up). */
  mode: AuthMode;
  /** Whole form object; this component renders phone/password/otp. */
  form: FormState;
  /** Field setter from `useSignInForm.updateField(field, value)`. */
  onChange: (field: keyof FormState, value: string) => void;
  /**
   * True once the hook has successfully requested a code. Gates the OTP input
   * and its resend row; the hook clears it whenever the method or mode changes.
   */
  otpSent: boolean;
  /** `phoneNumber.sendOtp` is in flight — disables send/resend. */
  isSendingOtp: boolean;
  /** A sign-in/verify request is in flight — also disables send/resend. */
  isSubmitting: boolean;
  /**
   * Requests a code for `form.phoneNumber`. Owned by the hook
   * (`handleSendOtp`), which validates the number, calls the auth client and
   * sets `otpSent` on success. Same callback for both "Send code" and
   * "Resend code".
   */
  onSendOtp: () => void;
}

/**
 * Credential fields for the "Phone number" method.
 *
 * Which inputs appear (and therefore what the request may contain):
 *
 *   mode          inputs rendered      endpoint (see useSignInForm.ts)
 *   signIn        phone, password      POST /sign-in/phone-number
 *   createAccount phone, OTP + resend  POST /phone-number/verify
 *
 * Why they differ: the sign-in endpoint's schema is
 * `{ phoneNumber, password, rememberMe? }` — it authenticates an existing
 * password account and ignores any code, so asking for an OTP there would be a
 * dead end. The verify endpoint's schema is
 * `{ phoneNumber, code, updatePhoneNumber? }` and has no password parameter,
 * so the code is the only credential to collect.
 *
 * Usage (from SignInForm.tsx — all state lives in the hook):
 *
 *   <PhoneFields
 *     mode={authMode}
 *     form={form}
 *     onChange={updateField}
 *     otpSent={otpSent}
 *     isSendingOtp={isSendingOtp}
 *     isSubmitting={isSubmitting}
 *     onSendOtp={handleSendOtp}
 *   />
 *
 * Sign-up OTP flow:
 *   1. the user types a number and presses "Send code" (this component calls
 *      `onSendOtp`);
 *   2. the hook POSTs to /phone-number/send-otp and sets `otpSent = true`;
 *   3. `otpSent` mounts the animated OTP block below, with a resend link;
 *   4. the user submits the card; the hook requires a non-empty code and POSTs
 *      to /phone-number/verify.
 *   The "code sent" confirmation appears in <FeedbackMessage>, not here, so
 *   there is a single feedback channel.
 *
 * Instructions / gotchas:
 *   - Both the "Send code" button and the OTP block are gated on
 *     `!isSignIn`, so flipping to sign-in never leaves a code step dangling.
 *   - The number is trimmed and sent as typed; better-auth compares the string
 *     exactly, so keep the placeholder format (E.164, e.g. `+98912...`)
 *     consistent with what was verified.
 *   - Send/resend is disabled while `isSendingOtp || isSubmitting`: OTP
 *     requests are rate-limited server-side (3 verification attempts, see
 *     lib/auth/auth.ts) and double-sends would invalidate a code in flight.
 *   - `min-w-30` stops the button from resizing when its label swaps to
 *     "Sending code...".
 *   - The OTP input strips non-digits and slices to `OTP_LENGTH` on change
 *     (paste/copy included) in addition to `maxLength`/`pattern`, matching the
 *     server's `otpLength`.
 *   - Server prerequisites (lib/auth/auth.ts): the `sendOTP` hook is configured
 *     (dev prints `[DEV OTP] <phone>: <code>` via lib/auth/sms.ts). Creating a
 *     NEW account by phone additionally needs `signUpOnVerification` on the
 *     phoneNumber plugin — without it /phone-number/verify has no user to
 *     update and fails. Signing in by phone requires that phone to already be
 *     attached to a password account.
 *   - `useId()` supplies the label ids, so keep the label/input pairs together
 *     when moving fields around (same reason this file is a client component).
 */
export default function PhoneFields({
  mode,
  form,
  onChange,
  otpSent,
  isSendingOtp,
  isSubmitting,
  onSendOtp,
}: PhoneFieldsProps) {
  const { t } = useLanguage();
  const phoneId = useId();
  const otpId = useId();
  const isSignIn = mode === "signIn";

  return (
    <>
      <div className="space-y-2">
        <label htmlFor={phoneId} className="text-foreground block text-sm">
          {t("auth.phone.label")}
        </label>
        <div className="flex gap-2">
          <input
            id={phoneId}
            type="tel"
            autoComplete="tel"
            value={form.phoneNumber}
            onChange={(event) => onChange("phoneNumber", event.target.value)}
            placeholder={t("auth.phone.placeholder")}
            className="bg-input text-foreground placeholder:text-muted-foreground border-border h-11 flex-1 rounded-md border px-3 text-sm"
          />
          {!isSignIn && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendOtp}
              disabled={isSendingOtp || isSubmitting}
              className="min-w-30 cursor-pointer"
            >
              {isSendingOtp
                ? t("auth.submit.sendingCode")
                : t("auth.phone.sendCode")}
            </Button>
          )}
        </div>
      </div>

      {isSignIn && (
        <AuthTextField
          type="password"
          autoComplete="current-password"
          label={t("auth.password.label")}
          placeholder={t("auth.password.placeholder")}
          value={form.password}
          onChange={(value) => onChange("password", value)}
        />
      )}

      {!isSignIn && otpSent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 overflow-hidden"
        >
          <label htmlFor={otpId} className="text-foreground block text-sm">
            {t("auth.phone.otpLabel")}
          </label>
          <input
            id={otpId}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={OTP_LENGTH}
            autoComplete="one-time-code"
            value={form.otp}
            onChange={(event) =>
              onChange(
                "otp",
                event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH),
              )
            }
            placeholder={t("auth.phone.otpPlaceholder")}
            className="bg-input text-foreground placeholder:text-muted-foreground border-border h-11 w-full rounded-md border px-3 text-sm"
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={onSendOtp}
              className="text-muted-foreground cursor-pointer text-xs underline-offset-4 hover:underline"
            >
              {t("auth.phone.resendCode")}
            </button>
            <span className="text-muted-foreground text-xs">
              {OTP_LENGTH}-digit code
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
}
