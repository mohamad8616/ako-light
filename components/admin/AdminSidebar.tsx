"use client";

import { authClient } from "@/lib/auth/auth-client";
import { ADMIN_ROLES, ROLES } from "@/lib/auth/permissions";
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
  SidebarProvider,
} from "@/components/ui/sidebar";

interface SidebarSection {
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const catalogItems = [
  { href: "/admin", label: "admin.nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "admin.nav.products", icon: Package },
  {
    href: "/admin/categories",
    label: "admin.nav.categories",
    icon: FolderKanban,
  },
  { href: "/admin/designers", label: "admin.nav.designers", icon: Users },
  { href: "/admin/collections", label: "admin.nav.collections", icon: Boxes },
  { href: "/admin/materials", label: "admin.nav.materials", icon: Palette },
  { href: "/admin/flagships", label: "admin.nav.flagships", icon: Building2 },
  { href: "/admin/projects", label: "admin.nav.projects", icon: Sparkles },
  { href: "/admin/fabrics", label: "admin.nav.fabrics", icon: Shirt },
  {
    href: "/admin/catalogue",
    label: "admin.nav.catalogue",
    icon: FolderKanban,
  },
] as const;

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
  const isAdmin = Boolean(
    role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]),
  );

  const sections: SidebarSection[] = [
    {
      label: t("admin.nav.catalog"),
      items: catalogItems.map((item) => ({
        ...item,
        href: item.href,
        label: t(item.label),
      })),
    },
    ...(isOwner
      ? [
          {
            label: "Owner",
            items: [
              {
                href: "/admin/admins",
                label: t("admin.nav.admins"),
                icon: Shield,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        side="left"
        variant="sidebar"
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
                    const Icon = item.icon;
                    const isActive = (() => {
                      if (item.href === "/admin") {
                        return (
                          pathname === "/admin" ||
                          pathname === "/en/admin" ||
                          pathname === "/fa/admin"
                        );
                      }
                      return (
                        pathname === item.href ||
                        pathname === `/en${item.href}` ||
                        pathname === `/fa${item.href}`
                      );
                    })();

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={
                            <Link
                              href={item.href}
                              className="flex items-center gap-2"
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
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
    </SidebarProvider>
  );
}
