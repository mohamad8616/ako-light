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
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
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

  return buildLocalizedMetadata({
    locale,
    path: `/projects/${id}`,
    // Project names are proper nouns; the layout template adds the brand.
    title: pick(project.name, lang),
    description: trimDescription(pick(project.description, lang)),
    image: project.image,
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
  const { id } = await params;
  const project = getProjectById(id);

  if (!project) return notFound();

  const groupedCategories = groupProductsByCategory(project.productsUsed);

  return (
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
  );
};

export default page;
