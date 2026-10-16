/**
 * `toCarouselItems` is the normalization choke point for the carousel, and the
 * place the `CarouselItem.image` "required" contract is actually enforced.
 *
 * It was NOT enforcing it: items whose image was missing or an empty string
 * passed straight through, and each one produced three separate problems in the
 * browser — a non-unique React `key` (the carousel keyed slides on the image), a
 * `<img src="">` warning, and the browser re-requesting the current page over
 * the network because `src=""` resolves to the document URL.
 *
 * These tests pin the filtering so a future "just map the array" simplification
 * cannot reintroduce it.
 */
import { describe, expect, it } from "vitest";

import {
  isCategoryItem,
  toCarouselItems,
} from "@/components/ui/imageGalleryCarousel/helpers";
import { loc } from "@/lib/i18n/localized";

/** A category tile in the shape the homepage builds (key + bilingual name). */
const tile = (slug: string, en: string, fa: string) => ({
  i18nKey: `products.${slug}`,
  name: loc(en, fa),
  image: `/${slug}.jpg`,
  link: `/products/${slug}`,
});

describe("toCarouselItems — category branch", () => {
  it("maps category items and preserves their order", () => {
    const items = toCarouselItems(undefined, [
      tile("a", "A", "الف"),
      tile("b", "B", "ب"),
    ]);

    expect(items).toEqual([
      tile("a", "A", "الف"),
      tile("b", "B", "ب"),
    ]);
  });

  it("keeps the i18nKey alongside the bilingual name", () => {
    // The label resolution (`displayCategoryName`) needs the key AND the
    // name column — the key for the dictionary, the column as fallback.
    const items = toCarouselItems(undefined, [tile("a", "A", "الف")]);

    expect(items[0].i18nKey).toBe("products.a");
    expect(items[0].name).toEqual({ en: "A", fa: "الف" });
  });

  it("DROPS a category whose image is an empty string", () => {
    // The exact shape the homepage used to produce when a category's first
    // product had no gallery images: `image` came through as ""/undefined.
    const items = toCarouselItems(undefined, [
      { ...tile("a", "A", "الف"), image: "" },
      tile("b", "B", "ب"),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].image).toBe("/b.jpg");
  });

  it("DROPS a category whose image is undefined", () => {
    const items = toCarouselItems(undefined, [
      {
        ...tile("a", "A", "الف"),
        image: undefined as unknown as string,
      },
    ]);

    expect(items).toEqual([]);
  });

  it("takes precedence over `images` when it has usable entries", () => {
    const items = toCarouselItems(["/plain.jpg"], [tile("a", "A", "الف")]);

    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("/products/a");
  });

  it("yields an empty list when every category entry is dropped", () => {
    // No silent fallback to `images`: `category` and `images` are alternative
    // modes, and mixing them would make the result depend on which happened to
    // survive filtering. The carousel already renders nothing for 0 items, so
    // "no usable tiles" is a supported outcome.
    const items = toCarouselItems(
      ["/plain.jpg"],
      [{ ...tile("a", "A", "الف"), image: "" }],
    );

    expect(items).toEqual([]);
  });
});

describe("toCarouselItems — images branch", () => {
  it("maps plain image strings", () => {
    expect(toCarouselItems(["/a.jpg", "/b.jpg"], undefined)).toEqual([
      { image: "/a.jpg" },
      { image: "/b.jpg" },
    ]);
  });

  it("DROPS empty strings and keeps the rest in order", () => {
    const items = toCarouselItems(["/a.jpg", "", "/c.jpg"], undefined);

    expect(items.map((i) => i.image)).toEqual(["/a.jpg", "/c.jpg"]);
  });

  it("returns an empty list for undefined or empty input", () => {
    expect(toCarouselItems(undefined, undefined)).toEqual([]);
    expect(toCarouselItems([], undefined)).toEqual([]);
    expect(toCarouselItems(undefined, [])).toEqual([]);
  });

  it("never yields an item with an empty image", () => {
    const items = toCarouselItems(
      ["", "/ok.jpg", ""],
      [{ ...tile("x", "X", "ایکس"), image: "" }],
    );

    for (const item of items) {
      expect(item.image.length, "image is a non-empty string").toBeGreaterThan(0);
    }
  });
});

describe("isCategoryItem", () => {
  it("recognises a category item (key + name + link present)", () => {
    expect(isCategoryItem(tile("a", "A", "الف"))).toBe(true);
  });

  it("rejects a plain image slide", () => {
    expect(isCategoryItem({ image: "/a.jpg" })).toBe(false);
  });

  it("rejects an item missing any one of key/name/link", () => {
    expect(
      isCategoryItem({ ...tile("a", "A", "الف"), i18nKey: undefined }),
    ).toBe(false);
    expect(
      isCategoryItem({ ...tile("a", "A", "الف"), name: undefined }),
    ).toBe(false);
    expect(isCategoryItem({ ...tile("a", "A", "الف"), link: undefined })).toBe(
      false,
    );
  });
});
