"use client";

import { usePathname } from "next/navigation";
import NewsletterSection from "@/components/footer/newsLetterSection";

export default function NewsletterSectionWrapper() {
  const pathname = usePathname();
  const isFlagshipDetailPage =
    pathname?.startsWith("/flagship/") && pathname.split("/").length === 3;

  if (isFlagshipDetailPage) return null;
  return <NewsletterSection />;
}
