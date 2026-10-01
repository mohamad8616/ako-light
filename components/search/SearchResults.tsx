"use client";

import type { SearchDesigner, SearchProduct } from "@/lib/repositories/search-index";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, productKey, type Localized } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import { useDeferredValue, useMemo } from "react";
import SearchCard from "./SearchCard";

// ---------------------------------------------------------------------------
// Search index — built inside the component from props (server-fetched),
// memoized per mount/prop-change. Previously at module scope over static
// imports; kept out of module scope so the client bundle never ships the
// full static catalog.
// ---------------------------------------------------------------------------

interface IndexedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  haystack: string;
  condensed: string;
}

interface IndexedDesigner {
  name: string;
  nameFa?: string;
  slug: string;
  image: string;
  haystack: string;
  condensed: string;
}

function localizedText(
  value: Localized | string | undefined,
  lang: "en" | "fa" = "en",
) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return pick(value, lang);
}

// The Persian product name used to be read from the translation dictionary on
// the client, which pulled the whole dictionary into this bundle. It is now
// pre-resolved by the server as `product.faName` — see
// lib/repositories/search-index.ts.

// Designer lookup keyed by normalised EN and FA names. Products reference
// their designer by a localized name object, so this maps that back to the
// designer record (including the Persian display name).
function buildDesignerByKey(
  designers: SearchDesigner[],
): Map<string, { slug: string; name: string; nameFa: string }> {
  const map = new Map<string, { slug: string; name: string; nameFa: string }>();
  for (const d of designers) {
    const entry = {
      slug: d.slug,
      name: localizedText(d.name, "en"),
      nameFa: localizedText(d.name, "fa"),
    };
    map.set(normalise(entry.name), entry);
    if (entry.nameFa) map.set(normalise(entry.nameFa), entry);
  }
  return map;
}

// designer slug -> searchable text of every product they designed (EN + FA).
function buildProductTextByDesigner(
  products: SearchProduct[],
  designerByKey: Map<string, { slug: string; name: string; nameFa: string }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of products) {
    const designer = designerByKey.get(
      normalise(localizedText(p.designerName, "en")),
    );
    if (!designer) continue;
    const texts = map.get(designer.slug) ?? [];
    texts.push(
      localizedText(p.name, "en"),
      localizedText(p.name, "fa"),
      p.faName,
    );
    map.set(designer.slug, texts);
  }
  return map;
}

function buildIndexedProducts(
  products: SearchProduct[],
  designerByKey: Map<string, { slug: string; name: string; nameFa: string }>,
): IndexedProduct[] {
  return products.map((p) => {
    const designer = designerByKey.get(
      normalise(localizedText(p.designerName, "en")),
    );
    // A product's haystack includes its designer's EN + FA names, so
    // searching for a designer surfaces BOTH the designer card and all of
    // their products.
    const haystack = normalise(
      [
        localizedText(p.name, "en"),
        localizedText(p.name, "fa"),
        p.faName,
        p.slug,
        p.category,
        localizedText(p.designerName, "en"),
        localizedText(p.designerName, "fa"),
        designer?.nameFa ?? "",
      ].join(" "),
    );
    return {
      id: p.id,
      name: localizedText(p.name, "en"),
      slug: p.slug,
      category: p.category,
      image: p.image,
      haystack,
      condensed: condense(haystack),
    };
  });
}

function buildIndexedDesigners(
  designers: SearchDesigner[],
  productTextByDesigner: Map<string, string[]>,
): IndexedDesigner[] {
  return designers.map((d) => {
    const name = localizedText(d.name, "en");
    const nameFa = localizedText(d.name, "fa");
    // ...and a designer's haystack includes the EN + FA names of every product
    // they designed, so searching for a product surfaces its designer too.
    const haystack = normalise(
      [name, nameFa, d.slug, ...(productTextByDesigner.get(d.slug) ?? [])].join(
        " ",
      ),
    );
    return {
      name,
      nameFa,
      slug: d.slug,
      image: d.image,
      haystack,
      condensed: condense(haystack),
    };
  });
}

// ---------------------------------------------------------------------------
// Normalise input for matching: trim, lowercase, collapse whitespace, and
// unify Persian/Arabic look-alike characters so queries typed on different
// keyboard layouts still match:
//   • Arabic yeh (ي) / alef maksura (ى) -> Persian yeh (ی)
//   • Arabic kaf (ك)                    -> Persian kaf (ک)
//   • alef variants (أ إ آ)             -> plain alef (ا)
//   • teh marbuta (ة)                   -> heh (ه)
//   • Persian/Arabic-Indic digits       -> ASCII digits
//   • ZWNJ & direction marks            -> space (نیم‌فاصله must not break matching)
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ىي]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u200c\u200e\u200f\ufeff]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Whitespace-stripped variant of the haystack, used as a fallback match so
// that "کم‌ارتفاع", "کم ارتفاع" and "کمارتفاع" all find the same result.
function condense(s: string): string {
  return s.replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Result cards are rendered by the shared components/search/SearchCard.
// ---------------------------------------------------------------------------

const SECTION_HEADER_CLASS =
  "mb-6 text-xs font-medium tracking-[0.2em] text-white/70 uppercase md:mb-8";

// Minimum number of characters before the search runs at all.
const MIN_QUERY_LENGTH = 3;

// ---------------------------------------------------------------------------
// SearchResults
// ---------------------------------------------------------------------------

interface SearchResultsProps {
  query: string;
  className?: string;
  products: SearchProduct[];
  designers: SearchDesigner[];
}

export default function SearchResults({
  query,
  className,
  products,
  designers,
}: SearchResultsProps) {
  const { t, lang } = useLanguage();

  // Index computed once per mount/prop-change instead of at import time.
  const { indexedProducts, indexedDesigners } = useMemo(() => {
    const designerByKey = buildDesignerByKey(designers);
    const productTextByDesigner = buildProductTextByDesigner(
      products,
      designerByKey,
    );
    return {
      indexedProducts: buildIndexedProducts(products, designerByKey),
      indexedDesigners: buildIndexedDesigners(
        designers,
        productTextByDesigner,
      ),
    };
  }, [products, designers]);

  // The query arriving here is already debounced by SearchHeader, so this
  // only re-renders once the user pauses typing. useDeferredValue is kept
  // as a second layer: it lets React render the input frame first and run
  // the filter (which scales with dataset size) right after.
  const deferred = useDeferredValue(query);
  const needle = normalise(deferred);
  const needleCondensed = condense(needle);

  // Don't search until the user has typed at least MIN_QUERY_LENGTH
  // characters — avoids noisy partial results and pointless work.
  const { productResults, designerResults, hasQuery } = useMemo(() => {
    if (needle.length < MIN_QUERY_LENGTH) {
      return {
        productResults: [] as IndexedProduct[],
        designerResults: [] as IndexedDesigner[],
        hasQuery: false,
      };
    }

    const matches = (r: { haystack: string; condensed: string }) =>
      r.haystack.includes(needle) ||
      (needleCondensed.length > 0 && r.condensed.includes(needleCondensed));

    return {
      productResults: indexedProducts.filter(matches),
      designerResults: indexedDesigners.filter(matches),
      hasQuery: true,
    };
  }, [needle, needleCondensed, indexedProducts, indexedDesigners]);

  const isEmpty =
    hasQuery && productResults.length === 0 && designerResults.length === 0;

  return (
    <div className={cn("pb-24 md:pb-32", className)}>
      {/* PRODUCTS */}
      {productResults.length > 0 && (
        <section className="mt-8 md:mt-12">
          <h2 className={SECTION_HEADER_CLASS}>{t("search.products")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-5">
            {productResults.map((p, i) => {
              // Use the localised product name if a translation key exists,
              // otherwise fall back to the data file's plain name.
              const localised = t(productKey(p.slug));
              const displayName =
                localised && localised !== productKey(p.slug)
                  ? localised
                  : localizedText(p.name, lang);

              return (
                <SearchCard
                  key={p.id}
                  variant="product"
                  href={`/products/${p.category}/${p.slug}`}
                  name={displayName}
                  image={p.image}
                  index={i}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* DESIGNERS */}
      {designerResults.length > 0 && (
        <section className="mt-12 md:mt-16">
          <h2 className={SECTION_HEADER_CLASS}>{t("search.designers")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-5">
            {designerResults.map((d, i) => (
              <SearchCard
                key={d.slug}
                variant="designer"
                href={`/designers/${d.slug}`}
                name={lang === "fa" && d.nameFa ? d.nameFa : d.name}
                image={d.image}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY STATE */}
      {isEmpty && (
        <div
          className={cn(
            "mt-16 text-start md:mt-24",
            "text-background-secondary/70",
            "text-sm font-light tracking-tight md:text-base",
            lang === "fa" ? "font-noora" : "font-din",
          )}
          role="status"
          aria-live="polite"
        >
          {t("search.noResults")}
        </div>
      )}
    </div>
  );
}
