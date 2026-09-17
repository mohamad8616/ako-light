"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { isGetCodeDisabled } from "./phoneFlow";
import type { FormState } from "./types";

interface PhoneEntryStepProps {
  /** Whole form object; this step renders phoneNumber + referralCode. */
  form: FormState;
  /** Field setter from `useSignInForm.updateField(field, value)`. */
  onChange: (field: keyof FormState, value: string) => void;
  /** Whether the terms checkbox is checked (owned by the hook). */
  termsAccepted: boolean;
  /** Setter for the terms checkbox (owned by the hook). */
  onTermsChange: (accepted: boolean) => void;
  /** `phoneNumber.sendOtp` is in flight — disables the send button. */
  isSendingOtp: boolean;
  /** A verify request is in flight — also disables the send button. */
  isSubmitting: boolean;
  /**
   * Requests a code for `form.phoneNumber`. Owned by the hook
   * (`handleSendOtp`), which validates the number, calls the auth client and
   * sets `otpSent` on success.
   */
  onSendOtp: () => void;
}

/**
 * Step 1 of the unified phone flow: number entry, terms, referral, send.
 *
 * Rendered by PhoneFields only while `otpSent` is false; once the code is
 * requested the parent unmounts this step entirely (AnimatePresence
 * cross-fade) and mounts PhoneVerifyStep instead — the two never coexist.
 *
 * Usage (from PhoneFields.tsx — all state lives in the hook):
 *
 *   <PhoneEntryStep
 *     form={form}
 *     onChange={updateField}
 *     termsAccepted={termsAccepted}
 *     onTermsChange={setTermsAccepted}
 *     isSendingOtp={isSendingOtp}
 *     isSubmitting={isSubmitting}
 *     onSendOtp={handleSendOtp}
 *   />
 *
 * Instructions / gotchas:
 *   - The "Get code"/Send button stays disabled until the terms checkbox is
 *     checked — that is the fix for the previously decorative checkbox.
 *   - The referral toggle reveals a plain optional text input. No validation
 *     or redemption: the typed value travels in `form.referralCode` and is
 *     forwarded as `referredByCode` on the sign-up path only.
 *   - Purely presentational: no auth calls, no timers.
 */
export default function PhoneEntryStep({
  form,
  onChange,
  termsAccepted,
  onTermsChange,
  isSendingOtp,
  isSubmitting,
  onSendOtp,
}: PhoneEntryStepProps) {
  const { t } = useLanguage();
  const phoneId = useId();
  const referralId = useId();
  const [referralOpen, setReferralOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Phone number entry */}
      <div className="space-y-2">
        <label htmlFor={phoneId} className="text-foreground block text-sm">
          {t("auth.phone.label")}
        </label>
        <input
          id={phoneId}
          type="tel"
          autoComplete="tel"
          value={form.phoneNumber}
          onChange={(event) => onChange("phoneNumber", event.target.value)}
          placeholder={t("auth.phone.placeholder")}
          className="bg-input text-foreground placeholder:text-muted-foreground border-border h-11 w-full rounded-md border px-3 text-sm"
        />
      </div>

      {/* Terms checkbox — gates the send button (functional, not decorative). */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="accent-primary h-4 w-4"
        />
        <span className="text-muted-foreground text-sm">
          {t("auth.terms.label")}
        </span>
      </label>

      {/* Optional referral code — collapsible, no validation. */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setReferralOpen((open) => !open)}
          aria-expanded={referralOpen}
          className="text-primary cursor-pointer text-sm underline-offset-4 hover:underline"
        >
          {t("auth.referral.toggle")}
        </button>
        {referralOpen && (
          <div className="space-y-2">
            <label
              htmlFor={referralId}
              className="text-background-secondary block text-sm"
            >
              {t("auth.referral.label")}
            </label>
            <input
              id={referralId}
              type="text"
              autoComplete="off"
              value={form.referralCode}
              onChange={(event) =>
                onChange("referralCode", event.target.value)
              }
              placeholder={t("auth.referral.placeholder")}
              className="bg-input text-foreground placeholder:text-muted-foreground border-border h-11 w-full rounded-md border px-3 text-sm"
            />
          </div>
        )}
      </div>

      {/* Get code — disabled until terms are accepted (see isGetCodeDisabled). */}
      <Button
        type="button"
        variant="outline"
        onClick={onSendOtp}
        disabled={isGetCodeDisabled(termsAccepted, isSendingOtp, isSubmitting)}
        className="h-11 w-full cursor-pointer text-background-secondary"
      >
        {isSendingOtp ? t("auth.submit.sendingCode") : t("auth.phone.getCode")}
      </Button>
    </div>
  );
}
