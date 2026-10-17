import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { getMaterialCategory } from "@/lib/repositories/material-categories";
import { getMaterialItems, getMaterialItemParentSlugByLegacySlug } from "@/lib/repositories/material-items";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import { absoluteUrl, breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/structuredData";
import { redirectIfSlugRenamed } from "@/lib/navigation/slugRedirect";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; material: string }>;
}

async function resolveMaterialCategory(slug: string, locale: string) {
  const category = await getMaterialCategory(slug);
  if (category) return category;

  await redirectIfSlugRenamed("materialCategory", slug, { locale });

  // Items used to have individual routes. They are now display-only, so old
  // current and historical item URLs lead to the item's owning category.
  const parentSlug = await getMaterialItemParentSlugByLegacySlug(slug);
  if (parentSlug) {
    permanentRedirect(getLocalizedPath(`/materials/${parentSlug}`, resolveLocale(locale)));
  }
  notFound();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { material, locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];
  const category = await resolveMaterialCategory(material, locale);
  const name = pick(category.name, lang);
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace("{name}", name.toLowerCase());
  const url = absoluteUrl(`/materials/${category.slug}`, lang);
  const homeLabel = lang === "fa" ? "خانه" : "Home";

  return buildLocalizedMetadata({
    locale,
    path: `/materials/${category.slug}`,
    title,
    description,
    image: category.image,
    jsonLd: [
      webPageJsonLd(title, description, url),
      breadcrumbListJsonLd(
        [
          { name: homeLabel, path: "/" },
          { name: t["page.materials.title"], path: "/materials" },
          { name, path: `/materials/${category.slug}` },
        ],
        lang,
      ),
    ],
  });
}

export default async function MaterialPage({ params }: PageProps) {
  const { material, locale } = await params;
  const category = await resolveMaterialCategory(material, locale);
  const items = await getMaterialItems(category.id);
  const lang = resolveLocale(locale);
  const t = translations[lang];
  const name = pick(category.name, lang);
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace("{name}", name.toLowerCase());

  return (
    <>
      <JsonLdRenderer
        data={[
          webPageJsonLd(title, description, absoluteUrl(`/materials/${category.slug}`, lang)),
          breadcrumbListJsonLd(
            [
              { name: lang === "fa" ? "خانه" : "Home", path: "/" },
              { name: t["page.materials.title"], path: "/materials" },
              { name, path: `/materials/${category.slug}` },
            ],
            lang,
          ),
        ]}
      />
      <MaterialCategoryView category={category} items={items} />
    </>
  );
}
