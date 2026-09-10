import { loc } from "@/lib/i18n/localized";
import { commonDownloads } from "./commonDownloads";
import type { ProductCategory } from "./types";

export const sofasAndArmchairs: ProductCategory = {
  id: "sofas-and-armchairs",
  name: loc("Sofas And Armchairs", "مبل و صندلی راحتی"),
  slug: "sofas-and-armchairs",
  i18nKey: "products.sofasAndArmchairs",
  products: [
    {
      id: "modular-sofa",
      name: loc("Modular Sofa", "مبل ماژولار"),
      slug: "modular-sofa",
      images: [
        "https://picsum.photos/seed/sofas-modular-1/700/525",
        "https://picsum.photos/seed/sofas-modular-2/700/525",
        "https://picsum.photos/seed/sofas-modular-3/700/525",
        "https://picsum.photos/seed/sofas-modular-4/700/525",
        "https://picsum.photos/seed/sofas-modular-5/700/525",
        "https://picsum.photos/seed/sofas-modular-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/sofas-modular-hover/700/525",
      price: 3200,
      store: { existsInStore: true, quantity: 4 },
      category: "sofas-and-armchairs",
      categoryLabel: loc("Sofas And Armchairs", "مبل و صندلی راحتی"),
      heroImage: "https://picsum.photos/seed/sofas-modular/1200/900",
      description: loc(
        "Discover the Modular Sofa collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون مبل ماژولار را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "armchair",
      name: loc("Armchair", "صندلی راحتی"),
      slug: "armchair",
      images: [
        "https://picsum.photos/seed/sofas-armchair-1/700/525",
        "https://picsum.photos/seed/sofas-armchair-2/700/525",
        "https://picsum.photos/seed/sofas-armchair-3/700/525",
        "https://picsum.photos/seed/sofas-armchair-4/700/525",
        "https://picsum.photos/seed/sofas-armchair-5/700/525",
        "https://picsum.photos/seed/sofas-armchair-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/sofas-armchair-hover/700/525",
      price: 1100,
      store: { existsInStore: true, quantity: 9 },
      category: "sofas-and-armchairs",
      categoryLabel: loc("Sofas And Armchairs", "مبل و صندلی راحتی"),
      heroImage: "https://picsum.photos/seed/sofas-armchair/1200/900",
      description: loc(
        "Discover the Armchair collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون صندلی راحتی را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
      id: "loveseat",
      name: loc("Loveseat", "مبل دو نفره"),
      slug: "loveseat",
      images: [
        "https://picsum.photos/seed/sofas-loveseat-1/700/525",
        "https://picsum.photos/seed/sofas-loveseat-2/700/525",
        "https://picsum.photos/seed/sofas-loveseat-3/700/525",
        "https://picsum.photos/seed/sofas-loveseat-4/700/525",
        "https://picsum.photos/seed/sofas-loveseat-5/700/525",
        "https://picsum.photos/seed/sofas-loveseat-6/700/525",
      ],
      hoverImage: "https://picsum.photos/seed/sofas-loveseat-hover/700/525",
      price: 1800,
      store: { existsInStore: true, quantity: 6 },
      category: "sofas-and-armchairs",
      categoryLabel: loc("Sofas And Armchairs", "مبل و صندلی راحتی"),
      heroImage: "https://picsum.photos/seed/sofas-loveseat/1200/900",
      description: loc(
        "Discover the Loveseat collection by Home Form. Sculptural lighting crafted with exceptional materials and attention to detail.",
        "کلکسیون مبل دو نفره را کشف کنید — نورپردازی مجسمه‌وار که با متریال‌های استثنایی و توجه به جزئیات ساخته شده است.",
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
