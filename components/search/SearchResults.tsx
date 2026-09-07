"use client";

import { designers } from "@/lib/data/designers";
import { products } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productKey } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n/translations";
import { useDeferredValue, useMemo } from "react";
import SearchCard from "./SearchCard";

// ---------------------------------------------------------------------------
// Pre-compute searchable haystacks ONCE at module load.
// Avoids re-allocating lowercased strings on every keystroke.
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

// Persian product display names live in translations.fa (keyed by productKey).
// They must be part of the searchable haystack or Persian queries never match.
const faTranslations = translations.fa as Record<string, string>;

function faProductName(slug: string): string {
  const key = productKey(slug);
  const fa = faTranslations[key];
  return fa && fa !== key ? fa : "";
}

// Designer lookup keyed by normalised EN and FA names. Products reference
// their designer by a plain EN name (p.designer.name), so this maps that
// back to the designer record (including its Persian name).
const designerByKey = new Map<
  string,
  { slug: string; name: string; nameFa?: string }
>();
for (const d of designers) {
  const entry = { slug: d.slug, name: d.name, nameFa: d.nameFa };
  designerByKey.set(normalise(d.name), entry);
  if (d.nameFa) designerByKey.set(normalise(d.nameFa), entry);
}

// designer slug -> searchable text of every product they designed (EN + FA).
const productTextByDesigner = new Map<string, string[]>();
for (const p of products) {
  const designer = designerByKey.get(normalise(p.designer.name));
  if (!designer) continue;
  const texts = productTextByDesigner.get(designer.slug) ?? [];
  texts.push(p.name, faProductName(p.slug));
  productTextByDesigner.set(designer.slug, texts);
}

const indexedProducts: IndexedProduct[] = products.map((p) => {
  const designer = designerByKey.get(normalise(p.designer.name));
  // A product's haystack includes its designer's EN + FA names, so
  // searching for a designer surfaces BOTH the designer card and all of
  // their products.
  const haystack = normalise(
    [
      p.name,
      faProductName(p.slug),
      p.slug,
      p.category,
      p.designer.name,
      designer?.nameFa ?? "",
    ].join(" "),
  );
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    image: p.images[0] ?? p.heroImage,
    haystack,
    condensed: condense(haystack),
  };
});

const indexedDesigners: IndexedDesigner[] = designers.map((d) => {
  // ...and a designer's haystack includes the EN + FA names of every product
  // they designed, so searching for a product surfaces its designer too.
  const haystack = normalise(
    [
      d.name,
      d.nameFa ?? "",
      d.slug,
      ...(productTextByDesigner.get(d.slug) ?? []),
    ].join(" "),
  );
  return {
    name: d.name,
    nameFa: d.nameFa,
    slug: d.slug,
    image: d.image,
    haystack,
    condensed: condense(haystack),
  };
});

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
}

export default function SearchResults({ query, className }: SearchResultsProps) {
  const { t, lang } = useLanguage();

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
  }, [needle, needleCondensed]);

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
                  : p.name;

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