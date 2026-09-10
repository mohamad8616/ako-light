import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const kitchens: ProductCategory = {
  id: "kitchens",
  name: loc("Kitchens", "آشپزخانه"),
  slug: "kitchens",
  i18nKey: "products.kitchens",
  products: [
    {
      id: "modern-kitchen",
      name: loc("Modern Kitchen", "آشپزخانه مدرن"),
      slug: "modern-kitchen",
      images: [
        "https://picsum.photos/seed/kitchens-modern-1/700/525",
        "https://picsum.photos/seed/kitchens-modern-2/700/525",
        "https://picsum.photos/seed/kitchens-modern-3/700/525",
        "https://picsum.photos/seed/kitchens-modern-4/700/525",
        "https://picsum.photos/seed/kitchens-modern-5/700/525",
        "https://picsum.photos/seed/kitchens-modern-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/kitchens-modern-hover/700/525",
      price: 8500,
      store: { existsInStore: true, quantity: 1 },
      category: "kitchens",
      categoryLabel: loc("Kitchens", "آشپزخانه"),
      heroImage: "https://picsum.photos/seed/kitchens-modern/1200/900",
      description: loc(
        "Discover the Modern Kitchen collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون آشپزخانه مدرن را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "minimal-kitchen",
      name: loc("Minimal Kitchen", "آشپزخانه مینیمال"),
      slug: "minimal-kitchen",
      images: [
        "https://picsum.photos/seed/kitchens-minimal-1/700/525",
        "https://picsum.photos/seed/kitchens-minimal-2/700/525",
        "https://picsum.photos/seed/kitchens-minimal-3/700/525",
        "https://picsum.photos/seed/kitchens-minimal-4/700/525",
        "https://picsum.photos/seed/kitchens-minimal-5/700/525",
        "https://picsum.photos/seed/kitchens-minimal-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/kitchens-minimal-hover/700/525",
      price: 9200,
      store: { existsInStore: true, quantity: 1 },
      category: "kitchens",
      categoryLabel: loc("Kitchens", "آشپزخانه"),
      heroImage: "https://picsum.photos/seed/kitchens-minimal/1200/900",
      description: loc(
        "Discover the Minimal Kitchen collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون آشپزخانه مینیمال را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
