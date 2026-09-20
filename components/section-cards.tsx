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

/** Color theme per card: gradient bg, icon color, subtle border */
const CARD_THEMES = [
  { bg: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent", icon: "text-emerald-500", ring: "ring-emerald-500/20" },
  { bg: "bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent", icon: "text-violet-500", ring: "ring-violet-500/20" },
  { bg: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent", icon: "text-amber-500", ring: "ring-amber-500/20" },
  { bg: "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent", icon: "text-rose-500", ring: "ring-rose-500/20" },
  { bg: "bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent", icon: "text-cyan-500", ring: "ring-cyan-500/20" },
  { bg: "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent", icon: "text-indigo-500", ring: "ring-indigo-500/20" },
] as const

const CARDS = [
  {
    key: "products",
    labelKey: "admin.stat.products",
    hintKey: "admin.card.products.hint",
    icon: <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />,
    theme: CARD_THEMES[0],
  },
  {
    key: "designers",
    labelKey: "admin.stat.designers",
    hintKey: "admin.card.designers.hint",
    icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
    theme: CARD_THEMES[1],
  },
  {
    key: "collections",
    labelKey: "admin.stat.collections",
    hintKey: "admin.card.collections.hint",
    icon: <HugeiconsIcon icon={CollectionsBookmarkIcon} strokeWidth={2} />,
    theme: CARD_THEMES[2],
  },
  {
    key: "materials",
    labelKey: "admin.stat.materials",
    hintKey: "admin.card.materials.hint",
    icon: <HugeiconsIcon icon={SwatchIcon} strokeWidth={2} />,
    theme: CARD_THEMES[3],
  },
  {
    key: "flagships",
    labelKey: "admin.stat.flagships",
    hintKey: "admin.card.flagships.hint",
    icon: <HugeiconsIcon icon={Building04Icon} strokeWidth={2} />,
    theme: CARD_THEMES[4],
  },
  {
    key: "projects",
    labelKey: "admin.stat.projects",
    hintKey: "admin.card.projects.hint",
    icon: <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
    theme: CARD_THEMES[5],
  },
] as const

export function SectionCards({ counts }: { counts: CatalogCounts }) {
  const { lang, t } = useLanguage()
  const numberFormat = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US")

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {CARDS.map((card) => (
        <Card
          key={card.key}
          className={`@container/card relative overflow-hidden ${card.theme.bg} ${card.theme.ring} ring-1 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--tw-ring-color)] hover:-translate-y-0.5`}
        >
          {/* Subtle animated shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 animate-pulse" aria-hidden="true" />
          <CardHeader className="relative z-10">
            <CardDescription className="flex items-center gap-2">
              <span className={card.theme.icon}>{card.icon}</span>
              {t(card.labelKey)}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-foreground">
              {numberFormat.format(counts[card.key])}
            </CardTitle>
          </CardHeader>
          <CardFooter className="relative z-10 text-muted-foreground/80 flex-col items-start gap-1.5 text-sm bg-white/5 dark:bg-black/5 rounded-lg border border-white/10 dark:border-black/10">
            <div className="line-clamp-1">{t(card.hintKey)}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
