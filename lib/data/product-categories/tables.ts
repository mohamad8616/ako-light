import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const tables: ProductCategory = {
  id: "tables",
  name: loc("Tables", "میزها"),
  slug: "tables",
  i18nKey: "products.tables",
  products: [
    {
      id: "dining-table",
      name: loc("Dining Table", "میز ناهارخوری"),
      slug: "dining-table",
      images: [
        "https://picsum.photos/seed/tables-dining-1/700/525",
        "https://picsum.photos/seed/tables-dining-2/700/525",
        "https://picsum.photos/seed/tables-dining-3/700/525",
        "https://picsum.photos/seed/tables-dining-4/700/525",
        "https://picsum.photos/seed/tables-dining-5/700/525",
        "https://picsum.photos/seed/tables-dining-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/tables-dining-hover/700/525",
      price: 2200,
      store: { existsInStore: true, quantity: 6 },
      category: "tables",
      categoryLabel: loc("Tables", "میزها"),
      heroImage: "https://picsum.photos/seed/tables-dining/1200/900",
      description: loc(
        "Discover the Dining Table collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون میز ناهارخوری را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "conference-table",
      name: loc("Conference Table", "میز کنفرانس"),
      slug: "conference-table",
      images: [
        "https://picsum.photos/seed/tables-conference-1/700/525",
        "https://picsum.photos/seed/tables-conference-2/700/525",
        "https://picsum.photos/seed/tables-conference-3/700/525",
        "https://picsum.photos/seed/tables-conference-4/700/525",
        "https://picsum.photos/seed/tables-conference-5/700/525",
        "https://picsum.photos/seed/tables-conference-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/tables-conference-hover/700/525",
      price: 3500,
      store: { existsInStore: true, quantity: 2 },
      category: "tables",
      categoryLabel: loc("Tables", "میزها"),
      heroImage: "https://picsum.photos/seed/tables-conference/1200/900",
      description: loc(
        "Discover the Conference Table collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون میز کنفرانس را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "console-table",
      name: loc("Console Table", "میز کنسول"),
      slug: "console-table",
      images: [
        "https://picsum.photos/seed/tables-console-1/700/525",
        "https://picsum.photos/seed/tables-console-2/700/525",
        "https://picsum.photos/seed/tables-console-3/700/525",
        "https://picsum.photos/seed/tables-console-4/700/525",
        "https://picsum.photos/seed/tables-console-5/700/525",
        "https://picsum.photos/seed/tables-console-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/tables-console-hover/700/525",
      price: 1200,
      store: { existsInStore: true, quantity: 8 },
      category: "tables",
      categoryLabel: loc("Tables", "میزها"),
      heroImage: "https://picsum.photos/seed/tables-console/1200/900",
      description: loc(
        "Discover the Console Table collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون میز کنسول را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
