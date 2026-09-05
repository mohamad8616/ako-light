import DesignerBio from "@/components/designers/designer/DesignerBio";
import DesignerHeader from "@/components/designers/designer/DesignerHeader";
import { designers } from "@/lib/data/designers";
import { pick } from "@/lib/i18n/localized";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return designers.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const designer = designers.find((d) => d.slug === slug);

  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  if (!designer) {
    return {
      title: t["page.designers.title"],
      description: t["page.designers.description"],
    };
  }

  const name = pick(designer.name, lang);

  return {
    title: t["page.designer.title"].replace("{name}", name),
    description: t["page.designer.description"].replace("{name}", name),
  };
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
