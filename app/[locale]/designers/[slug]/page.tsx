import DesignerBio from "@/components/designers/designer/DesignerBio";
import DesignerHeader from "@/components/designers/designer/DesignerHeader";
import { designers } from "@/lib/data/designers";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale, trimDescription } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  personJsonLd,
} from "@/lib/seo/structuredData";
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

  const title = t["page.designer.title"].replace("{name}", designer.name);
  const description = trimDescription(pick(designer.bio[0], lang));
  const url = absoluteUrl(`/designers/${slug}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const designersLabel = t["page.designers.title"];

  const jsonLdData = [
    personJsonLd({
      name: designer.name,
      description,
      url,
      image: designer.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: designersLabel, path: "/designers" },
        { name: designer.name, path: `/designers/${slug}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/designers/${slug}`,
    // Designer names are proper nouns — never translated.
    title,
    description,
    image: designer.image,
    jsonLd: jsonLdData,
  });
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const designer = designers.find((d) => d.slug === slug);

  if (!designer) {
    notFound();
  }

  const lang = resolveLocale(locale);
  const t = translations[lang];
  const description = trimDescription(pick(designer.bio[0], lang));
  const url = absoluteUrl(`/designers/${slug}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const designersLabel = t["page.designers.title"];

  const jsonLdData = [
    personJsonLd({
      name: designer.name,
      description,
      url,
      image: designer.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: designersLabel, path: "/designers" },
        { name: designer.name, path: `/designers/${slug}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="w-full">
        <DesignerHeader name={designer.name} />
        <DesignerBio
          name={designer.name}
          image={designer.image}
          bio={designer.bio}
          website={designer.website}
        />
      </main>
    </>
  );
}
