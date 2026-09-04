import { loc, type Localized } from "@/lib/i18n/localized";

export interface Material {
  id: string;
  name: Localized;
  category: string;
  image: string;
  description: Localized;
  type: string;
}

export const materials: Material[] = [
  {
    id: "breccia-medicea",
    name: loc("Breccia Medicea", "برچیا مدیچه"),
    type: "leather",
    category: "Stone",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description: loc(
      "A precious Italian stone with dramatic veining, used in Henge's sculptural tables.",
      "سنگی گران‌بهای ایتالیایی با رگه‌های چشمگیر که در میزهای مجسمه‌وار هنژ به کار می‌رود.",
    ),
  },
  {
    id: "marble",
    name: loc("Marble", "مرمر"),
    type: "stone",
    category: "Stone",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description: loc(
      "Timeless Italian marble, hand-selected for its unique character and beauty.",
      "مرمر ایتالیایی بی‌زمان که به‌خاطر شخصیت و زیبایی بی‌نظیرش با دست انتخاب می‌شود.",
    ),
  },
  {
    id: "bronze",
    name: loc("Bronze", "برنز"),
    type: "metal",
    category: "Metal",
    image:
      "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description: loc(
      "Hand-finished bronze elements that add warmth and sophistication to every piece.",
      "عناصر برنزی پرداخت‌شده با دست که به هر قطعه گرما و ظرافت می‌بخشند.",
    ),
  },
  {
    id: "glass",
    name: loc("Crystal Glass", "شیشه کریستال"),
    type: "rugs",
    category: "Glass",
    image:
      "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description: loc(
      "Crystal glass crafted for the Home Collection, from wine glasses to decanters.",
      "شیشه کریستال ساخته‌شده برای کلکسیون خانه، از لیوان‌های شراب تا دکانترها.",
    ),
  },
];

// Materials category switcher \u2014 previously hardcoded in
// components/materials/material/MaterialsSwitcher.tsx. Slugs/labels are a
// placeholder set; swap in the real ones.
export const materialCategories = [
  { label: "Fabrics", href: "/materials/fabrics", i18nKey: "materials.categories.fabrics" },
  { label: "Leathers", href: "/materials/leathers", i18nKey: "materials.categories.leathers" },
  { label: "Woods", href: "/materials/woods", i18nKey: "materials.categories.woods" },
  { label: "Metals", href: "/materials/metals", i18nKey: "materials.categories.metals" },
  { label: "Marbles", href: "/materials/marbles", i18nKey: "materials.categories.marbles" },
];

// Fabric swatch list \u2014 previously hardcoded in
// components/materials/material/FabricsGrid.tsx. Placeholder set matching the
// reference screenshot; swap swatchColor for a real photo per fabric once
// photography is available.
export interface FabricItem {
  id: string;
  name: string;
  code: string;
  category: string;
  swatchColor: string;
}

export const fabrics: FabricItem[] = [
  { id: "abarth-26", name: "Abarth 26", code: "26", category: "Fabrics", swatchColor: "#726A50" },
  { id: "abarth-25", name: "Abarth 25", code: "25", category: "Fabrics", swatchColor: "#D89B2A" },
  { id: "abarth-24", name: "Abarth 24", code: "24", category: "Fabrics", swatchColor: "#D9C7A8" },
  { id: "abarth-23", name: "Abarth 23", code: "23", category: "Fabrics", swatchColor: "#3B2E22" },
  { id: "abarth-22", name: "Abarth 22", code: "22", category: "Fabrics", swatchColor: "#8C6F63" },
  { id: "abarth-21", name: "Abarth 21", code: "21", category: "Fabrics", swatchColor: "#5C5240" },
  { id: "abarth-20", name: "Abarth 20", code: "20", category: "Fabrics", swatchColor: "#C7A560" },
  { id: "abarth-19", name: "Abarth 19", code: "19", category: "Fabrics", swatchColor: "#E3D5B8" },
  { id: "abarth-18", name: "Abarth 18", code: "18", category: "Fabrics", swatchColor: "#4A362A" },
  { id: "abarth-17", name: "Abarth 17", code: "17", category: "Fabrics", swatchColor: "#9C7A6A" },
];
