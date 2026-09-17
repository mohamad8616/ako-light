import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { getMaterial, getMaterials } from "@/lib/repositories/materials";
import { getFabricItems } from "@/lib/repositories/fabrics";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  webPageJsonLd,
} from "@/lib/seo/structuredData";
import { redirectIfSlugRenamed } from "@/lib/navigation/slugRedirect";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; material: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { material, locale } = await params;
  const category = await getMaterial(material);
  const lang = resolveLocale(locale);
  const t = translations[lang];

  if (!category) {
    // Renamed slug → permanent redirect to the current URL. Otherwise an
    // unknown material slug gets generic materials metadata, matching the
    // page's own fallback rendering.
    await redirectIfSlugRenamed("material", material, { locale });
    return buildLocalizedMetadata({
      locale,
      path: `/materials/${material}`,
      title: t["page.materials.title"],
      description: t["page.materials.description"],
    });
  }

  const name = pick(category.name, lang);
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace(
    "{name}",
    pick(category.name, lang).toLowerCase(),
  );
  const url = absoluteUrl(`/materials/${material}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const materialsLabel = t["page.materials.title"];

  const jsonLdData = [
    webPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: materialsLabel, path: "/materials" },
        { name: name, path: `/materials/${material}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/materials/${material}`,
    title,
    description,
    image: category.image,
    jsonLd: jsonLdData,
  });
}

export default async function MaterialPage({ params }: PageProps) {
  const { material, locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];
  const [category, allMaterials, fabrics] = await Promise.all([
    getMaterial(material),
    getMaterials(),
    getFabricItems(),
  ]);

  if (!category) {
    // Renamed slug → permanent redirect to the current URL. A route param that
    // is a materials *category* ("fabrics", "metals", …) has no entity and no
    // history, so it still falls through to the category view below.
    await redirectIfSlugRenamed("material", material, { locale });
    return (
      <MaterialCategoryView
        slug={material}
        materials={allMaterials}
        fabrics={fabrics}
      />
    );
  }

  const name = pick(category.name, lang);
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace(
    "{name}",
    pick(category.name, lang).toLowerCase(),
  );
  const url = absoluteUrl(`/materials/${material}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const materialsLabel = t["page.materials.title"];

  const jsonLdData = [
    webPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: materialsLabel, path: "/materials" },
        { name: name, path: `/materials/${material}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <MaterialCategoryView
        slug={material}
        materials={allMaterials}
        fabrics={fabrics}
      />
    </>
  );
}
