import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DirectionProvider } from "@/components/ui/direction";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminAccess } from "@/lib/admin/access";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { isLocale } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";

/**
 * Private admin dashboard chrome.
 *
 * Independent of the public site layout in (site)/layout.tsx — no Navbar,
 * Newsletter or Footer render here. Route groups don't affect the URL, so
 * this layout only applies to pages inside the private (admin) group.
 *
 * Access: requireAdminAccess() is the React-tree backstop for proxy.ts's
 * edge gate — a signed-in visitor without the `admin`/`owner` role never
 * reaches any page below this layout.
 *
 * Direction is CENTRALIZED in ADMIN_SHELL_DIR (lib/admin/sections.ts): the
 * dashboard shell is RTL for EVERY locale, including /en/admin, which used to
 * render LTR and flip the sidebar to the left. The sidebar is docked on the
 * right in RTL because the shared sidebar's fixed layer relies on physical
 * left/right positioning — in an RTL document with side="left" it would
 * overlay the content instead of sitting beside it.
 *
 * DirectionProvider restates the same direction for Base UI's portalled
 * primitives: dialog/select/menu render into document.body, outside the
 * shell's dir wrapper, so on /en/admin they would otherwise inherit the
 * document's ltr (see components/ui/direction.tsx).
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireAdminAccess();

  const dir = ADMIN_SHELL_DIR;

  return (
    <DirectionProvider dir={dir}>
      <SidebarProvider
        dir={dir}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar dir={dir} side={dir === "rtl" ? "right" : "left"} variant="inset" />
        <SidebarInset className="text-background">
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}
