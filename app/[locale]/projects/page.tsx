import ProjectssList from "@/components/projects/ProjectList";
import ProjectsHeader from "@/components/projects/ProjectsHeader";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import { absoluteUrl, webPageJsonLd } from "@/lib/seo/structuredData";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.projects.title"],
      t["page.projects.description"],
      absoluteUrl("/projects", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/projects",
    title: t["page.projects.title"],
    description: t["page.projects.description"],
    jsonLd: jsonLdData,
  });
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.projects.title"],
      t["page.projects.description"],
      absoluteUrl("/projects", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="bg-background w-full">
        <ProjectsHeader />
        <ProjectssList />
      </main>
    </>
  );
}
