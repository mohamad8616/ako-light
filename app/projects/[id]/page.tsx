import ProjectFullImageSection from "@/components/projects/project/ProjectFullImageSection";
import ProjectInfoSection from "@/components/projects/project/ProjectInfoSection";
import ProjectTextImageSection from "@/components/projects/project/ProjectTextImageSection";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import { getProjectById } from "@/lib/data/projects";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { pick } from "@/lib/i18n/localized";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: PageProps) => {
  const { id } = await params;
  const project = getProjectById(id);

  if (!project) return notFound();

  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const name = pick(project.name, lang);
  const moreDescription0 = pick(project.moreDescription[0], lang);
  const moreDescription1 = pick(project.moreDescription[1], lang);

  return (
    <main>
      <PictureHero image={project.image} name={name} />
      <ProjectInfoSection project={project} />
      <div className="bg-background text-background-secondary min-h-screen w-full">
        <ImageGalleryCarousel
          mobileColumn={true}
          multiWidth={true}
          circle={true}
          images={project.portfolioImages}
        />
        <ProjectTextImageSection
          image={project.portfolioImages[0]}
          text={moreDescription0}
        />
        <ProjectFullImageSection image={project.portfolioImages[1]} caption={moreDescription1} />
      </div>
    </main>
  );
};

export default page;
