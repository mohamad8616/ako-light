import { describe, expect, it } from "vitest";
import { authEn, authFa } from "@/lib/i18n/translations/auth";
import {
  OTP_EXPIRES_IN_SECONDS,
  OTP_LENGTH,
  initialForm,
} from "@/components/signIn/types";
import {
  isGetCodeDisabled,
  isOtpComplete,
  phoneStep,
  toPersianDigits,
} from "@/components/signIn/phoneFlow";

describe("phone auth redesign (parts B–F)", () => {
  it("uses a 6-digit OTP and a 300s countdown matching the server expiresIn", () => {
    expect(OTP_LENGTH).toBe(6);
    // Countdown must equal lib/auth/auth.ts's phoneNumber({ expiresIn: 300 }).
    expect(OTP_EXPIRES_IN_SECONDS).toBe(300);
  });

  it("mounts exactly one step at a time (entry ⇄ verify, never stacked)", () => {
    expect(phoneStep(false)).toBe("entry");
    expect(phoneStep(true)).toBe("verify");
  });

  it("gates Get-code on the terms checkbox", () => {
    expect(isGetCodeDisabled(false, false, false)).toBe(true);
    expect(isGetCodeDisabled(true, false, false)).toBe(false);
    expect(isGetCodeDisabled(true, true, false)).toBe(true);
    expect(isGetCodeDisabled(true, false, true)).toBe(true);
  });

  it("treats a complete 6-digit code as auto-submittable (no extra click)", () => {
    expect(isOtpComplete("123456")).toBe(true);
    expect(isOtpComplete("12345")).toBe(false);
    expect(isOtpComplete("")).toBe(false);
  });

  it("starts the entry step with an empty referral code and empty OTP", () => {
    expect(initialForm.referralCode).toBe("");
    expect(initialForm.otp).toBe("");
  });

  it("formats countdown digits in Persian-Indic numerals", () => {
    expect(toPersianDigits(0)).toBe("۰");
    expect(toPersianDigits(5)).toBe("۵");
    expect(toPersianDigits(300)).toBe("۳۰۰");
  });

  it("declares referral + phone-title keys in both languages", () => {
    for (const key of [
      "auth.title.phone",
      "auth.phone.getCode",
      "auth.referral.toggle",
      "auth.referral.label",
      "auth.referral.placeholder",
    ] as const) {
      expect(authEn[key], `en:${key}`).toBeTruthy();
      expect(authFa[key], `fa:${key}`).toBeTruthy();
      expect(authEn[key]).not.toBe(key);
      expect(authFa[key]).not.toBe(key);
    }
  });
});

