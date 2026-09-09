import ProjectssList from "@/components/projects/ProjectList";
import ProjectsHeader from "@/components/projects/ProjectsHeader";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translations[resolveLocale(locale)];

  return buildLocalizedMetadata({
    locale,
    path: "/projects",
    title: t["page.projects.title"],
    description: t["page.projects.description"],
  });
}

export default function MaterialsPage() {
  return (
    <main className="bg-background w-full">
      <ProjectsHeader />
      <ProjectssList />
      
    </main>
  );
}
