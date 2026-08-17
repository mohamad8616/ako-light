import DesignerBio from "@/components/designers/designer/DesignerBio";
import DesignerHeader from "@/components/designers/designer/DesignerHeader";
import { designers } from "@/lib/data/designers";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return designers.map((d) => ({ slug: d.slug }));
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const designer = designers.find((d) => d.slug === slug);

  if (!designer) {
    notFound();
  }

  return (
    <main className="w-full bg-background">
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
