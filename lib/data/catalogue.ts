export interface CatalogueItem {
  id: string;
  title: string;
  /** Direct link to the PDF. Swap the "#" placeholders for real files. */
  href: string;
  coverColor: string;
  coverTextColor?: string;
}

export const catalogueItems: CatalogueItem[] = [
  {
    id: "s34-5",
    title: "S34/5",
    href: "https://www.henge07.com/app/uploads/2026/07/Henge_Catalogue_S34-5.pdf",
    coverColor: "#3a3530",
  },
  {
    id: "draft",
    title: "DRAFT",
    href: "#",
    coverColor: "#232323",
  },
  {
    id: "s34-4",
    title: "S34/4",
    href: "#",
    coverColor: "#dfe1e6",
    coverTextColor: "#232323",
  },
  {
    id: "s34-3",
    title: "S34/3",
    href: "#",
    coverColor: "#e7e2d8",
    coverTextColor: "#232323",
  },
  {
    id: "s34-2",
    title: "S34/2",
    href: "#",
    coverColor: "#c1602c",
  },
  {
    id: "s34-1",
    title: "S34/1",
    href: "#",
    coverColor: "#1f6f63",
  },
];
