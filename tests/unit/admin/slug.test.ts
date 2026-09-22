import { defaultSlugFromName, isSlug, slugify } from "@/lib/admin/slug";
import { describe, expect, it } from "vitest";

describe("admin slug helpers", () => {
  it("normalizes display names to URL-safe slugs", () => {
    expect(slugify("Ariane Pendant Lamp")).toBe("ariane-pendant-lamp");
    expect(slugify("Örnek / Özel")).toBe("ornek-ozel");
  });

  it("accepts only canonical slug syntax", () => {
    expect(isSlug("ariane-pendant-lamp")).toBe(true);
    expect(isSlug("Ariane Pendant")).toBe(false);
    expect(isSlug("ariane--lamp")).toBe(false);
  });

  it("derives a default slug from the english name and leaves Persian-only names blank", () => {
    expect(defaultSlugFromName("Ariane Pendant Lamp", "آریانه")).toBe(
      "ariane-pendant-lamp",
    );
    expect(defaultSlugFromName("!!!", "چراغ آریانه")).toBe("");
  });
});
