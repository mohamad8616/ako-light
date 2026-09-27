// About-page image assets. The page's *textual* copy moved to the
// `AboutPageSection` table (see lib/repositories/about-page.ts, seeded from
// lib/i18n/translations/about.ts); only image URLs live here, because they are
// not translation content (myPlan.md Part C).

export const aboutImages = {
  brandStoryBlock1: "https://www.henge07.com/app/uploads/2025/07/Henge_0730.jpg",
  brandStoryBlock2: "https://www.henge07.com/app/uploads/2025/07/Henge_0722-SG.jpg",
};

export const aboutGalleryImages = [
  "https://picsum.photos/seed/about-henge-1/900/1200",
  "https://picsum.photos/seed/about-henge-2/900/1200",
  "https://picsum.photos/seed/about-henge-3/900/1200",
  "https://picsum.photos/seed/about-henge-4/900/1200",
  "https://picsum.photos/seed/about-henge-5/900/1200",
  "https://picsum.photos/seed/about-henge-6/900/1200",
];

export function getAboutGalleryImages(): string[] {
  return aboutGalleryImages;
}