import type { DownloadLink } from "./types";
import { loc } from "@/lib/i18n/localized";

// Shared download links - used across all products
export const commonDownloads: DownloadLink[] = [
  { label: loc("Product sheet", "برگه محصول"), href: "#" },
  { label: loc("Product images", "تصاویر محصول"), href: "#" },
  { label: loc("2D/3D files", "فایل‌های ۲D/۳D"), href: "#" },
];
