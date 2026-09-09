import ProductsInCollectionSection from "@/components/collections/collection/ProductsInCollectionSection";
import ProjectFullImageSection from "@/components/projects/project/ProjectFullImageSection";
import ProjectInfoSection from "@/components/projects/project/ProjectInfoSection";
import ProjectTextImageSection from "@/components/projects/project/ProjectTextImageSection";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import PictureHero from "@/components/ui/PictureHero";
import {
  productCategories,
  type ProductCategory,
} from "@/lib/data/productCategories";
import { getProjectById } from "@/lib/data/projects";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
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
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, locale } = await params;
  const project = getProjectById(id);

  if (!project) notFound();

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
 * Group a flat list of products by their `category` slug into
 * `ProductCategory` shape expected by `ProductsInCollectionSection`.
 */
function groupProductsByCategory(
  products: ProductCategory["products"],
): ProductCategory[] {
  const bySlug = new Map<string, ProductCategory["products"]>();
  for (const p of products) {
    const list = bySlug.get(p.category) ?? [];
    list.push(p);
    bySlug.set(p.category, list);
  }
  const result: ProductCategory[] = [];
  for (const cat of productCategories) {
    const list = bySlug.get(cat.slug);
    if (list && list.length > 0) {
      result.push({ ...cat, products: list });
    }
  }
  return result;
}

const page = async ({ params }: PageProps) => {
  const { id, locale } = await params;
  const project = getProjectById(id);

  if (!project) return notFound();

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

  const groupedCategories = groupProductsByCategory(project.productsUsed);

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
          <ProjectTextImageSection
            image={project.portfolioImages[0]}
            text={project.moreDescription[0]}
          />
          <ProjectFullImageSection
            image={project.portfolioImages[1]}
            caption={project.moreDescription[1]}
          />
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
