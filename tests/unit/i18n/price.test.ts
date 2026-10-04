import { describe, expect, it } from "vitest";
import {
  formatEur,
  formatProductPrice,
  formatRial,
  formatToman,
  RIAL_PER_TOMAN,
  tomanToRial,
} from "@/lib/i18n/price";

/**
 * Price display rule: a price is shown in exactly one currency — EUR for `en`,
 * Toman for `fa` — and the Persian figure is the RAW `priceToman` value labelled
 * "تومان". The x10 Toman-to-Rial conversion happens only at the payment
 * boundary (lib/payments/zarinpal.ts) and must not leak into the display path.
 */
describe("price display", () => {
  const prices = { priceEur: 1100, priceToman: 45_000_000 };

  it("shows the EUR price for en, and never the Toman one", () => {
    const en = formatProductPrice(prices, "en");
    expect(en).toContain("€");
    expect(en).not.toContain("تومان");
    // The Toman figure must not leak into the English rendering.
    expect(en).not.toContain("45,000,000");
  });

  it("shows the raw Toman price for fa, unconverted, and never the EUR one", () => {
    const fa = formatProductPrice(prices, "fa");
    // The stored Toman value verbatim — no x10.
    expect(fa).toBe("۴۵٬۰۰۰٬۰۰۰ تومان");
    expect(fa).not.toContain("€");
    // Not the x10 Rial value, and not the Rial unit.
    expect(fa).not.toContain("ریال");
    expect(fa).not.toContain("۴۵۰٬۰۰۰٬۰۰۰");
  });

  it("multiplies the chosen currency by quantity without converting it", () => {
    const en = formatProductPrice(prices, "en", 2);
    expect(en).toContain("2.200");
    // 45,000,000 Toman x2 = 90,000,000 Toman — still no x10.
    expect(formatProductPrice(prices, "fa", 2)).toBe("۹۰٬۰۰۰٬۰۰۰ تومان");
  });

  it("formats Toman with Persian digits and a تومان unit", () => {
    expect(formatToman(4_500_000)).toBe("۴٬۵۰۰٬۰۰۰ تومان");
    expect(formatToman(0)).toBe("۰ تومان");
  });

  it("rounds fractional Toman (Toman has no minor unit)", () => {
    expect(formatToman(1234.7)).toBe("۱٬۲۳۵ تومان");
  });

  it("formats EUR in the app's European style", () => {
    expect(formatEur(12.5)).toContain("12,50");
    expect(formatEur(12.5)).toContain("€");
  });
});

/**
 * The x10 conversion is retained for the payment boundary only. `formatRial`
 * still serves the checkout confirmation page, which renders the amount
 * actually charged in Rial — it must stay out of the catalog/cart display path.
 */
describe("Toman -> Rial conversion (payment boundary only)", () => {
  it("treats 1 Toman as 10 Rial (fixed unit fact, not a rate)", () => {
    expect(RIAL_PER_TOMAN).toBe(10);
    expect(tomanToRial(1)).toBe(10);
    expect(tomanToRial(45_000_000)).toBe(450_000_000);
  });

  it("renders Rial with Persian digits and a ریال unit", () => {
    expect(formatRial(1_500)).toBe("۱٬۵۰۰ ریال");
  });

  it("rounds fractional Rial (Rial has no minor unit)", () => {
    expect(formatRial(1234.7)).toBe("۱٬۲۳۵ ریال");
  });
});

/**
 * The x10 unit fact is encoded in TWO modules — `tomanToRial` here and
 * `toRial` in lib/payments/zarinpal.ts — because the gateway module is a
 * frozen protocol boundary that must not import from the i18n layer. That
 * duplication is deliberate, so it is pinned instead of removed: if either
 * copy drifts, the charge and the displayed "amount charged" disagree and this
 * fails.
 *
 * This is the specific accident §12 of Pass 14 names: 10,000,000 Toman
 * silently becoming 10,000,000 Rial — a 10x undercharge at the gateway.
 */
describe("Toman -> Rial is the SAME conversion on both sides of the boundary", () => {
  it("agrees with the gateway's own toRial", async () => {
    const { toRial } = await import("@/lib/payments/zarinpal");
    for (const toman of [0, 1, 10, 999, 10_000_000, 45_000_000, 1_234_567_890]) {
      expect(tomanToRial(toman)).toBe(toRial(toman));
    }
  });

  it("is never a 1:1 pass-through — 10,000,000 Toman is 100,000,000 Rial", async () => {
    const { toRial } = await import("@/lib/payments/zarinpal");
    expect(toRial(10_000_000)).toBe(100_000_000);
    expect(tomanToRial(10_000_000)).toBe(100_000_000);
    expect(toRial(10_000_000)).not.toBe(10_000_000);
  });

  it("stays exact for the largest amount the Decimal(14,0) column can hold", async () => {
    const { toRial } = await import("@/lib/payments/zarinpal");
    // 99,999,999,999,999 Toman — the column's ceiling.
    const maxToman = 99_999_999_999_999;
    const rial = toRial(maxToman);
    // 999,999,999,999,990 Rial is still well inside Number.MAX_SAFE_INTEGER.
    expect(rial).toBe(999_999_999_999_990);
    expect(Number.isSafeInteger(rial)).toBe(true);
    expect(tomanToRial(maxToman)).toBe(rial);
  });
});
