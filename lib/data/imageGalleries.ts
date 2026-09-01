// Image galleries that were previously hardcoded inside their components.

/** Gallery for the collection detail page (components/collections/collection/ImageGallery.tsx). */
export interface GalleryImage {
  src: string;
  alt: string;
}

export const collectionGalleryImages: GalleryImage[] = [
  { src: "https://loremflickr.com/2400/1200/interior?lock=20", alt: "Modern interior" },
  { src: "https://loremflickr.com/1920/1280/architecture?lock=21", alt: "Modern living room" },
  { src: "https://loremflickr.com/1920/1280/design?lock=23", alt: "Interior design" },
  { src: "https://loremflickr.com/1920/1280/furniture?lock=24", alt: "Interior design" },
  { src: "https://loremflickr.com/1920/1280/livingroom?lock=25", alt: "Luxury interior" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=16", alt: "Minimal interior" },
  { src: "https://loremflickr.com/1800/900/interior?lock=17", alt: "Contemporary interior" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=18", alt: "Living space" },
  { src: "https://loremflickr.com/1200/1300/interior?lock=19", alt: "Architectural interior" },
];

/** Carousel strip used by components/ui/ImageGalleryCarousel.tsx. */
export const carouselImages: string[] = [
  "https://www.henge07.com/app/uploads/2023/04/H19_FOTO_01.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0301-1.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_4403.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_5741.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge_0793-SG.jpg",
  "https://www.henge07.com/app/uploads/2023/04/henge-24092016809m.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3166.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0391.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3168.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0481.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG5_43789.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0312-1.jpg",
];
