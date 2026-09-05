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
  /**
   * A long-form, atmospheric paragraph rendered at the bottom of the
   * project info section. Bilingual via `Localized`.
   */
  paragraph: Localized;
  /**
   * Additional 2 paragraphs of descriptive text rendered below the
   * main description. Bilingual via `Localized`. Length is 2.
   */
  moreDescription: Localized[];
  /**
   * Credits/acknowledgements — e.g. "Interior Design by ...\nPhotography by ...".
   * Each entry can be a plain string (shared across languages) or a `Localized`
   * object for full per-language control.
   */
  credits: (Localized | string)[];
  /**
   * Additional portfolio images for the project's gallery/carousel.
   * Includes 6–8 image URLs.
   */
  portfolioImages: string[];
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
    paragraph: loc(
      "Every element—every finish, proportion, and glow—has been orchestrated to create an environment that feels both composed and alive. At the heart of the residence, envisioned as its luminous centerpiece, stands the Oneon kitchen island in Ice Onyx.",
      "هر عنصر، هر پرداخت، نسبت و درخشش، به گونه‌ای ترکیب شده‌اند تا فضایی بسازند که هم آراسته و هم زنده به نظر برسد. در قلب این اقامتگاه، به عنوان مرکز درخشان آن، جزیره آشپزخانه Oneon در Ice Onyx قرار دارد.",
    ),
    moreDescription: [
      loc(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        "لورم ایپسوم دولور سیت آمت، کنسکتتور آدیپیسینگ الیت. سد دو ایوسمود تمپور اینسیدیدانت یوت لابوره ات دولوره ماگنا آلیکوا. یوت انیم اد مینیم ونیام، کویس نوسترود اکسرسیتاتیون اولامکو لابوریس نیسی یوت آلیکوئیپ اکس ایا کومودو کانسکوات.",
      ),
      loc(
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        "دویس آوته ایروره دولور این رپرهندیت این ولوپتاته ویلیت اسه سیلوم دولوره او فوگیات نولا پاریاتور. اکسپتیور سینت اوکئات کوپیداتات نون پرویدنت، سونت این کولپا کوئی آفیسیا دیسرانت مولیت انیم اید است لابوروم.",
      ),
    ],
    credits: [
      loc(
        "Interior Design by PurPur Interior Concepts, Frankfurt",
        "طراحی داخلی توسط PurPur Interior Concepts، فرانکفورت",
      ),
      loc("Photography by Andrea Pancino", "عکاسی توسط آندره‌ای پانچینو"),
      loc(
        "Every element—every finish, proportion, and glow",
        "هر عنصر، هر پرداخت، نسبت و درخشش",
      ),
    ],
    portfolioImages: [
      "https://picsum.photos/seed/h-istra-1/1600/1000",
      "https://picsum.photos/seed/h-istra-2/1600/1000",
      "https://picsum.photos/seed/h-istra-3/1600/1000",
      "https://picsum.photos/seed/h-istra-4/1600/1000",
      "https://picsum.photos/seed/h-istra-5/1600/1000",
      "https://picsum.photos/seed/h-istra-6/1600/1000",
    ],
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
    paragraph: loc(
      "Every element—every finish, proportion, and glow—has been orchestrated to create a Parisian setting that feels both composed and alive. At the heart of the pop-up, envisioned as its luminous centerpiece, stands the Oneon kitchen island in Ice Onyx.",
      "هر عنصر، هر پرداخت، نسبت و درخشش، به گونه‌ای ترکیب شده‌اند تا فضایی پاریسی بسازند که هم آراسته و هم زنده به نظر برسد. در قلب این فروشگاه پاپ‌آپ، به عنوان مرکز درخشان آن، جزیره آشپزخانه Oneon در Ice Onyx قرار دارد.",
    ),
    moreDescription: [
      loc(
        "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Aliquam erat volutpat. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus maecenas tempus, tellus eget condimentum rhoncus.",
        "وستیبولوم آنت ایپسوم پریمیس این فاوکیبوس اورسی لوکتوس ات اولتریسس پوسوئره کوبیلیا کورا. آلیکوام ارات وولوتپات. کورابیتور اولامکورپر اولتریسیس نیسی. نام اگت دوئی. اتیام رنکوس ماکناس تمپوس، تلوس اگت کاندیمنتم رنکوس.",
      ),
      loc(
        "Praesent venenatis metus at tortor pulvinar varius. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
        "پرزن ونتیس متوس آت تورتور پولوینار واریوس. انئان کومودو لیگولا اگت دولور. انئان ماسا. کوم سوکیس ناتوکه پناتیبوس ات ماگنیس دیس پارتورینت مونتس، ناستور ریدیکولوس موس.",
      ),
    ],
    credits: [
      loc("Concept & Design by Henge", "ایده و طراحی توسط هنج"),
      loc("Partnership with Silvera", "همکاری با Silvera"),
      loc(
        "Every element—every finish, proportion, and glow",
        "هر عنصر، هر پرداخت، نسبت و درخشش",
      ),
    ],
    portfolioImages: [
      "https://picsum.photos/seed/henge-paris-1/1600/1000",
      "https://picsum.photos/seed/henge-paris-2/1600/1000",
      "https://picsum.photos/seed/henge-paris-3/1600/1000",
      "https://picsum.photos/seed/henge-paris-4/1600/1000",
      "https://picsum.photos/seed/henge-paris-5/1600/1000",
      "https://picsum.photos/seed/henge-paris-6/1600/1000",
      "https://picsum.photos/seed/henge-paris-7/1600/1000",
      "https://picsum.photos/seed/henge-paris-8/1600/1000",
    ],
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
    paragraph: loc(
      "Every element—every finish, proportion, and glow—has been orchestrated to create an exhibition that feels both composed and alive. At the heart of VOCLA, envisioned as its luminous centerpiece, stands the Oneon kitchen island in Ice Onyx.",
      "هر عنصر، هر پرداخت، نسبت و درخشش، به گونه‌ای ترکیب شده‌اند تا نمایشگاهی بسازند که هم آراسته و هم زنده به نظر برسد. در قلب VOCLA، به عنوان مرکز درخشان آن، جزیره آشپزخانه Oneon در Ice Onyx قرار دارد.",
    ),
    moreDescription: [
      loc(
        "Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui.",
        "فاسلوس ویورا نولا یوت متوس واریوس لائوریت. کویسکه روتروم. انئان ایمپردیت. اتیام اولتریسیس نیسی ول آوگ. کورابیتور اولامکورپر اولتریسیس نیسی. نام اگت دوئی.",
      ),
      loc(
        "Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus.",
        "اینتیجر تینسیدانت. کراس داپیبوس. ویواموس المنتم سمپر نیسی. انئان لئو لیگولا، پورتیتور او، کانسکوات ویتائه، الیفند آک، انیم. آلیکوام لورم آنت، داپیبوس این، ویورا کویس، فوگیات آ، تلوس.",
      ),
    ],
    credits: [
      loc("Exhibition Design by Henge", "طراحی نمایشگاه توسط هنج"),
      loc(
        "Venue: Ospedale Militare di Baggio, Milan",
        "محل برگزاری: Ospedale Militare di Baggio، میلان",
      ),
      loc(
        "Every element—every finish, proportion, and glow",
        "هر عنصر، هر پرداخت، نسبت و درخشش",
      ),
    ],
    portfolioImages: [
      "https://picsum.photos/seed/vocla-2026-1/1600/1000",
      "https://picsum.photos/seed/vocla-2026-2/1600/1000",
      "https://picsum.photos/seed/vocla-2026-3/1600/1000",
      "https://picsum.photos/seed/vocla-2026-4/1600/1000",
      "https://picsum.photos/seed/vocla-2026-5/1600/1000",
      "https://picsum.photos/seed/vocla-2026-6/1600/1000",
      "https://picsum.photos/seed/vocla-2026-7/1600/1000",
    ],
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
      "حضور هنج در پکن که صنعتگری طراحی ایتالیایی را به چن می‌آورد.",
    ),
    paragraph: loc(
      "Every element—every finish, proportion, and glow—has been orchestrated to create a Beijing setting that feels both composed and alive. At the heart of the showroom, envisioned as its luminous centerpiece, stands the Oneon kitchen island in Ice Onyx.",
      "هر عنصر، هر پرداخت، نسبت و درخشش، به گونه‌ای ترکیب شده‌اند تا فضایی پکنی بسازند که هم آراسته و هم زنده به نظر برسد. در قلب این سالن، به عنوان مرکز درخشان آن، جزیره آشپزخانه Oneon در Ice Onyx قرار دارد.",
    ),
    moreDescription: [
      loc(
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
        "سد یوت پرسپیکیاتیس اوند اومنیس ایسته ناتوس ارور سیت ولوپتاتهم آکوسانتیوم دولورمکه لائودانتیوم، توتام رم آپریام، ایکوئه ایپسا کوئه اب ایلو اینونتوره وریتاتیس ات کواسی آرکیتوکتو بئاتائه ویتائه دیکتا سونت اکسپلیکابو.",
      ),
      loc(
        "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum.",
        "نمو انیم ایپسام ولوپتاتهم کویا ولوپتاس سیت آسپرناتور اوت ادیت اوت فوگیت، سد کویا کانسکوئونتور ماگنی دولورس اوس کوئی راسیونه ولوپتاتهم سکوئی نسکیونت. نکوئه پورو کویسکوام است، کوئی دولورم ایپسوم.",
      ),
    ],
    credits: [
      loc("Concept & Design by Henge", "ایده و طراحی توسط هنج"),
      loc("Photography by Henge Studio", "عکاسی توسط استودیو هنج"),
      loc(
        "Every element—every finish, proportion, and glow",
        "هر عنصر، هر پرداخت، نسبت و درخشش",
      ),
    ],
    portfolioImages: [
      "https://picsum.photos/seed/henge-beijing-1/1600/1000",
      "https://picsum.photos/seed/henge-beijing-2/1600/1000",
      "https://picsum.photos/seed/henge-beijing-3/1600/1000",
      "https://picsum.photos/seed/henge-beijing-4/1600/1000",
      "https://picsum.photos/seed/henge-beijing-5/1600/1000",
      "https://picsum.photos/seed/henge-beijing-6/1600/1000",
      "https://picsum.photos/seed/henge-beijing-7/1600/1000",
    ],
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
