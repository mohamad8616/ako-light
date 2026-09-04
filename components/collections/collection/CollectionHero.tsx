"use client";

import PictureHero from "@/components/ui/PictureHero";
import type { Collection } from "@/lib/data/collections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";

// Client wrapper so the /collections/[slug] hero copy resolves through the
// translation system (the page it lives in is a server component and cannot
// call useLanguage) — same pattern as components/about/AboutHero.tsx.
export default function CollectionHero({
  collection,
}: {
  collection: Collection;
}) {
  const { t, lang } = useLanguage();
  const name = pick(collection.name, lang);

  return <PictureHero name={`${name} ${t("collections.collection")}`} image={collection.image} />;
}