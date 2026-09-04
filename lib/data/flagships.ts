import { loc, type Localized } from "@/lib/i18n/localized";

export interface Flagship {
  name: Localized;
  slug: string;
  city: Localized;
  image: string;
}

export const flagships: Flagship[] = [
  {
    name: loc("Henge Milan", "هنژ میلان"),
    slug: "henge-milan",
    city: loc("Milan", "میلان"),
    image: "https://picsum.photos/seed/henge-milan/900/1000",
  },
  {
    name: loc("Henge London", "هنژ لندن"),
    slug: "henge-london",
    city: loc("London", "لندن"),
    image: "https://picsum.photos/seed/henge-london/900/1000",
  },
  {
    name: loc("Henge Paris", "هنژ پاریس"),
    slug: "henge-paris",
    city: loc("Paris", "پاریس"),
    image: "https://picsum.photos/seed/henge-paris/900/1000",
  },
  {
    name: loc("Henge Düsseldorf", "هنژ دوسلدورف"),
    slug: "henge-dusseldorf",
    city: loc("Düsseldorf", "دوسلدورف"),
    image: "https://picsum.photos/seed/henge-dusseldorf/900/1000",
  },
  {
    name: loc("Henge New York", "هنژ نیو یورک"),
    slug: "henge-new-york",
    city: loc("New York", "نیو یورک"),
    image: "https://picsum.photos/seed/henge-new-york/900/1000",
  },
  {
    name: loc("Henge Miami", "هنژ میامی"),
    slug: "henge-miami",
    city: loc("Miami", "میامی"),
    image: "https://picsum.photos/seed/henge-miami/900/1000",
  },
  {
    name: loc("Henge Dubai", "هنژ دبی"),
    slug: "henge-dubai",
    city: loc("Dubai", "دبی"),
    image: "https://picsum.photos/seed/henge-dubai/900/1000",
  },
  {
    name: loc("Henge Riyadh", "هنژ ریاض"),
    slug: "henge-riyadh",
    city: loc("Riyadh", "ریاض"),
    image: "https://picsum.photos/seed/henge-riyadh/900/1000",
  },
  {
    name: loc("Henge Tehran", "هنژ تهران"),
    slug: "henge-tehran",
    city: loc("Tehran", "تهران"),
    image: "https://picsum.photos/seed/henge-tehran/900/1000",
  },
  {
    name: loc("Henge Shenzhen", "هنژ شنژن"),
    slug: "henge-shenzhen",
    city: loc("Shenzhen", "شنژن"),
    image: "https://picsum.photos/seed/henge-shenzhen/900/1000",
  },
  {
    name: loc("Henge Venice", "هنژ ونیز"),
    slug: "henge-venice",
    city: loc("Venice", "ونیز"),
    image: "https://picsum.photos/seed/henge-venice/900/1000",
  },
  {
    name: loc("Henge Cortina", "هنژ کورتینا"),
    slug: "henge-cortina",
    city: loc("Cortina d'Ampezzo", "کورتینا دامپتزو"),
    image: "https://picsum.photos/seed/henge-cortina/900/1000",
  },
];

export function getFlagship(slug: string): Flagship | undefined {
  return flagships.find((f) => f.slug === slug);
}

// --- Detail content for /flagship/[slug] ----------------------------
//
// Additive on top of the summary list above — `flagships` and
// `getFlagship` are untouched. Keyed by the same `slug` values, but
// only flagships whose detail page is actually built out need an entry
// here. A flagship can exist in the summary list (shows up as a card)
// without an entry here (its detail page just isn't built yet).

export interface FlagshipDetail {
  heroImage: string;
  heading: Localized;
  description: Localized;
  info: {
    name: Localized;
    addressLines: (Localized | string)[];
    hours: { label: Localized; value: string }[];
    appointmentNote: Localized;
    phone: string;
    email: string;
  };
  video: {
    thumbnail: string;
    url: string;
  };
  gallery: string[];
}

export const flagshipDetails: Record<string, FlagshipDetail> = {
  "henge-milan": {
    // Confirmed real asset — pulled from the live page's og:image.
    heroImage: "https://picsum.photos/seed/henge-milan-hero/1600/900",
    heading: loc("Henge's new Home - S34", "خانه جدید هنژ - اس ۳۴"),
    // Confirmed via the live page's meta description.
    description: loc(
      "Henge has moved its Home and has created a whole new space, in the center of Milan's Quadrilatero della Moda, Via Della Spiga 34. The new Home, called S34, is able to express with full force what, through evolution, consistent curiosity, and experimentation, Henge needs to say, in order to keep breaking the rules and being wonderfully divergent. S34 allows you to immerse yourself and delve into the personality and creative eclecticism that has been a hallmark of Henge's journey over the years. An augmented surface that merges architecture and products in one place. Three levels of light, shape, matter, and function to explore.",
      "هنژ خانه خود را تغییر داده و فضایی کاملاً نو در مرکز محله‌ی کوادرلاترو دِلا مودا میلان، در ویا دِلا اسپیگا ۳۴، خلق کرده است. خانه‌ی جدید که اس ۳۴ نام دارد، می‌تواند با تمام قدرت آنچه را هنژ از طریق تکامل، کنجکاوی پایدار و آزمون‌وخطا لازم است بگوید، بیان کند تا همچنان قواعد را بشکند و به‌شکلی شگفت‌انگیز متمایز بماند. اس ۳۴ به شما امکان می‌دهد در شخصیت و التقاط خلاقانه‌ای غوطه‌ور شوید که در طول سال‌ها ویژگی بارز مسیر هنژ بوده است. سطحی افزوده که معماری و محصولات را در یک مکان در هم می‌آمیزد؛ سه سطح از نور، فرم، ماده و کارکرد برای کاوش.",
    ),
    info: {
      name: loc("S-34", "اس-۳۴"),
      addressLines: [
        "Via della Spiga, 34",
        "20121, Milano MI",
        loc("Italy", "ایتالیا"),
      ],
      hours: [
        { label: loc("Monday – Friday:", "دوشنبه – جمعه:"), value: "09.30 – 13.30 / 14.30 – 18.30" },
        { label: loc("Saturday:", "شنبه:"), value: "10.00 / 14.00" },
      ],
      appointmentNote: loc(
        "Appointment preferred:",
        "تعیین وقت قبلی ترجیح داده می‌شود:",
      ),
      phone: "+39 327 812 7661",
      email: "sales@henge07.com",
    },
    video: {
      // Placeholder — no confirmed video URL/thumbnail available.
      thumbnail: "https://picsum.photos/seed/henge-milan-video/1200/675",
      url: "#",
    },
    // Placeholders — swap for the real gallery set.
    gallery: [
      "https://picsum.photos/seed/henge-milan-g1/900/900",
      "https://picsum.photos/seed/henge-milan-g2/900/900",
      "https://picsum.photos/seed/henge-milan-g3/900/900",
      "https://picsum.photos/seed/henge-milan-g4/900/900",
      "https://picsum.photos/seed/henge-milan-g5/900/900",
      "https://picsum.photos/seed/henge-milan-g6/900/900",
    ],
  },
};

export function getFlagshipDetail(slug: string): FlagshipDetail | undefined {
  return flagshipDetails[slug];
}

// Convenience type for components that just want "everything about this
// flagship" without juggling two lookups themselves.
export type FlagshipWithDetail = Flagship & FlagshipDetail;
