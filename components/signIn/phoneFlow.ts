/**
 * Pure phone-flow predicates — no React, no imports.
 *
 * Kept alongside types.ts (rather than inside the step components) so the
 * node-only unit tier can cover the gating/transition rules without a
 * renderer: PhoneEntryStep/PhoneFields/PhoneVerifyStep all call these.
 */

import { OTP_LENGTH } from "./types";

/** Which phone step is mounted — exactly one at a time, never stacked. */
export type PhoneStep = "entry" | "verify";

/** `otpSent` selects the mounted step (entry ⇄ verify cross-fade). */
export function phoneStep(otpSent: boolean): PhoneStep {
  return otpSent ? "verify" : "entry";
}

/**
 * Get-code/Send-button gate: disabled until the terms checkbox is checked,
 * and while any request is in flight. This is the fix for the previously
 * decorative checkbox.
 */
export function isGetCodeDisabled(
  termsAccepted: boolean,
  isSendingOtp: boolean,
  isSubmitting: boolean,
): boolean {
  return !termsAccepted || isSendingOtp || isSubmitting;
}

/** True once every OTP box is filled — the auto-submit trigger. */
export function isOtpComplete(otp: string): boolean {
  return otp.length === OTP_LENGTH;
}

/** Convert a number to Persian-Indic digits for the countdown display. */
export function toPersianDigits(n: number): string {
  return n.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
}
