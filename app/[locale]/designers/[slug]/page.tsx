import DesignerBio from "@/components/designers/designer/DesignerBio";
import DesignerHeader from "@/components/designers/designer/DesignerHeader";
import { designers } from "@/lib/data/designers";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale, trimDescription } from "@/lib/seo/metadata";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return designers.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const designer = designers.find((d) => d.slug === slug);

  if (!designer) notFound();

  const lang = resolveLocale(locale);
  const t = translations[lang];

  return buildLocalizedMetadata({
    locale,
    path: `/designers/${slug}`,
    // Designer names are proper nouns — never translated.
    title: t["page.designer.title"].replace("{name}", designer.name),
    description: trimDescription(pick(designer.bio[0], lang)),
    image: designer.image,
  });
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const designer = designers.find((d) => d.slug === slug);

  if (!designer) {
    notFound();
  }

  return (
    <main className="w-full">
      <DesignerHeader name={designer.name} />
      <DesignerBio
        name={designer.name}
        image={designer.image}
        bio={designer.bio}
        website={designer.website}
      />
    </main>
  );
}
