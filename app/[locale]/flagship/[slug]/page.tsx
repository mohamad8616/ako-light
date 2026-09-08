import FlagshipContactSection from "@/components/flagship/flag/FlagshipContactSection";
import FlagshipGallerySection from "@/components/flagship/flag/FlagshipGallerySection";
import FlagshipHero from "@/components/flagship/flag/FlagshipHero";
import FlagshipInfoSection from "@/components/flagship/flag/FlagshipInfoSection";
import FlagshipVideoSection from "@/components/flagship/flag/FlagshipVideoSection";
import FloatingRequestInfoButton from "@/components/flagship/flag/FloatingRequestInfoButton";
import {
  flagshipDetails,
  getFlagship,
  getFlagshipDetail,
} from "@/lib/data/flagships";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  // Only pre-render flagships that actually have detail content built
  // out. A flagship can exist in the summary list (shows a card) without
  // an entry in flagshipDetails yet — it just won't have a page here.
  return Object.keys(flagshipDetails).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const flagship = getFlagship(slug);
  const detail = getFlagshipDetail(slug);
  if (!flagship || !detail) return {};

  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];
  const name = pick(flagship.name, lang);
  const description = pick(detail.description, lang).slice(0, 160);

  return {
    title: t["page.flagship.title"].replace("{name}", name),
    description,
  };
}

export default async function FlagshipPage({ params }: PageProps) {
  const { slug } = await params;
  const flagship = getFlagship(slug);
  const detail = getFlagshipDetail(slug);

  if (!flagship || !detail) notFound();

  // Merge summary (name/slug/city/image) with detail content into the
  // single shape the section components expect.
  const combined = { ...flagship, ...detail };
  console.log(flagship, detail);
  return (
    <main className="bg-stone-950">
      <FlagshipHero flagship={combined} />
      <FlagshipInfoSection flagship={combined} />
      <FlagshipGallerySection flagship={combined} />
      <FlagshipVideoSection flagship={combined} />
      <FlagshipContactSection />
      <FloatingRequestInfoButton />
    </main>
  );
}
