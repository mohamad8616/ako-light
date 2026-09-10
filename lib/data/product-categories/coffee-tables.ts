import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const coffeeTables: ProductCategory = {
  id: "coffee-tables",
  name: loc("Coffee Tables", "میزهای قهوه‌خوری"),
  slug: "coffee-tables",
  i18nKey: "products.coffeeTables",
  products: [
    {
      id: "low-table",
      name: loc("Low Table", "میز پست"),
      slug: "low-table",
      images: [
        "https://picsum.photos/seed/coffee-low-1/700/525",
        "https://picsum.photos/seed/coffee-low-2/700/525",
        "https://picsum.photos/seed/coffee-low-3/700/525",
        "https://picsum.photos/seed/coffee-low-4/700/525",
        "https://picsum.photos/seed/coffee-low-5/700/525",
        "https://picsum.photos/seed/coffee-low-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/coffee-low-hover/700/525",
      price: 900,
      store: { existsInStore: true, quantity: 10 },
      category: "coffee-tables",
      categoryLabel: loc("Coffee Tables", "میزهای قهوه‌خوری"),
      heroImage: "https://picsum.photos/seed/coffee-low/1200/900",
      description: loc(
        "Discover the Low Table collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون میز پست را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "marble-top",
      name: loc("Marble Top", "رویه مرمر"),
      slug: "marble-top",
      images: [
        "https://picsum.photos/seed/coffee-marble-1/700/525",
        "https://picsum.photos/seed/coffee-marble-2/700/525",
        "https://picsum.photos/seed/coffee-marble-3/700/525",
        "https://picsum.photos/seed/coffee-marble-4/700/525",
        "https://picsum.photos/seed/coffee-marble-5/700/525",
        "https://picsum.photos/seed/coffee-marble-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/coffee-marble-hover/700/525",
      price: 1400,
      store: { existsInStore: true, quantity: 5 },
      category: "coffee-tables",
      categoryLabel: loc("Coffee Tables", "میزهای قهوه‌خوری"),
      heroImage: "https://picsum.photos/seed/coffee-marble/1200/900",
      description: loc(
        "Discover the Marble Top collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون رویه مرمر را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
