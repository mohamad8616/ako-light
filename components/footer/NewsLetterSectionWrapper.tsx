"use client";

import { usePathname } from "next/navigation";
import NewsletterSection from "@/components/footer/newsLetterSection";
import { stripLocalePrefix } from "@/lib/i18n/routing";

export default function NewsletterSectionWrapper() {
  // Compare in canonical (locale-stripped) form so /en/flagship/<slug>
  // behaves exactly like /flagship/<slug>.
  const pathname = stripLocalePrefix(usePathname());
  const isFlagshipDetailPage =
    pathname?.startsWith("/flagship/") && pathname.split("/").length === 3;

  if (isFlagshipDetailPage) return null;
  return <NewsletterSection />;
}
