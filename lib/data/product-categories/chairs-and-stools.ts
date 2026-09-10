import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const chairsAndStools: ProductCategory = {
  id: "chairs-and-stools",
  name: loc("Chairs And Stools", "صندلی و چهارپایه"),
  slug: "chairs-and-stools",
  i18nKey: "products.chairsAndStools",
  products: [
    {
      id: "dining-chair",
      name: loc("Dining Chair", "صندلی ناهارخوری"),
      slug: "dining-chair",
      images: [
        "https://picsum.photos/seed/chairs-dining-1/700/525",
        "https://picsum.photos/seed/chairs-dining-2/700/525",
        "https://picsum.photos/seed/chairs-dining-3/700/525",
        "https://picsum.photos/seed/chairs-dining-4/700/525",
        "https://picsum.photos/seed/chairs-dining-5/700/525",
        "https://picsum.photos/seed/chairs-dining-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/chairs-dining-hover/700/525",
      price: 350,
      store: { existsInStore: true, quantity: 18 },
      category: "chairs-and-stools",
      categoryLabel: loc("Chairs And Stools", "صندلی و چهارپایه"),
      heroImage: "https://picsum.photos/seed/chairs-dining/1200/900",
      description: loc(
        "Discover the Dining Chair collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون صندلی ناهارخوری را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "stool",
      name: loc("Stool", "چهارپایه"),
      slug: "stool",
      images: [
        "https://picsum.photos/seed/chairs-stool-1/700/525",
        "https://picsum.photos/seed/chairs-stool-2/700/525",
        "https://picsum.photos/seed/chairs-stool-3/700/525",
        "https://picsum.photos/seed/chairs-stool-4/700/525",
        "https://picsum.photos/seed/chairs-stool-5/700/525",
        "https://picsum.photos/seed/chairs-stool-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/chairs-stool-hover/700/525",
      price: 280,
      store: { existsInStore: true, quantity: 14 },
      category: "chairs-and-stools",
      categoryLabel: loc("Chairs And Stools", "صندلی و چهارپایه"),
      heroImage: "https://picsum.photos/seed/chairs-stool/1200/900",
      description: loc(
        "Discover the Stool collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون چهارپایه را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
