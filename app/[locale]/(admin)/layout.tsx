import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminAccess } from "@/lib/admin/access";
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
 * Direction follows the URL locale (the dashboard is Persian-first, but the
 * /en tree renders English LTR): the sidebar is docked on the right in RTL
 * and on the left in LTR, because the shared sidebar's fixed layer relies on
 * physical left/right positioning — in an RTL document with side="left" it
 * would overlay the content instead of sitting beside it.
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

  const dir = locale === "en" ? ("ltr" as const) : ("rtl" as const);

  return (
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
      <SidebarInset className="text-background-secondary">
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
