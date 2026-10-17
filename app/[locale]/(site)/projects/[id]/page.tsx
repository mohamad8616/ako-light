import ProductsInCollectionSection from "@/components/collections/collection/ProductsInCollectionSection";
import { groupProductsByCategory } from "@/components/collections/collection/product-groups";
import ProjectFullImageSection from "@/components/projects/project/ProjectFullImageSection";
import ProjectInfoSection from "@/components/projects/project/ProjectInfoSection";
import ProjectTextImageSection from "@/components/projects/project/ProjectTextImageSection";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { getProjectById } from "@/lib/repositories/projects";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  creativeWorkJsonLd,
} from "@/lib/seo/structuredData";
import { redirectIfSlugRenamed } from "@/lib/navigation/slugRedirect";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, locale } = await params;
  const project = await getProjectById(id);

  if (!project) {
    // Renamed slug → permanent redirect to the current URL instead of a 404.
    await redirectIfSlugRenamed("project", id, { locale });
    notFound();
  }

  const lang = resolveLocale(locale);
  const t = translations[lang];
  const name = pick(project.name, lang);
  const description = trimDescription(pick(project.description, lang));
  const url = absoluteUrl(`/projects/${id}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const projectsLabel = t["page.projects.title"];

  const jsonLdData = [
    creativeWorkJsonLd({
      name,
      description,
      url,
      image: project.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: projectsLabel, path: "/projects" },
        { name: name, path: `/projects/${id}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/projects/${id}`,
    // Project names are proper nouns; the layout template adds the brand.
    title: name,
    description,
    image: project.image,
    jsonLd: jsonLdData,
  });
}

/**
 * Group a flat list of products by their `category` slug into the sections
 * `ProductsInCollectionSection` renders. The grouping itself is SHARED with the
 * collection page (components/collections/collection/product-groups.ts); this
 * page only maps its full catalog rows down to the three fields the section
 * reads.
 */

const page = async ({ params }: PageProps) => {
  const { id, locale } = await params;
  const project = await getProjectById(id);

  if (!project) {
    // Renamed slug → permanent redirect to the current URL instead of a 404.
    await redirectIfSlugRenamed("project", id, { locale });
    return notFound();
  }

  const lang = resolveLocale(locale);
  const t = translations[lang];
  const name = pick(project.name, lang);
  const description = trimDescription(pick(project.description, lang));
  const url = absoluteUrl(`/projects/${id}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const projectsLabel = t["page.projects.title"];

  const jsonLdData = [
    creativeWorkJsonLd({
      name,
      description,
      url,
      image: project.image,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: projectsLabel, path: "/projects" },
        { name: name, path: `/projects/${id}` },
      ],
      lang,
    ),
  ];

  const groupedCategories = await groupProductsByCategory(
    project.productsUsed,
    (product) => ({
      name: product.name,
      slug: product.slug,
      hoverImage: product.hoverImage,
    }),
  );

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main>
        <PictureHero image={project.image} nameLocalized={project.name} />
        <ProjectInfoSection project={project} />
        <div className="bg-background text-background-secondary min-h-screen w-full py-96">
          <ImageGalleryCarousel
            mobileColumn={true}
            multiWidth={true}
            circle={true}
            images={project.portfolioImages}
          />
          {/*
            The two sections under the gallery. Each is RESOLVED by the
            repository — an explicit admin override wins, otherwise it falls back
            to the position it has always used (`portfolioImages[0]`/`[1]` with
            `moreDescription[0]`/`[1]`) — and is `null` when there is no photo at
            all, in which case it is skipped: `next/image` THROWS on a missing
            `src`, and the gallery is operator-editable. The copy is always a
            string, never `undefined` (`pick(undefined)` throws).
          */}
          {project.textImageSection ? (
            <ProjectTextImageSection
              image={project.textImageSection.image}
              text={project.textImageSection.text}
            />
          ) : null}
          {project.fullImageSection ? (
            <ProjectFullImageSection
              image={project.fullImageSection.image}
              caption={project.fullImageSection.caption}
            />
          ) : null}
          <ProductsInCollectionSection
            categories={groupedCategories}
            titleKey="projects.productsUsed"
            viewAllHref="/products"
          />
        </div>
      </main>
    </>
  );
};

export default page;
