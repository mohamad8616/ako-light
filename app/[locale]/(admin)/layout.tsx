import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Private admin dashboard chrome.
 *
 * Independent of the public site layout in (site)/layout.tsx — no Navbar,
 * Newsletter or Footer render here. Route groups don't affect the URL, so
 * this layout only applies to pages inside the private (admin) group.
 *
 * The admin panel is RTL-first: the whole dashboard subtree is forced to
 * dir="rtl" (regardless of the active locale) and the sidebar is docked on
 * the right (side="right"), because the shared sidebar's fixed layer relies
 * on physical left/right positioning — in an RTL document it would otherwise
 * overlay the content instead of sitting beside it.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      dir="rtl"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar dir="rtl" side="right" variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
