/**
 * Homepage feature slot keys.
 *
 * Every homepage banner is a singleton "feature" row; these constants are the
 * rows' primary keys and mirror `prisma/seed.ts`. They live in their own module
 * so the slot modules and the admin overview can share them without importing
 * each other (and without pulling a slot's Prisma payload types along for a
 * string constant).
 */
export const FLAGSHIP_ONE_SLOT = "flagship-one";
export const PROJECT_BANNER_SLOT = "project-banner";
export const PROJECT_DARK_BACKGROUND_SLOT = "project-dark-background";
export const HOME_COLLECTION_SLOT = "home-collection";
export const CATALOGUE_SLOT = "catalogue";
/** The hero — components/home/HeroSection.tsx (Pass D.1). */
export const HERO_SLOT = "hero";
/** The video section — components/home/VideoSection.tsx (Pass D.1). */
export const VIDEO_SLOT = "video";

/** Every homepage slot key — listed in the order the homepage renders them. */
export type HomepageFeatureSlot =
  | typeof HERO_SLOT
  | typeof FLAGSHIP_ONE_SLOT
  | typeof VIDEO_SLOT
  | typeof CATALOGUE_SLOT
  | typeof HOME_COLLECTION_SLOT
  | typeof PROJECT_BANNER_SLOT
  | typeof PROJECT_DARK_BACKGROUND_SLOT;

/** The Home Collection banner links to the collections index. */
export const HOME_COLLECTION_HREF = "/collections";
