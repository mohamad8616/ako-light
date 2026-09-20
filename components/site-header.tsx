"use client"

import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Admin shell header — chrome only. The page body owns its own headings; this
 * bar carries the sidebar trigger and the shell title.
 */
export function SiteHeader() {
  const { t } = useLanguage()
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{t("admin.header.title")}</h1>
      </div>
    </header>
  )
}
