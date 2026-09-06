// About-page image assets. All /about copy lives in lib/i18n/translations.ts
// under the "about.*" keys and is resolved via useLanguage().t in the
// components/about components.

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