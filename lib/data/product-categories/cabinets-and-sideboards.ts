import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const cabinetsAndSideboards: ProductCategory = {
  id: "cabinets-and-sideboards",
  name: loc("Cabinets And Sideboards", "کابینت و سایدبورد"),
  slug: "cabinets-and-sideboards",
  i18nKey: "products.cabinetsAndSideboards",
  products: [
    {
      id: "sideboard-a",
      name: loc("Sideboard A", "سایدبورد A"),
      slug: "sideboard-a",
      images: [
        "https://picsum.photos/seed/cabinets-a-1/700/525",
        "https://picsum.photos/seed/cabinets-a-2/700/525",
        "https://picsum.photos/seed/cabinets-a-3/700/525",
        "https://picsum.photos/seed/cabinets-a-4/700/525",
        "https://picsum.photos/seed/cabinets-a-5/700/525",
        "https://picsum.photos/seed/cabinets-a-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/cabinets-a-hover/700/525",
      price: 1500,
      store: { existsInStore: true, quantity: 3 },
      category: "cabinets-and-sideboards",
      categoryLabel: loc("Cabinets And Sideboards", "کابینت و سایدبورد"),
      heroImage: "https://picsum.photos/seed/cabinets-a/1200/900",
      description: loc(
        "Discover the Sideboard A collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون سایدبورد A را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "sideboard-b",
      name: loc("Sideboard B", "سایدبورد B"),
      slug: "sideboard-b",
      images: [
        "https://picsum.photos/seed/cabinets-b-1/700/525",
        "https://picsum.photos/seed/cabinets-b-2/700/525",
        "https://picsum.photos/seed/cabinets-b-3/700/525",
        "https://picsum.photos/seed/cabinets-b-4/700/525",
        "https://picsum.photos/seed/cabinets-b-5/700/525",
        "https://picsum.photos/seed/cabinets-b-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/cabinets-b-hover/700/525",
      price: 1600,
      store: { existsInStore: true, quantity: 2 },
      category: "cabinets-and-sideboards",
      categoryLabel: loc("Cabinets And Sideboards", "کابینت و سایدبورد"),
      heroImage: "https://picsum.photos/seed/cabinets-b/1200/900",
      description: loc(
        "Discover the Sideboard B collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون سایدبورد B را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "cabinet-c",
      name: loc("Cabinet C", "کابینت C"),
      slug: "cabinet-c",
      images: [
        "https://picsum.photos/seed/cabinets-c-1/700/525",
        "https://picsum.photos/seed/cabinets-c-2/700/525",
        "https://picsum.photos/seed/cabinets-c-3/700/525",
        "https://picsum.photos/seed/cabinets-c-4/700/525",
        "https://picsum.photos/seed/cabinets-c-5/700/525",
        "https://picsum.photos/seed/cabinets-c-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/cabinets-c-hover/700/525",
      price: 1800,
      store: { existsInStore: true, quantity: 4 },
      category: "cabinets-and-sideboards",
      categoryLabel: loc("Cabinets And Sideboards", "کابینت و سایدبورد"),
      heroImage: "https://picsum.photos/seed/cabinets-c/1200/900",
      description: loc(
        "Discover the Cabinet C collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون کابینت C را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
