import { describe, expect, it } from "vitest";
import {
  formatEur,
  formatProductPrice,
  formatRial,
  RIAL_PER_TOMAN,
  tomanToRial,
} from "@/lib/i18n/price";

/**
 * Part C: a price is shown in exactly one currency — EUR for `en`, Rial for
 * `fa` — and the Persian figure is the Toman price converted x10.
 */
describe("price display", () => {
  const prices = { priceEur: 1100, priceToman: 45_000_000 };

  it("treats 1 Toman as 10 Rial (fixed unit fact, not a rate)", () => {
    expect(RIAL_PER_TOMAN).toBe(10);
    expect(tomanToRial(1)).toBe(10);
    expect(tomanToRial(45_000_000)).toBe(450_000_000);
  });

  it("shows the EUR price for en, and never the Toman one", () => {
    const en = formatProductPrice(prices, "en");
    expect(en).toContain("€");
    expect(en).not.toContain("ریال");
    // The Toman figure must not leak into the English rendering.
    expect(en).not.toContain("450,000,000");
  });

  it("shows the Rial price for fa, and never the EUR one", () => {
    const fa = formatProductPrice(prices, "fa");
    expect(fa).toContain("ریال");
    expect(fa).not.toContain("€");
    // Toman 45,000,000 x10 = 450,000,000 Rial.
    expect(fa).toContain("۴۵۰");
  });

  it("multiplies the chosen currency by quantity", () => {
    const en = formatProductPrice(prices, "en", 2);
    expect(en).toContain("2.200");
    const fa = formatProductPrice(prices, "fa", 2);
    expect(fa).toContain("۹۰۰");
  });

  it("renders Rial with Persian digits and a ریال unit", () => {
    expect(formatRial(1_500)).toBe("۱٬۵۰۰ ریال");
  });

  it("formats EUR in the app's European style", () => {
    expect(formatEur(12.5)).toContain("12,50");
    expect(formatEur(12.5)).toContain("€");
  });

  it("rounds fractional Rial (Rial has no minor unit)", () => {
    expect(formatRial(1234.7)).toBe("۱٬۲۳۵ ریال");
  });
});
