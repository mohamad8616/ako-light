import type { CarouselItem, CategoryItem } from "./types";

/** Normalize either `images` or `category` props into a `CarouselItem[]`. */
export function toCarouselItems(
  images: string[] | undefined,
  category: CategoryItem[] | undefined,
): CarouselItem[] {
  if (category && category.length > 0) {
    return category.map((c) => ({
      image: c.image,
      name: c.name,
      link: c.link,
    }));
  }
  return (images ?? []).map((src) => ({ image: src }));
}

/** Type guard: did this item come from a category (name + link guaranteed)? */
export function isCategoryItem(
  item: CarouselItem,
): item is Required<CarouselItem> {
  return item.name !== undefined && item.link !== undefined;
}
