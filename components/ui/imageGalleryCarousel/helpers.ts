import type { CarouselItem, CategoryItem } from "./types";

/**
 * Normalize either `images` or `category` props into a `CarouselItem[]`.
 *
 * THIS IS THE SINGLE CHOKE POINT for the "image is required" contract that
 * `CarouselItem` declares — and it used to be the one thing not enforcing it.
 * Items whose image is missing or empty are dropped here, because a blank
 * `src` is not a cosmetic problem: React reports it as a missing/empty `src`
 * error, and the browser reacts to `src=""` by re-requesting the current page
 * over the network. Every consumer (Slide, MobileColumn, LightboxModal) reads
 * `item.image` as a plain string, so filtering once here is what makes that
 * true rather than hoping each call site remembered to check.
 */
export function toCarouselItems(
  images: string[] | undefined,
  category: CategoryItem[] | undefined,
): CarouselItem[] {
  if (category && category.length > 0) {
    return category
      .filter((c) => Boolean(c.image))
      .map((c) => ({
        image: c.image,
        name: c.name,
        link: c.link,
      }));
  }
  return (images ?? [])
    .filter((src) => Boolean(src))
    .map((src) => ({ image: src }));
}

/** Type guard: did this item come from a category (name + link guaranteed)? */
export function isCategoryItem(
  item: CarouselItem,
): item is Required<CarouselItem> {
  return item.name !== undefined && item.link !== undefined;
}
