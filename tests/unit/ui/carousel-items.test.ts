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

import { isCategoryItem, toCarouselItems } from "@/components/ui/imageGalleryCarousel/helpers";

describe("toCarouselItems — category branch", () => {
  it("maps category items and preserves their order", () => {
    const items = toCarouselItems(undefined, [
      { name: "products.a", image: "/a.jpg", link: "/products/a" },
      { name: "products.b", image: "/b.jpg", link: "/products/b" },
    ]);

    expect(items).toEqual([
      { name: "products.a", image: "/a.jpg", link: "/products/a" },
      { name: "products.b", image: "/b.jpg", link: "/products/b" },
    ]);
  });

  it("DROPS a category whose image is an empty string", () => {
    // The exact shape the homepage used to produce when a category's first
    // product had no gallery images: `image` came through as ""/undefined.
    const items = toCarouselItems(undefined, [
      { name: "products.a", image: "", link: "/products/a" },
      { name: "products.b", image: "/b.jpg", link: "/products/b" },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].image).toBe("/b.jpg");
  });

  it("DROPS a category whose image is undefined", () => {
    const items = toCarouselItems(undefined, [
      {
        name: "products.a",
        image: undefined as unknown as string,
        link: "/products/a",
      },
    ]);

    expect(items).toEqual([]);
  });

  it("takes precedence over `images` when it has usable entries", () => {
    const items = toCarouselItems(["/plain.jpg"], [
      { name: "products.a", image: "/a.jpg", link: "/products/a" },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("/products/a");
  });

  it("yields an empty list when every category entry is dropped", () => {
    // No silent fallback to `images`: `category` and `images` are alternative
    // modes, and mixing them would make the result depend on which happened to
    // survive filtering. The carousel already renders nothing for 0 items, so
    // "no usable tiles" is a supported outcome.
    const items = toCarouselItems(["/plain.jpg"], [
      { name: "products.a", image: "", link: "/products/a" },
    ]);

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
      [{ name: "products.x", image: "", link: "/products/x" }],
    );

    for (const item of items) {
      expect(item.image.length, "image is a non-empty string").toBeGreaterThan(0);
    }
  });
});

describe("isCategoryItem", () => {
  it("recognises a category item (name + link present)", () => {
    expect(
      isCategoryItem({ name: "products.a", image: "/a.jpg", link: "/products/a" }),
    ).toBe(true);
  });

  it("rejects a plain image slide", () => {
    expect(isCategoryItem({ image: "/a.jpg" })).toBe(false);
  });

  it("rejects an item missing either half of the category pair", () => {
    expect(isCategoryItem({ name: "products.a", image: "/a.jpg" })).toBe(false);
    expect(isCategoryItem({ image: "/a.jpg", link: "/products/a" })).toBe(false);
  });
});
