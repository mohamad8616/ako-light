"use client"

import { NavUser } from "@/components/nav-user"
import {
  ADMIN_CATALOG_NAV,
  ADMIN_OWNER_NAV,
  isAdminNavItemActive,
} from "@/lib/admin/sections"
import { ROLES } from "@/lib/auth/permissions"
import { authClient } from "@/lib/auth/auth-client"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import Link from "@/lib/i18n/Link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book01Icon,
  Building04Icon,
  DashboardSquare01Icon,
  Folder01Icon,
  Package01Icon,
  ShirtIcon,
  SparklesIcon,
  SwatchIcon,
  UserGroupIcon,
  UserShield01Icon,
  CollectionsBookmarkIcon,
} from "@hugeicons/core-free-icons"
import { usePathname } from "next/navigation"
import * as React from "react"

/**
 * Icon per section — the view layer owns the icons; lib/admin/sections.ts
 * owns only data (hrefs + translation keys), exactly like the translations
 * modules own copy while components own markup.
 */
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/admin": <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />,
  "/admin/products": <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />,
  "/admin/categories": <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
  "/admin/designers": <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
  "/admin/collections": (
    <HugeiconsIcon icon={CollectionsBookmarkIcon} strokeWidth={2} />
  ),
  "/admin/materials": <HugeiconsIcon icon={SwatchIcon} strokeWidth={2} />,
  "/admin/flagships": <HugeiconsIcon icon={Building04Icon} strokeWidth={2} />,
  "/admin/projects": <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
  "/admin/fabrics": <HugeiconsIcon icon={ShirtIcon} strokeWidth={2} />,
  "/admin/catalogue": <HugeiconsIcon icon={Book01Icon} strokeWidth={2} />,
  "/admin/admins": <HugeiconsIcon icon={UserShield01Icon} strokeWidth={2} />,
}

/**
 * The admin sidebar — role-gated groups on top of the shared section
 * registry (lib/admin/sections.ts):
 *
 *   - Catalog group: visible to every admin-level role (admin + owner).
 *   - Admins group: visible only to the `owner` role; the real
 *     admin-account management is a later step, but the gated nav item and
 *     its placeholder route exist now (see app/[locale]/(admin)/admin/admins).
 *
 * `dir`/`side` come from the (admin) layout, which derives them from the URL
 * locale — RTL puts the sidebar on the right, LTR (/en) on the left.
 *
 * The demo shadcn groups that don't fit this project (Quick Create / Inbox,
 * Documents, Settings / Get Help / Search) are intentionally not rendered;
 * their components (nav-main, nav-documents, nav-secondary) are kept
 * untouched for future reuse.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { data: session } = authClient.useSession() as {
    data: {
      user?: { role?: string } | null;
    } | null;
  };
  const role = session?.user?.role
  const isOwner = role === ROLES.owner

  const groups = [
    {
      label: t("admin.nav.catalog"),
      items: ADMIN_CATALOG_NAV,
    },
    ...(isOwner
      ? [{ label: t("admin.role.owner"), items: ADMIN_OWNER_NAV }]
      : []),
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="relative bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10 p-4 border-b border-emerald-500/10">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-violet-500/10 -z-10" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5! relative z-10"
              render={<Link href="/admin" />}
            >
              <span className="bg-gradient-to-r from-emerald-500 to-violet-500 text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold">
                HF
              </span>
              <span className="grid flex-1 text-start leading-tight">
                <span className="text-base font-semibold text-foreground">
                  {t("admin.brand")}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("admin.brand.subtitle")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={t(item.labelKey)}
                      isActive={isAdminNavItemActive(item.href, pathname)}
                      render={<Link href={item.href} />}
                    >
                      {NAV_ICONS[item.href]}
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session?.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
