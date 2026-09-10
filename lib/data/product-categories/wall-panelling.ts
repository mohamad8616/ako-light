import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const wallPanelling: ProductCategory = {
  id: "wall-panelling",
  name: loc("Wall Panelling", "پانل دیواری"),
  slug: "wall-panelling",
  i18nKey: "products.wallPanelling",
  products: [
    {
      id: "wood-panel",
      name: loc("Wood Panel", "پانل چوبی"),
      slug: "wood-panel",
      images: [
        "https://picsum.photos/seed/wall-wood-1/700/525",
        "https://picsum.photos/seed/wall-wood-2/700/525",
        "https://picsum.photos/seed/wall-wood-3/700/525",
        "https://picsum.photos/seed/wall-wood-4/700/525",
        "https://picsum.photos/seed/wall-wood-5/700/525",
        "https://picsum.photos/seed/wall-wood-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/wall-wood-hover/700/525",
      price: 180,
      store: { existsInStore: true, quantity: 25 },
      category: "wall-panelling",
      categoryLabel: loc("Wall Panelling", "پانل دیواری"),
      heroImage: "https://picsum.photos/seed/wall-wood/1200/900",
      description: loc(
        "Discover the Wood Panel collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون پانل چوبی را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "metal-panel",
      name: loc("Metal Panel", "پانل فلزی"),
      slug: "metal-panel",
      images: [
        "https://picsum.photos/seed/wall-metal-1/700/525",
        "https://picsum.photos/seed/wall-metal-2/700/525",
        "https://picsum.photos/seed/wall-metal-3/700/525",
        "https://picsum.photos/seed/wall-metal-4/700/525",
        "https://picsum.photos/seed/wall-metal-5/700/525",
        "https://picsum.photos/seed/wall-metal-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/wall-metal-hover/700/525",
      price: 220,
      store: { existsInStore: true, quantity: 18 },
      category: "wall-panelling",
      categoryLabel: loc("Wall Panelling", "پانل دیواری"),
      heroImage: "https://picsum.photos/seed/wall-metal/1200/900",
      description: loc(
        "Discover the Metal Panel collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون پانل فلزی را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
