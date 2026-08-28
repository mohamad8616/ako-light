export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  designer: string;
  collection: string;
  image: string;
  description: string;
}

export const products: Product[] = [
  {
    id: "sisma",
    name: "Sisma",
    category: "Tables",
    subCategory: "dining-table",
    designer: "Massimo Castagna",
    collection: "Timeless",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description:
      "A table of great versatility, stemming from the harmonious visual interplay between the generously proportioned concave and convex forms of its skillfully shaped and hand-chiseled legs.",
  },
  {
    id: "s34-5",
    name: "S34/5",
    category: "Tables",
    subCategory: "dining-table",
    designer: "Massimo Castagna",
    collection: "Catalogue",
    image: "https://www.henge07.com/app/uploads/2026/07/H-S345-2.jpg",
    description:
      "An iconic Henge piece, part of the S34 series, crafted with exceptional Italian artisanal techniques.",
  },
  {
    id: "he1408m",
    name: "Breccia Medicea",
    category: "Tables",
    subCategory: "dining-table",
    designer: "Massimo Castagna",
    collection: "Stone",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description:
      "A sculptural table in Breccia Medicea stone, showcasing the natural beauty of precious materials.",
  },
  {
    id: "he1420m",
    name: "MDW 2022",
    category: "Limited Edition",
    subCategory: "experimental",
    designer: "Massimo Castagna",
    collection: "Milan Design Week",
    image: "https://www.henge07.com/app/uploads/2022/05/he1420m-copia-400x400.jpg",
    description:
      "Limited edition piece presented during Milan Design Week 2022.",
  },
  {
    id: "h17929",
    name: "Henge 071020",
    category: "Lighting",
    subCategory: "pendant-light",
    designer: "Massimo Castagna",
    collection: "Signature",
    image: "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description:
      "A signature Henge piece that embodies the brand's material research and sophisticated approach.",
  },
  {
    id: "h-15032129575",
    name: "TEST-ONE",
    category: "Limited Edition",
    subCategory: "experimental",
    designer: "Massimo Castagna",
    collection: "Experimental",
    image: "https://www.henge07.com/app/uploads/2021/10/h-15032129575_COVER_def1-400x400.jpg",
    description:
      "An experimental piece from Henge's ongoing exploration of form and material.",
  },
];