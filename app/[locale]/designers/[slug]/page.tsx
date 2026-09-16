import DesignerBio from "@/components/designers/designer/DesignerBio";
import DesignerHeader from "@/components/designers/designer/DesignerHeader";
import { getDesigner, getDesigners } from "@/lib/repositories/designers";
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

export async function generateStaticParams() {
  const allDesigners = await getDesigners();
  return allDesigners.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const designer = await getDesigner(slug);

  if (!designer) notFound();

  const lang = resolveLocale(locale);
  const t = translations[lang];

  const title = t["page.designer.title"].replace("{name}", pick(designer.name, lang));
  const description = trimDescription(pick(designer.bio[0], lang));
  const url = absoluteUrl(`/designers/${slug}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const designersLabel = t["page.designers.title"];

  const jsonLdData = [
    personJsonLd({
      name: pick(designer.name, lang),
      description,
      url,
      image: designer.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: designersLabel, path: "/designers" },
        { name: pick(designer.name, lang), path: `/designers/${slug}` },
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
  const designer = await getDesigner(slug);

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
      name: pick(designer.name, lang),
      description,
      url,
      image: designer.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: designersLabel, path: "/designers" },
        { name: pick(designer.name, lang), path: `/designers/${slug}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="w-full mt-24 lg:mt-48">
        <DesignerHeader name={pick(designer.name, lang)} />
        <DesignerBio
          name={pick(designer.name, lang)}
          image={designer.image}
          bio={designer.bio}
          website={designer.website}
        />
      </main>
    </>
  );
}
