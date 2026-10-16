/** Shared types for the ImageGalleryCarousel and its sub-components. */

import type { Localized } from "@/lib/i18n/localized";

/**
 * A category-tile item — the shape the homepage builds from
 * `getProductCategories()`.
 *
 * `i18nKey` and `name` are DELIBERATELY separate fields. The key is the
 * dictionary lookup derived from the slug; the name is the row's own bilingual
 * text — the words the admin typed. They used to be conflated: the tile carried
 * the KEY as its `name`, and the slides fed that string into `t()`, which
 * returns the RAW KEY on a dictionary miss — so a newly added category rendered
 * literally "products.car" in both languages (tile label, image `alt` and
 * `aria-label`). Both fields now travel together and are resolved at render
 * time through `displayCategoryName` (dictionary-first, column fallback) —
 * the same resolver the category page uses.
 */
export type CategoryItem = {
  i18nKey: string;
  name: Localized;
  image: string;
  link: string;
};

/** A normalized carousel item — image is required, the rest are optional. */
export type CarouselItem = {
  image: string;
  /** Category tiles only — see {@link CategoryItem}. */
  i18nKey?: string;
  /** Category tiles only — the row's own bilingual name. */
  name?: Localized;
  link?: string;
};

/** Click behavior for slides. */
export type CarouselPurpose = "gallery" | "link";

/** Public props for the main `ImageGalleryCarousel` component. */
export type ImageGalleryCarouselProps = {
  /** Show the cursor-following circle on desktop. */
  circle?: boolean;
  /** Vary slide widths (alternates `DEFAULT` and `DOUBLE` width chains). */
  multiWidth?: boolean;
  /** Render a stacked column on small viewports (hidden on `lg+`). */
  mobileColumn?: boolean;
  /** Plain image gallery (default if no `category` is provided). */
  images?: string[];
  /** Category tiles — take precedence over `images` when non-empty. */
  category?: CategoryItem[];
  /** `"gallery"` (default) opens a lightbox on click; `"link"` makes each
   *  slide an anchor (category items → their own `link`; plain slides → `href`). */
  purpose?: CarouselPurpose;
  /** Shared link target used when `purpose="link"` and the slide has no
   *  per-item link. Ignored in "gallery" mode. */
  href?: string;
};
