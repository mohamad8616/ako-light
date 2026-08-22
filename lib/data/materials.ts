export interface Material {
  id: string;
  name: string;
  category: string;
  image: string;
  description: string;
  metal:string
}

export const materials: Material[] = [
  {
    id: "breccia-medicea",
    name: "Breccia Medicea",
    metal: "leather",
    category: "Stone",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description:
      "A precious Italian stone with dramatic veining, used in Henge's sculptural tables.",
  },
  {
    id: "marble",
    name: "Marble",
    metal: "stone",
    category: "Stone",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description:
      "Timeless Italian marble, hand-selected for its unique character and beauty.",
  },
  {
    id: "bronze",
    name: "woods",
    metal: "metal",
    category: "Metal",
    image:
      "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description:
      "Hand-finished bronze elements that add warmth and sophistication to every piece.",
  },
  {
    id: "glass",
    name: "Crystal Glass",
    metal: "rugs",
    category: "Glass",
    image:
      "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description:
      "Crystal glass crafted for the Home Collection, from wine glasses to decanters.",
  },
];
