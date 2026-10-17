"use client";

import { NavUser } from "@/components/admin/nav-user";
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
} from "@/components/ui/sidebar";
import {
  ADMIN_CATALOG_NAV,
  ADMIN_OWNER_NAV,
  isAdminNavItemActive,
} from "@/lib/admin/sections";
import { authClient } from "@/lib/auth/auth-client";
import { ROLES } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import {
  Book01Icon,
  Building04Icon,
  CollectionsBookmarkIcon,
  DashboardSquare01Icon,
  Folder01Icon,
  Image01Icon,
  InformationCircleIcon,
  Layers01Icon,
  Layout01Icon,
  Package01Icon,
  Settings01Icon,
  ShirtIcon,
  ShoppingBag01Icon,
  SparklesIcon,
  SwatchIcon,
  UserGroupIcon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Icon per section — the view layer owns the icons; lib/admin/sections.ts
 * owns only data (hrefs + translation keys), exactly like the translations
 * modules own copy while components own markup.
 */
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/admin": <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />,
  "/admin/homepage": <HugeiconsIcon icon={Layout01Icon} strokeWidth={2} />,
  // Prose page sections: /admin/about is a document of prose, so it takes the
  // information glyph; /admin/s34 is a stack of full-bleed sections (hero,
  // video sequence, gallery), so it takes the layers glyph. Both are the same
  // strokeWidth as every other entry, so they read as one family.
  "/admin/about": (
    <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
  ),
  "/admin/s34": <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} />,
  "/admin/products": <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />,
  "/admin/orders": <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />,
  "/admin/users": <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
  "/admin/categories": <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
  "/admin/designers": <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
  "/admin/collections": (
    <HugeiconsIcon icon={CollectionsBookmarkIcon} strokeWidth={2} />
  ),
  "/admin/materials": <HugeiconsIcon icon={SwatchIcon} strokeWidth={2} />,
  "/admin/flagships": <HugeiconsIcon icon={Building04Icon} strokeWidth={2} />,
  "/admin/projects": <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
  "/admin/material-items": <HugeiconsIcon icon={ShirtIcon} strokeWidth={2} />,
  "/admin/catalogue": <HugeiconsIcon icon={Book01Icon} strokeWidth={2} />,
  "/admin/media": <HugeiconsIcon icon={Image01Icon} strokeWidth={2} />,
  "/admin/settings": <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />,
  "/admin/admins": <HugeiconsIcon icon={UserShield01Icon} strokeWidth={2} />,
};

/**
 * The admin sidebar — role-gated groups on top of the shared section
 * registry (lib/admin/sections.ts):
 *
 *   - Catalog group: visible to every admin-level role (admin + owner).
 *   - Admins group: visible only to the `owner` role. Hiding the link is a
 *     convenience, not the authorization — the `/admin/admins` page re-runs
 *     `requireOwnerAccess()` and its server actions re-run it again, so a
 *     non-owner who navigates directly (or POSTs directly) is still rejected.
 *
 * `dir`/`side` come from the (admin) layout, which takes both from the one
 * ADMIN_SHELL_DIR constant — the shell is RTL for every locale, so the
 * sidebar always sits on the right.
 *
 * The demo shadcn groups that don't fit this project (Quick Create / Inbox,
 * Documents, Settings / Get Help / Search) are intentionally not rendered;
 * their components (nav-main, nav-documents, nav-secondary) are kept
 * untouched for future reuse.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { data: session } = authClient.useSession() as {
    data: {
      user?: { role?: string } | null;
    } | null;
  };
  const role = session?.user?.role;
  const isOwner = role === ROLES.owner;

  const groups = [
    {
      label: t("admin.nav.catalog"),
      items: ADMIN_CATALOG_NAV,
    },
    ...(isOwner
      ? [{ label: t("admin.role.owner"), items: ADMIN_OWNER_NAV }]
      : []),
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="relative border-b border-emerald-500/10 bg-linear-to-br from-emerald-500/10 via-transparent to-violet-500/10 px-4 py-3">
        <div className="absolute inset-0 -z-10 bg-linear-to-tr from-emerald-500/10 via-transparent to-violet-500/10" />
        <SidebarMenu>
          <SidebarMenuItem>
            {/*
              The brand block is TWO lines (name + "admin panel"), and the
              button's default height (`h-8`) combined with `overflow-hidden`
              CLIPPED the second line — in Persian, where the subtitle is
              longer, half of it was cut off. `h-auto!` lets the button grow to
              whatever the two lines need, with `min-h-12` keeping it at least
              as tall as a comfortable nav row; the `!` matters because it must
              beat the variant's own `h-8` (see sidebarMenuButtonVariants).
            */}
            <SidebarMenuButton
              className="relative z-10 h-auto! min-h-12! items-center gap-3 py-2!"
              render={<Link href="/admin" />}
            >
              <span className="text-primary-foreground flex size-8 items-center justify-center rounded-md bg-linear-to-r from-emerald-500 to-violet-500 text-xs font-bold">
                HF
              </span>
              <span className="grid flex-1 text-start leading-tight">
                <span className="text-foreground text-sm font-semibold">
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
      {/*
        `SidebarContent` is `flex min-h-0 flex-1 overflow-auto`, so the list
        already scrolls once it outgrows the viewport; `admin-nav-scroll` (in
        app/globals.css) makes that scrollbar VISIBLE, because the shared
        `no-scrollbar` it also carries would otherwise hide the fact.

        `data-lenis-prevent` — REQUIRED, not cosmetic.

        Lenis (components/smoothScroll.tsx) is mounted in the ROOT
        app/[locale]/layout.tsx, so it also wraps the admin shell. It takes over
        wheel/trackpad input for the whole document and scrolls only the PAGE,
        so a wheel gesture over this nav list does nothing. The list IS
        scrollable — a touch drag works, and `el.scrollTop` is settable — but a
        trackpad or wheel cannot reach the items below the fold, which is the
        reported "sidebar is half hidden and cannot be scrolled".

        `data-lenis-prevent` is Lenis's own opt-out: the gesture stays inside
        this element instead of being consumed by the page scroller. Same
        pattern as the lightbox rail and the product-modal track.
      */}
      <SidebarContent data-lenis-prevent className="admin-nav-scroll">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {/*
                      `size="lg"` + `text-sm`: the default row is `h-8 text-xs`,
                      which read as a cramped list on a 72-unit-wide sidebar.
                      A 48px row with a 14px label and 20px icon matches the
                      touch-target size the rest of the shell already uses, and
                      `text-sm` wins over the variant's own `text-xs` because
                      the two are the same utility and the className is merged
                      last (see `cn`).
                    */}
                    <SidebarMenuButton
                      size="lg"
                      className="text-sm [&_svg]:size-5"
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
  );
}
