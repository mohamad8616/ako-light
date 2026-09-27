// S34 page image assets. The page's *textual* content moved to the
// `S34PageSection` table (seeded from lib/i18n/translations/s34.ts — see
// lib/repositories/s34-page.ts); only the gallery photo list still lives
// here, because it is not translation content.
//
// The former `s34Sections` object (English-only prose for hero/intro/approach/
// journey/materials/location/gallery/harmony) was confirmed dead in myPlan.md
// Part A — nothing imported it except `getS34GalleryImages()`, and the live
// page renders the `s34.*` translation keys instead. It was removed in this
// pass so two divergent copies of the same content don't sit in the repo; the
// database is now the single editable source.
export const s34GalleryImages = [
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_43-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_72.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_18_B-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_30-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_78_B-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_52_C-2.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_55_B-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_62.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_63.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_65.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_67-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_73-2.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_81-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_85_B-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_86-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_89_B-1.jpg",
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_92.jpg",
];

export function getS34GalleryImages(): string[] {
  return s34GalleryImages;
}