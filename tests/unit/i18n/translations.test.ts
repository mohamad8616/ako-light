import { describe, expect, it } from "vitest";
import { languageNames, translations } from "@/lib/i18n/translations";

describe("translations dictionary", () => {
  it("exposes exactly the two supported languages", () => {
    expect(Object.keys(translations)).toEqual(["en", "fa"]);
  });

  it("keeps the English and Persian key sets identical", () => {
    const enKeys = Object.keys(translations.en).sort();
    const faKeys = Object.keys(translations.fa).sort();
    expect(faKeys).toEqual(enKeys);
  });

  it("never maps a key to its own raw key (no missing-translation leaks)", () => {
    // LanguageProvider.t falls back to the raw key when a lookup misses, so a
    // value equal to its key would mean a missing translation that renders as
    // a bare key in the UI.
    for (const lang of ["en", "fa"] as const) {
      const dict = translations[lang];
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it("provides the core page keys used by the root layout", () => {
    expect(translations.en["page.home.title"]).toBeTruthy();
    expect(translations.en["page.home.description"]).toBeTruthy();
    expect(translations.fa["page.home.title"]).toBeTruthy();
    expect(translations.fa["page.home.description"]).toBeTruthy();
  });

  it("declares language names for both languages", () => {
    expect(languageNames.en).toBe("English");
    expect(languageNames.fa).toBe("Persian");
  });
});