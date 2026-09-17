"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  OTP_EXPIRES_IN_SECONDS,
  OTP_LENGTH,
  type FormState,
} from "./types";
import { isOtpComplete, toPersianDigits } from "./phoneFlow";

interface PhoneVerifyStepProps {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  isSendingOtp: boolean;
  isSubmitting: boolean;
  onSendOtp: () => void;
  onEditNumber: () => void;
  onVerify: () => void;
}

/** Countdown hook — starts at OTP_EXPIRES_IN_SECONDS while active. */
function useVerifyCountdown(active: boolean): number {
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!active) return;
    const start = setTimeout(
      () => setCountdown(OTP_EXPIRES_IN_SECONDS),
      0,
    );
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(start);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  return countdown;
}

/**
 * Step 2 of the unified phone flow: the 6-digit code screen.
 *
 * Rendered by PhoneFields only after `otpSent` flips true, fully replacing
 * the entry step (AnimatePresence cross-fade) — the phone input and its Send
 * button unmount, they are not layered above this screen.
 */
export default function PhoneVerifyStep({
  form,
  onChange,
  isSendingOtp,
  isSubmitting,
  onSendOtp,
  onEditNumber,
  onVerify,
}: PhoneVerifyStepProps) {
  const { t } = useLanguage();
  const countdown = useVerifyCountdown(true);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSubmittedRef = useRef(false);

  const focusBox = useCallback((index: number) => {
    otpRefs.current[index]?.focus();
  }, []);

  // Snappy verify: submit as soon as the last box fills. The manual Verify
  // button stays as the fallback path.
  useEffect(() => {
    if (isOtpComplete(form.otp) && !isSubmitting) {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        onVerify();
      }
    } else if (!isOtpComplete(form.otp)) {
      autoSubmittedRef.current = false;
    }
  }, [form.otp, isSubmitting, onVerify]);

  /** Handle digit input in a single OTP box (auto-advance + paste support). */
  const handleOtpChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const digit = e.target.value.replace(/\D/g, "");
      if (!digit) return;
      const current = form.otp.split("");
      if (digit.length > 1) {
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
        if (index < OTP_LENGTH - 1) focusBox(index + 1);
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
    <div className="space-y-3">
      <div className="text-foreground text-sm text-right">
        {t("auth.otp.title")}
      </div>
      <div className="flex justify-center gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              otpRefs.current[i] = el;
            }}
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
          <span className="text-muted-foreground text-xs">{resendLabel}</span>
        )}
      </div>
      <div className="flex justify-center items-center gap-1 text-sm">
        <span className="text-muted-foreground">
          {t("auth.phone.isThisNumber")}
        </span>
        <span className="text-foreground font-medium">{form.phoneNumber}</span>
        <button
          type="button"
          onClick={onEditNumber}
          className="text-primary cursor-pointer font-medium underline-offset-4 hover:underline"
        >
          {t("auth.phone.editNumber")}
        </button>
      </div>
      <Button
        type="button"
        onClick={onVerify}
        disabled={isSubmitting}
        className="h-11 w-full cursor-pointer"
      >
        {isSubmitting ? t("auth.submit.verifying") : t("auth.phone.verifyCode")}
      </Button>
    </div>
  );
}
