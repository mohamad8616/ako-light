import { loc, type Localized } from "@/lib/i18n/localized";

export interface Material {
  id: string;
  name: Localized;
  category: string;
  image: string;
  description: Localized;
  type:
    | "stone"
    | "metal"
    | "glass"
    | "wood"
    | "fabric"
    | "leather"
    | "marble"
    | "stone-composite";
}

export const materials: Material[] = [
  {
    id: "breccia-medicea",
    name: loc("Breccia Medicea", "برچیا مدیچه"),
    type: "stone",
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
    type: "glass",
    category: "Glass",
    image:
      "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description: loc(
      "Crystal glass crafted for the Home Collection, from wine glasses to decanters.",
      "شیشه کریستال ساخته‌شده برای کلکسیون خانه، از لیوان‌های شراب تا دکانترها.",
    ),
  },
];
