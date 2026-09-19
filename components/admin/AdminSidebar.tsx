"use client";

import {
  ADMIN_CATALOG_NAV,
  ADMIN_DASHBOARD_HREF,
  ADMIN_OWNER_NAV,
  ADMIN_SHELL_DIR,
  isAdminNavItemActive,
} from "@/lib/admin/sections";
import { authClient } from "@/lib/auth/auth-client";
import { ROLES } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import {
  Boxes,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Package,
  Palette,
  Shield,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

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

/**
 * Icon per section. Icons stay in the view layer on purpose —
 * lib/admin/sections.ts holds only data (hrefs + translation keys), so both
 * the sidebar and the topbar breadcrumb can read it.
 */
const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [ADMIN_DASHBOARD_HREF]: LayoutDashboard,
  "/admin/products": Package,
  "/admin/categories": FolderKanban,
  "/admin/designers": Users,
  "/admin/collections": Boxes,
  "/admin/materials": Palette,
  "/admin/flagships": Building2,
  "/admin/projects": Sparkles,
  "/admin/fabrics": Shirt,
  "/admin/catalogue": FolderKanban,
  "/admin/admins": Shield,
};

/**
 * The sidebar tree itself — deliberately WITHOUT a <SidebarProvider>.
 *
 * The provider lives in app/[locale]/(admin)/admin/layout.tsx and wraps this
 * component and the content column as siblings. Rendering a provider here
 * would put `SidebarTrigger` (in the topbar) outside its context: the
 * trigger would be inert, the mobile Sheet could never open, and the
 * provider's own `flex w-full` wrapper would fight the content column for
 * width. See the layout's doc comment.
 *
 * `dir` is passed to the primitive so the mobile Sheet inherits the shell's
 * forced RTL even when `<html>` says ltr (/en/admin).
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const { lang, t } = useLanguage();
  const { data: session } = authClient.useSession() as {
    data: {
      user?: { role?: string };
    } | null;
  };
  const role = session?.user?.role;
  const isOwner = role === ROLES.owner;

  const sections = [
    { label: t("admin.nav.catalog"), items: ADMIN_CATALOG_NAV },
    ...(isOwner ? [{ label: "Owner", items: ADMIN_OWNER_NAV }] : []),
  ];

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      dir={ADMIN_SHELL_DIR}
      className="border-border bg-sidebar border-r"
    >
      <SidebarHeader className="border-border border-b px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold">
            {lang.toUpperCase()}
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
              Ako
            </p>
            <p className="text-foreground text-sm font-semibold">Admin</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = NAV_ICONS[item.href] ?? Package;
                  const isActive = isAdminNavItemActive(item.href, pathname);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className="data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                        render={
                          <Link
                            href={item.href}
                            className="flex items-center gap-2"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{t(item.labelKey)}</span>
                          </Link>
                        }
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-border border-t p-3">
        <div className="bg-muted/50 text-muted-foreground flex items-center justify-between rounded-md px-2 py-2 text-xs">
          <span>{isOwner ? "Owner" : "Admin"}</span>
          <span className="border-border rounded-full border px-2 py-0.5">
            {lang}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
