export interface Flagship {
  name: string;
  slug: string;
  city: string;
  image: string;
}

export const flagships: Flagship[] = [
  {
    name: "Henge Milan",
    slug: "henge-milan",
    city: "Milan",
    image: "https://picsum.photos/seed/henge-milan/900/1000",
  },
  {
    name: "Henge London",
    slug: "henge-london",
    city: "London",
    image: "https://picsum.photos/seed/henge-london/900/1000",
  },
  {
    name: "Henge Paris",
    slug: "henge-paris",
    city: "Paris",
    image: "https://picsum.photos/seed/henge-paris/900/1000",
  },
  {
    name: "Henge Düsseldorf",
    slug: "henge-dusseldorf",
    city: "Düsseldorf",
    image: "https://picsum.photos/seed/henge-dusseldorf/900/1000",
  },
  {
    name: "Henge New York",
    slug: "henge-new-york",
    city: "New York",
    image: "https://picsum.photos/seed/henge-new-york/900/1000",
  },
  {
    name: "Henge Miami",
    slug: "henge-miami",
    city: "Miami",
    image: "https://picsum.photos/seed/henge-miami/900/1000",
  },
  {
    name: "Henge Dubai",
    slug: "henge-dubai",
    city: "Dubai",
    image: "https://picsum.photos/seed/henge-dubai/900/1000",
  },
  {
    name: "Henge Riyadh",
    slug: "henge-riyadh",
    city: "Riyadh",
    image: "https://picsum.photos/seed/henge-riyadh/900/1000",
  },
  {
    name: "Henge Tehran",
    slug: "henge-tehran",
    city: "Tehran",
    image: "https://picsum.photos/seed/henge-tehran/900/1000",
  },
  {
    name: "Henge Shenzhen",
    slug: "henge-shenzhen",
    city: "Shenzhen",
    image: "https://picsum.photos/seed/henge-shenzhen/900/1000",
  },
  {
    name: "Henge Venice",
    slug: "henge-venice",
    city: "Venice",
    image: "https://picsum.photos/seed/henge-venice/900/1000",
  },
  {
    name: "Henge Cortina",
    slug: "henge-cortina",
    city: "Cortina d'Ampezzo",
    image: "https://picsum.photos/seed/henge-cortina/900/1000",
  },
];

export function getFlagship(slug: string): Flagship | undefined {
  return flagships.find((f) => f.slug === slug);
}

// --- Detail content for /showroom/[slug] -----------------------------
//
// Additive on top of the summary list above — `flagships` and
// `getFlagship` are untouched. Keyed by the same `slug` values, but
// only flagships whose detail page is actually built out need an entry
// here. A flagship can exist in the summary list (shows up as a card)
// without an entry here (its detail page just isn't built yet).

export interface FlagshipDetail {
  heroImage: string;
  heading: string;
  description: string;
  info: {
    name: string;
    addressLines: string[];
    hours: { label: string; value: string }[];
    appointmentNote: string;
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
    heroImage:
      "https://www.henge07.com/app/uploads/2024/03/Henge-Spiga-47-Colori-CQ-1.jpg",
    heading: "Henge's new Home - S34",
    // Confirmed via the live page's meta description.
    description:
      "Henge has moved its Home and has created a whole new space, in the center of Milan's Quadrilatero della Moda, Via Della Spiga 34. The new Home, called S34, is able to express with full force what, through evolution, consistent curiosity, and experimentation, Henge needs to say, in order to keep breaking the rules and being wonderfully divergent. S34 allows you to immerse yourself and delve into the personality and creative eclecticism that has been a hallmark of Henge's journey over the years. An augmented surface that merges architecture and products in one place. Three levels of light, shape, matter, and function to explore.",
    info: {
      name: "S-34",
      addressLines: ["Via della Spiga, 34", "20121, Milano MI", "Italy"],
      hours: [
        { label: "Monday – Friday:", value: "09.30 – 13.30 / 14.30 – 18.30" },
        { label: "Saturday:", value: "10.00 / 14.00" },
      ],
      appointmentNote: "Appointment preferred:",
      phone: "+39 327 812 7661",
      email: "sales@henge07.com",
    },
    video: {
      // Placeholder — no confirmed video URL/thumbnail available.
      thumbnail:
        "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_43-1.jpg",
      url: "#",
    },
    // Placeholders — swap for the real gallery set.
    gallery: [
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg",
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_72.jpg",
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_18_B-1.jpg",
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_30-1.jpg",
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_78_B-1.jpg",
      "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_52_C-2.jpg",
    ],
  },
};

export function getFlagshipDetail(slug: string): FlagshipDetail | undefined {
  return flagshipDetails[slug];
}

// Convenience type for components that just want "everything about this
// flagship" without juggling two lookups themselves.
export type FlagshipWithDetail = Flagship & FlagshipDetail;
