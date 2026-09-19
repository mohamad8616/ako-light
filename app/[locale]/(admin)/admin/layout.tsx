import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { isLocale } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";

/**
 * Admin shell — the layout for everything under `/admin`.
 *
 * `(admin)` is a route group (it never appears in a URL) and this layout sits
 * with the `/admin` pages it wraps, so it covers `/admin`, `/admin/products`,
 * `/admin/admins`, ... and nothing else.
 *
 * Instructions:
 *   - ONE <SidebarProvider> wraps BOTH the <Sidebar> (inside AdminSidebar)
 *     and the content column as siblings. That is what makes the primitive
 *     work: `SidebarTrigger` reads the context provided here (outside it,
 *     `useSidebar()` falls back to its no-op stub and the trigger is inert),
 *     the desktop gap/mobile Sheet are driven by the state it owns, and
 *     `SidebarInset`'s `peer-data-*` rules only match a sibling sidebar. Do
 *     not move the provider back inside AdminSidebar.
 *   - Keep exactly ONE shell layout for this tree. A second layout.tsx here
 *     or in the parent group would nest a second provider/sidebar/topbar and
 *     stack two shells over the same page.
 *   - `dir` lives on the provider (it spreads `div` props) so the shell stays
 *     RTL on `/en/admin` too, including the mobile Sheet, which reads its
 *     direction from the primitive rather than from `<html dir>`.
 *   - `SidebarInset` renders a <main> landmark, so the padded content wrapper
 *     below is a <div>: a <main> must never contain another <main>.
 *   - The Toaster is a sibling of the provider (not a child) so it cannot be
 *     laid out as a flex item of the provider's row.
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

  return (
    <>
      <SidebarProvider
        defaultOpen
        dir={ADMIN_SHELL_DIR}
        className="bg-background text-foreground"
      >
        <AdminSidebar />
        <SidebarInset className="min-h-svh">
          <AdminTopbar />
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
    </>
  );
}