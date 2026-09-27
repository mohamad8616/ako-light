import { describe, expect, it } from "vitest";

import {
  buildZarinPalBaseUrl,
  isPaymentRequestSuccess,
  isVerificationSuccess,
  toZarinPalAmount,
} from "@/lib/payments/zarinpal";

describe("zarinpal payment helpers", () => {
  it("uses the sandbox base URL in sandbox mode", () => {
    expect(buildZarinPalBaseUrl("sandbox")).toBe(
      "https://sandbox.zarinpal.com",
    );
  });

  it("converts EUR amounts to the Rial unit ZarinPal expects", () => {
    expect(toZarinPalAmount(12.5)).toBe(13125000);
  });

  it("recognizes ZarinPal success codes", () => {
    expect(isPaymentRequestSuccess(100)).toBe(true);
    expect(isVerificationSuccess(101)).toBe(true);
    expect(isVerificationSuccess(100)).toBe(true);
    expect(isVerificationSuccess(0)).toBe(false);
  });
});
