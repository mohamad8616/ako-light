import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const accessories: ProductCategory = {
  id: "accessories",
  name: loc("Accessories", "لوازم جانبی"),
  slug: "accessories",
  i18nKey: "products.accessories",
  products: [
    {
      id: "mirror",
      name: loc("Mirror", "آینه"),
      slug: "mirror",
      images: [
        "https://picsum.photos/seed/accessories-mirror-1/700/525",
        "https://picsum.photos/seed/accessories-mirror-2/700/525",
        "https://picsum.photos/seed/accessories-mirror-3/700/525",
        "https://picsum.photos/seed/accessories-mirror-4/700/525",
        "https://picsum.photos/seed/accessories-mirror-5/700/525",
        "https://picsum.photos/seed/accessories-mirror-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/accessories-mirror-hover/700/525",
      price: 320,
      store: { existsInStore: true, quantity: 12 },
      category: "accessories",
      categoryLabel: loc("Accessories", "لوازم جانبی"),
      heroImage: "https://picsum.photos/seed/accessories-mirror/1200/900",
      description: loc(
        "Discover the Mirror collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون آینه را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "vase",
      name: loc("Vase", "گلدان"),
      slug: "vase",
      images: [
        "https://picsum.photos/seed/accessories-vase-1/700/525",
        "https://picsum.photos/seed/accessories-vase-2/700/525",
        "https://picsum.photos/seed/accessories-vase-3/700/525",
        "https://picsum.photos/seed/accessories-vase-4/700/525",
        "https://picsum.photos/seed/accessories-vase-5/700/525",
        "https://picsum.photos/seed/accessories-vase-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/accessories-vase-hover/700/525",
      price: 150,
      store: { existsInStore: true, quantity: 22 },
      category: "accessories",
      categoryLabel: loc("Accessories", "لوازم جانبی"),
      heroImage: "https://picsum.photos/seed/accessories-vase/1200/900",
      description: loc(
        "Discover the Vase collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون گلدان را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "sculpture",
      name: loc("Sculpture", "مجسمه"),
      slug: "sculpture",
      images: [
        "https://picsum.photos/seed/accessories-sculpture-1/700/525",
        "https://picsum.photos/seed/accessories-sculpture-2/700/525",
        "https://picsum.photos/seed/accessories-sculpture-3/700/525",
        "https://picsum.photos/seed/accessories-sculpture-4/700/525",
        "https://picsum.photos/seed/accessories-sculpture-5/700/525",
        "https://picsum.photos/seed/accessories-sculpture-6/700/525",
      ],
      hoverImage:
        "https://picsum.photos/seed/accessories-sculpture-hover/700/525",
      price: 480,
      store: { existsInStore: true, quantity: 7 },
      category: "accessories",
      categoryLabel: loc("Accessories", "لوازم جانبی"),
      heroImage: "https://picsum.photos/seed/accessories-sculpture/1200/900",
      description: loc(
        "Discover the Sculpture collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون مجسمه را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
