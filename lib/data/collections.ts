export interface Collection {
  id: string;
  name: string;
  year: string;
  image: string;
  description: string;
}

export const collections: Collection[] = [
  {
    id: "ritual-gravity",
    name: "Ritual Gravity",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/04/hero-mdw2026.jpg",
    description:
      "The 2026 Collection. An exploration of design as immersive and sensory experience.",
  },
  {
    id: "timeless",
    name: "Timeless",
    year: "2025",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description:
      "Timeless Tables — Sisma, a table of great versatility, stems from the harmonious visual interplay between concave and convex forms.",
  },
  {
    id: "home-collection",
    name: "Home Collection",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description:
      "A curated selection of objects for refined living, from wine glass sets and decanters to whisky sets, tableware, cutlery and an exclusive home fragrance.",
  },
  {
    id: "stone",
    name: "Stone",
    year: "2024",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description:
      "Sculptural pieces in precious stone, showcasing the natural beauty of materials.",
  },
  {
    id: "signature",
    name: "Signature",
    year: "2023",
    image: "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description:
      "Signature Henge pieces that embody the brand's material research and sophisticated approach.",
  },
  {
    id: "experimental",
    name: "Experimental",
    year: "2022",
    image: "https://www.henge07.com/app/uploads/2021/10/h-15032129575_COVER_def1-400x400.jpg",
    description:
      "Experimental pieces from Henge's ongoing exploration of form and material.",
  },
];