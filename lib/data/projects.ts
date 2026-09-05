import { type Localized, loc } from "@/lib/i18n/localized";
import type { Product } from "./productCategories";
import { productCategories } from "./productCategories";

export interface Project {
  id: string;
  /** Translation key prefix, e.g. "projects.hIstra" → keys: "projects.hIstra.name", "projects.hIstra.description" */
  i18nKey: string;
  name: Localized;
  location: string;
  year: string;
  image: string;
  description: Localized;
  productsUsed: Product[];
}

/**
 * Flat pool of all products — built once at module load.
 */
const PRODUCT_POOL: Product[] = productCategories.flatMap(
  (cat) => cat.products,
);

/**
 * Deterministic pseudo-random pick using a string seed so it's stable across renders.
 */
function pickProducts(seed: string, count: number): Product[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const shuffled = [...PRODUCT_POOL].sort(
    (a, b) =>
      ((hash * 17 + a.id.charCodeAt(0)) % 7) -
      ((hash * 17 + b.id.charCodeAt(0)) % 7),
  );
  return shuffled.slice(0, count);
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export const projects: Project[] = [
  {
    id: "h-istra",
    i18nKey: "projects.hIstra",
    name: loc("H Istra", "اچ ایسترا"),
    location: "Europe",
    year: "2026",
    image:
      "https://www.henge07.com/app/uploads/2026/06/H-Istra_Europe_Arch-Olga-Stupenko-61.jpg",
    description: loc(
      "A residential project in Europe, showcasing Henge's timeless design in an intimate setting.",
      "یک پروژه مسکونی در اروپا که طراحی بی‌زمان Henge را در یک محیط صمیمی به نمایش می‌گذارد.",
    ),
    productsUsed: pickProducts("h-istra", 3),
  },
  {
    id: "henge-paris",
    i18nKey: "projects.hengeParis",
    name: loc("HENGE PARIS", "هنج پاریس"),
    location: "Paris, France",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/01/7-scaled.jpg",
    description: loc(
      "Henge's first pop-up store in Paris, created in partnership with Silvera on Boulevard Saint-Germain.",
      "اولین فروشگاه پاپ‌آپ هنج در پاریس، با همکاری Silvera در بولوار سن ژرمن.",
    ),
    productsUsed: pickProducts("henge-paris", 3),
  },
  {
    id: "vocla-2026",
    i18nKey: "projects.vocla2026",
    name: loc("Vocla 2026", "ووکلا ۲۰۲۶"),
    location: "Milan, Italy",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/05/ALCOVAMDW26_03-3.jpg",
    description: loc(
      "For Milan Design Week 2026, Henge returned to VOCLA at the Ospedale Militare di Baggio.",
      "هنگام هفته طراحی میلان ۲۰۲۶، هنج به VOCLA در Ospedale Militare di Baggio بازگشت.",
    ),
    productsUsed: pickProducts("vocla-2026", 3),
  },
  {
    id: "henge-beijing",
    i18nKey: "projects.hengeBeijing",
    name: loc("HENGE BEIJING", "هنج پکن"),
    location: "Beijing, China",
    year: "2021",
    image: "https://www.henge07.com/app/uploads/2021/12/005web-1-400x400.jpg",
    description: loc(
      "Henge's presence in Beijing, bringing Italian design craftsmanship to China.",
      "حضور هنج در پکن که صنعتگری طراحی ایتالیایی را به چین می‌آورد.",
    ),
    productsUsed: pickProducts("henge-beijing", 3),
  },
];
// Quick-links strip rendered by components/ProjectsSections.tsx.
// (label / href / image cards for Products, Projects and S34)
export interface SectionLink {
  label: string;
  /** Translation key (lib/i18n/translations.ts) used to localize the label; falls back to `label`. */
  i18nKey?: string;
  href: string;
  image: string;
}

export const projectsSectionLinks: SectionLink[] = [
  {
    label: "Products",
    i18nKey: "nav.products",
    href: "/products",
    image: "https://www.henge07.com/app/uploads/2023/04/PRODUCTS-1.jpg",
  },
  {
    label: "Projects",
    i18nKey: "nav.projects",
    href: "/projects",
    image: "https://www.henge07.com/app/uploads/2023/04/PROJECTS-1.jpg",
  },
  {
    label: "S34",
    i18nKey: "menu.s34",
    href: "/collection/henge-catalogue-s34-3",
    image: "https://www.henge07.com/app/uploads/2023/04/Henge_Spiga_30_B-1.jpg",
  },
];
