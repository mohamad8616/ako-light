"use client"

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Building04Icon,
  CollectionsBookmarkIcon,
  Package01Icon,
  SparklesIcon,
  SwatchIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

export interface CatalogCounts {
  products: number
  designers: number
  collections: number
  materials: number
  flagships: number
  projects: number
}

/**
 * Catalog stat cards — one card per admin entity, showing the live row count
 * fetched on the server (app/[locale]/(admin)/admin/page.tsx).
 *
 * Labels/hints come from the admin dictionary so the future multi-language
 * dashboard only needs the translations, not this component. Counts render in
 * the active locale's digits (`fa-IR` gives ۱۲۳ on the Persian dashboard).
 */
const CARDS = [
  {
    key: "products",
    labelKey: "admin.stat.products",
    hintKey: "admin.card.products.hint",
    icon: <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />,
  },
  {
    key: "designers",
    labelKey: "admin.stat.designers",
    hintKey: "admin.card.designers.hint",
    icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
  },
  {
    key: "collections",
    labelKey: "admin.stat.collections",
    hintKey: "admin.card.collections.hint",
    icon: <HugeiconsIcon icon={CollectionsBookmarkIcon} strokeWidth={2} />,
  },
  {
    key: "materials",
    labelKey: "admin.stat.materials",
    hintKey: "admin.card.materials.hint",
    icon: <HugeiconsIcon icon={SwatchIcon} strokeWidth={2} />,
  },
  {
    key: "flagships",
    labelKey: "admin.stat.flagships",
    hintKey: "admin.card.flagships.hint",
    icon: <HugeiconsIcon icon={Building04Icon} strokeWidth={2} />,
  },
  {
    key: "projects",
    labelKey: "admin.stat.projects",
    hintKey: "admin.card.projects.hint",
    icon: <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
  },
] as const

export function SectionCards({ counts }: { counts: CatalogCounts }) {
  const { lang, t } = useLanguage()
  const numberFormat = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US")

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      {CARDS.map((card) => (
        <Card key={card.key} className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="text-primary">{card.icon}</span>
              {t(card.labelKey)}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {numberFormat.format(counts[card.key])}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1">{t(card.hintKey)}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
