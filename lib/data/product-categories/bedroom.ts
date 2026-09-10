import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const bedroom: ProductCategory = {
  id: "bedroom",
  name: loc("Bedroom", "اتاق خواب"),
  slug: "bedroom",
  i18nKey: "products.bedroom",
  products: [
    {
      id: "bed-frame",
      name: loc("Bed Frame", "تخت"),
      slug: "bed-frame",
      images: [
        "https://picsum.photos/seed/bedroom-bed-1/700/525",
        "https://picsum.photos/seed/bedroom-bed-2/700/525",
        "https://picsum.photos/seed/bedroom-bed-3/700/525",
        "https://picsum.photos/seed/bedroom-bed-4/700/525",
        "https://picsum.photos/seed/bedroom-bed-5/700/525",
        "https://picsum.photos/seed/bedroom-bed-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/bedroom-bed-hover/700/525",
      price: 1800,
      store: { existsInStore: true, quantity: 7 },
      category: "bedroom",
      categoryLabel: loc("Bedroom", "اتاق خواب"),
      heroImage: "https://picsum.photos/seed/bedroom-bed/1200/900",
      description: loc(
        "Discover the Bed Frame collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون تخت را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
      ),
      moreInfo: loc(
        "Available in a range of finishes and configurations — contact your Home Form representative for full technical specifications, dimensions, and lead times.",
        "در طیفی از پرداخت‌ها و پیکربندی‌ها موجود است — برای مشخصات فنی کامل، ابعاد و زمان‌های تحویل با نماینده Home Form تماس بگیرید.",
      ),
      downloads: commonDownloads,
      designer: {
        name: loc("Massimo Castagna", "ماسیمو کاستانیا"),
        href: "/designers/massimo-castagna",
      },
      related: [],
    },
    {
      id: "wardrobe",
      name: loc("Wardrobe", "کمد لباس"),
      slug: "wardrobe",
      images: [
        "https://picsum.photos/seed/bedroom-wardrobe-1/700/525",
        "https://picsum.photos/seed/bedroom-wardrobe-2/700/525",
        "https://picsum.photos/seed/bedroom-wardrobe-3/700/525",
        "https://picsum.photos/seed/bedroom-wardrobe-4/700/525",
        "https://picsum.photos/seed/bedroom-wardrobe-5/700/525",
        "https://picsum.photos/seed/bedroom-wardrobe-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/bedroom-wardrobe-hover/700/525",
      price: 2400,
      store: { existsInStore: true, quantity: 3 },
      category: "bedroom",
      categoryLabel: loc("Bedroom", "اتاق خواب"),
      heroImage: "https://picsum.photos/seed/bedroom-wardrobe/1200/900",
      description: loc(
        "Discover the Wardrobe collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون کمد لباس را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
      ),
      moreInfo: loc(
        "Available in a range of finishes and configurations — contact your Home Form representative for full technical specifications, dimensions, and lead times.",
        "در طیفی از پرداخت‌ها و پیکربندی‌ها موجود است — برای مشخصات فنی کامل، ابعاد و زمان‌های تحویل با نماینده Home Form تماس بگیرید.",
      ),
      downloads: commonDownloads,
      designer: {
        name: loc("Massimo Castagna", "ماسیمو کاستانیا"),
        href: "/designers/massimo-castagna",
      },
      related: [],
    },
    {
      id: "nightstand",
      name: loc("Nightstand", "پاتختی"),
      slug: "nightstand",
      images: [
        "https://picsum.photos/seed/bedroom-night-1/700/525",
        "https://picsum.photos/seed/bedroom-night-2/700/525",
        "https://picsum.photos/seed/bedroom-night-3/700/525",
        "https://picsum.photos/seed/bedroom-night-4/700/525",
        "https://picsum.photos/seed/bedroom-night-5/700/525",
        "https://picsum.photos/seed/bedroom-night-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/bedroom-night-hover/700/525",
      price: 650,
      store: { existsInStore: true, quantity: 11 },
      category: "bedroom",
      categoryLabel: loc("Bedroom", "اتاق خواب"),
      heroImage: "https://picsum.photos/seed/bedroom-night/1200/900",
      description: loc(
        "Discover the Nightstand collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون پاتختی را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
      ),
      moreInfo: loc(
        "Available in a range of finishes and configurations — contact your Home Form representative for full technical specifications, dimensions, and lead times.",
        "در طیفی از پرداخت‌ها و پیکربندی‌ها موجود است — برای مشخصات فنی کامل، ابعاد و زمان‌های تحویل با نماینده Home Form تماس بگیرید.",
      ),
      downloads: commonDownloads,
      designer: {
        name: loc("Massimo Castagna", "ماسیمو کاستانیا"),
        href: "/designers/massimo-castagna",
      },
      related: [],
    },
  ],
};
