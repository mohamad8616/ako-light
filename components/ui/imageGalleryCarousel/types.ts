/** Shared types for the ImageGalleryCarousel and its sub-components. */

/** A category-tile item with a name + link (CTA below the image). */
export type CategoryItem = {
  name: string;
  image: string;
  link: string;
};

/** A normalized carousel item — image is required, name/link are optional. */
export type CarouselItem = {
  image: string;
  name?: string;
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
