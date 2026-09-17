"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { OTP_LENGTH, type AuthMode, type FormState } from "./types";

interface PhoneFieldsProps {
  /** Current mode — decides the submit behavior in the parent hook. */
  mode: AuthMode;
  /** Whole form object; this component renders phone + OTP + terms. */
  form: FormState;
  /** Field setter from `useSignInForm.updateField(field, value)`. */
  onChange: (field: keyof FormState, value: string) => void;
  /**
   * True once the hook has successfully requested a code. Gates the OTP
   * section; the hook clears it whenever the method or mode changes.
   */
  otpSent: boolean;
  /** `phoneNumber.sendOtp` is in flight — disables send/resend. */
  isSendingOtp: boolean;
  /** A verify request is in flight — also disables send/resend. */
  isSubmitting: boolean;
  /**
   * Requests a code for `form.phoneNumber`. Owned by the hook
   * (`handleSendOtp`), which validates the number, calls the auth client and
   * sets `otpSent` on success. Same callback for both "Send code" and
   * "Resend code".
   */
  onSendOtp: () => void;
  /**
   * Clears the OTP and hides the code section so the user can edit their
   * number (owned by `handleEditNumber` in the hook).
   */
  onEditNumber: () => void;
}

/** Convert a number to Persian-Indic digits for the countdown display. */
function toPersianDigits(n: number): string {
  return n
    .toString()
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
}

/**
 * Credential fields for the "Phone number" method.
 *
 * Which inputs appear (and therefore what the request may contain):
 *
 *   state                  inputs rendered
 *   !otpSent               phone number + "Send code" button (both modes)
 *   otpSent && phoneNumber  6-digit code boxes + resend countdown + terms + edit number
 *
 * Both sign-in and create-account use `POST /phone-number/verify`
 * `{ phoneNumber, code }` — the code is requested via "Send code"
 * and verified on submit. The success message differs by mode.
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
 *     onEditNumber={handleEditNumber}
 *   />
 *
 * Phone flow (both modes):
 *   1. the user types a number and presses "Send code";
 *   2. the hook POSTs to /phone-number/send-otp and sets `otpSent = true`;
 *   3. the 6-digit code boxes appear with a resend countdown;
 *   4. the user fills the code and submits the card; the hook POSTs
 *      to /phone-number/verify.
 *
 * Instructions / gotchas:
 *   - `otpSent` gates the entire OTP section; it is reset by
 *     `changeMode`/`changeMethod` so no stale code section lingers.
 *   - The number is trimmed and sent as typed; better-auth compares the
 *     string exactly, so keep the placeholder format (E.164, e.g.
 *     `+98912...`) consistent with what was verified.
 *   - Send/resend is disabled while `isSendingOtp || isSubmitting || countdown > 0`.
 *   - Each digit box auto-advances on input, backspace returns to the
 *     previous box, arrow keys move between boxes, and paste fills all
 *     boxes from the clipboard.
 *   - The countdown timer starts at 60 seconds when `otpSent` becomes
 *     true and resets when `otpSent` becomes false.
 *   - `useId()` supplies the label ids, so keep the label/input pairs
 *     together when moving fields around (same reason this file is a
 *     client component).
 */
export default function PhoneFields({
  form,
  onChange,
  otpSent,
  isSendingOtp,
  isSubmitting,
  onSendOtp,
  onEditNumber,
}: PhoneFieldsProps) {
  const { t } = useLanguage();
  const phoneId = useId();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer — interval lives here; the first tick to 60 is
  // deferred via setTimeout so no setState lands synchronously in
  // the effect body. Cleared on unmount or when otpSent flips.
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!otpSent) return;
    setTimeout(() => setCountdown(60), 0);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [otpSent]);

  const focusBox = useCallback((index: number) => {
    otpRefs.current[index]?.focus();
  }, []);

  /** Handle digit input in a single OTP box (auto-advance + paste support). */
  const handleOtpChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const digit = e.target.value.replace(/\D/g, "");
      if (!digit) return;

      const current = form.otp.split("");

      if (digit.length > 1) {
        // Paste — distribute multiple digits across boxes.
        const digits = digit.slice(0, OTP_LENGTH - index);
        for (let i = 0; i < digits.length; i++) {
          current[index + i] = digits[i];
        }
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        onChange("otp", current.slice(0, OTP_LENGTH).join(""));
        focusBox(nextIndex);
      } else {
        current[index] = digit[0];
        onChange("otp", current.slice(0, OTP_LENGTH).join(""));
        if (index < OTP_LENGTH - 1) {
          focusBox(index + 1);
        }
      }
    },
    [form.otp, onChange, focusBox],
  );

  /** Handle keyboard interactions in a single OTP box (backspace, arrows). */
  const handleOtpKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const current = form.otp.split("");
        if (current[index]) {
          current[index] = "";
          onChange("otp", current.join(""));
        } else if (index > 0) {
          current[index - 1] = "";
          onChange("otp", current.join(""));
          focusBox(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusBox(index - 1);
      } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        focusBox(index + 1);
      }
    },
    [form.otp, onChange, focusBox],
  );

  /** Handle paste event on any OTP box (fill all boxes at once). */
  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
      if (pasted.length > 0) {
        onChange("otp", pasted.padEnd(OTP_LENGTH, ""));
        focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
      }
    },
    [onChange, focusBox],
  );

  const resendLabel =
    countdown > 0
      ? t("auth.otp.resendIn").replace(
          "{time}",
          `(${toPersianDigits(Math.floor(countdown / 60))}:${toPersianDigits(countdown % 60)})`,
        )
      : t("auth.phone.resendCode");

  return (
    <>
      {/* Phone number entry */}
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
          {!otpSent && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendOtp}
              disabled={isSendingOtp || isSubmitting}
              className="min-w-30 cursor-pointer"
            >
              {isSendingOtp ? t("auth.submit.sendingCode") : t("auth.phone.sendCode")}
            </Button>
          )}
        </div>
      </div>

      {/* OTP section — visible for both modes once code is sent */}
      <AnimatePresence>
        {otpSent && form.phoneNumber.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Title */}
            <div className="text-foreground text-sm text-right">
              {t("auth.otp.title")}
            </div>

            {/* 6-digit code boxes */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  value={form.otp[i] || ""}
                  onChange={handleOtpChange(i)}
                  onKeyDown={handleOtpKeyDown(i)}
                  onPaste={handleOtpPaste}
                  placeholder="-"
                  className={cn(
                    "bg-input text-foreground placeholder:text-muted-foreground",
                    "border-border h-12 w-12 text-center text-lg rounded-xl border",
                    "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
                  )}
                />
              ))}
            </div>

            {/* Resend + countdown */}
            <div className="flex justify-center items-center gap-2">
              <button
                type="button"
                onClick={onSendOtp}
                disabled={isSendingOtp || countdown > 0 || isSubmitting}
                className="text-muted-foreground cursor-pointer text-xs underline-offset-4 hover:underline"
              >
                {t("auth.phone.resendCode")}
              </button>
              {countdown > 0 && (
                <span className="text-muted-foreground text-xs">
                  {resendLabel}
                </span>
              )}
            </div>

            {/* Phone number confirmation */}
            <div className="flex justify-center items-center gap-1 text-sm">
              <span className="text-muted-foreground">
                {t("auth.phone.isThisNumber")}
              </span>
              <span className="text-foreground font-medium">
                {form.phoneNumber}
              </span>
              <button
                type="button"
                onClick={onEditNumber}
                className="text-primary cursor-pointer font-medium underline-offset-4 hover:underline"
              >
                {t("auth.phone.editNumber")}
              </button>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-muted-foreground text-sm">
                {t("auth.terms.label")}
              </span>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
