/**
 * Iranian mobile normalisation (lib/sms/normalize-mobile.ts).
 *
 * Shared by the OTP Verify sender and the order-receipt bulk sender. sms.ir
 * rejects a number that still carries the trunk prefix, and a wrong value here
 * fails silently at the gateway, so the accepted shapes are pinned.
 */
import { describe, expect, it } from "vitest";
import { normalizeIranianMobile } from "@/lib/sms/normalize-mobile";

describe("normalizeIranianMobile", () => {
  it("drops the trunk zero from an 11-digit national number", () => {
    expect(normalizeIranianMobile("09191234567")).toBe("9191234567");
  });

  it("strips the country code and the plus sign", () => {
    expect(normalizeIranianMobile("+989191234567")).toBe("9191234567");
  });

  it("strips the international access prefix (0098…)", () => {
    expect(normalizeIranianMobile("00989191234567")).toBe("9191234567");
  });

  it("passes a bare 10-digit number through unchanged", () => {
    expect(normalizeIranianMobile("9191234567")).toBe("9191234567");
  });

  it("does NOT mistake a 10-digit national number for a country code", () => {
    // A 10-digit number that happens to begin with 98 is a national number,
    // not 98 + a national number — the country-code branch is length-gated.
    expect(normalizeIranianMobile("9812345678")).toBe("9812345678");
  });

  it("always returns 10 digits for a valid Iranian mobile in any input form", () => {
    for (const input of [
      "09191234567",
      "+989191234567",
      "00989191234567",
      "9191234567",
      "0919 123 4567",
    ]) {
      expect(normalizeIranianMobile(input), input).toHaveLength(10);
    }
  });

  it("ignores separators and whitespace", () => {
    expect(normalizeIranianMobile("0919 123 4567")).toBe("9191234567");
    expect(normalizeIranianMobile("0919-123-4567")).toBe("9191234567");
  });

  it("never emits a leading zero or a plus", () => {
    for (const input of ["09191234567", "+989191234567", "9191234567"]) {
      const out = normalizeIranianMobile(input);
      expect(out.startsWith("0")).toBe(false);
      expect(out).not.toContain("+");
    }
  });
});
