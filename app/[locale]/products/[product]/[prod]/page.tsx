import ProductPageClient from "@/components/products/prod/ProductPageClient";
import {
  getProduct,
  getProducts,
  getProductsByCategory,
} from "@/lib/repositories/products";
import { productDescription, productName } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { siteName } from "@/lib/seo/config";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  productJsonLd,
} from "@/lib/seo/structuredData";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; product: string; prod: string }>;
}

export async function generateStaticParams() {
  const allProducts = await getProducts();
  return allProducts.map((p) => ({
    product: p.category,
    prod: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { product, prod, locale } = await params;
  const productt = await getProduct(product, prod);

  if (!productt) notFound();

  const lang = resolveLocale(locale);
  // Server-side dictionary lookup adapter matching the t(key) signature
  // that productName()/productDescription() expect.
  const dict = translations[lang] as Record<string, string>;
  const tFn = (key: string) => dict[key] ?? key;

  const name = productName(tFn, productt.slug);
  const description = trimDescription(productDescription(tFn, productt.slug));
  const url = absoluteUrl(`/products/${product}/${prod}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const productsLabel = dict["page.products.title"];
  const categoryLabel = dict[productt.category] ?? productt.category;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: productt.images[0],
      brand: siteName,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: productsLabel, path: "/products" },
        { name: categoryLabel, path: `/products/${product}` },
        { name: name, path: `/products/${product}/${prod}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/products/${product}/${prod}`,
    title: name,
    description,
    image: productt.images[0],
    jsonLd: jsonLdData,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod, locale } = await params;
  const productt = await getProduct(product, prod);
  if (!productt) notFound();

  // Same-category candidates for the related-products section (self
  // excluded); fetched server-side so the client never needs the catalog.
  const sameCategoryProducts = (await getProductsByCategory(product)).filter(
    (p) => p.slug !== prod,
  );

  const lang = resolveLocale(locale);
  const dict = translations[lang] as Record<string, string>;
  const tFn = (key: string) => dict[key] ?? key;

  const name = productName(tFn, productt.slug);
  const description = trimDescription(productDescription(tFn, productt.slug));
  const url = absoluteUrl(`/products/${product}/${prod}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const productsLabel = dict["page.products.title"];
  const categoryLabel = dict[productt.category] ?? productt.category;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: productt.images[0],
      brand: siteName,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: productsLabel, path: "/products" },
        { name: categoryLabel, path: `/products/${product}` },
        { name: name, path: `/products/${product}/${prod}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <ProductPageClient
        productt={productt}
        link="link"
        sameCategoryProducts={sameCategoryProducts}
      />
    </>
  );
}
