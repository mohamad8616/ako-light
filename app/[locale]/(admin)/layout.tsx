import AdminLanguageProvider from "@/components/admin/AdminLanguageProvider";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminAccess } from "@/lib/admin/access";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { adminTranslations } from "@/lib/i18n/admin-strings";
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
 * dashboard shell is RTL for EVERY locale, including the unprefixed English
 * `/admin`, which used to render LTR and flip the sidebar to the left. The
 * sidebar is docked on the
 * right in RTL because the shared sidebar's fixed layer relies on physical
 * left/right positioning — in an RTL document with side="left" it would
 * overlay the content instead of sitting beside it.
 *
 * DirectionProvider restates the same direction for Base UI's portalled
 * primitives: dialog/select/menu render into document.body, outside the
 * shell's dir wrapper, so on English admin routes they would otherwise
 * inherit the document's ltr (see components/ui/direction.tsx).
 *
 * The sonner <Toaster /> lives here because every admin CRUD screen reports
 * through useCrudSubmit's toast.success()/toast.error() — without a mounted
 * Toaster those calls were silent. It portals to document.body, so its
 * position inside this tree only decides WHO owns it (the admin shell), not
 * where it paints.
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
  await requireAdminAccess(locale);

  const dir = ADMIN_SHELL_DIR;

  // The admin dictionary is selected HERE, on the server, from the route's
  // locale. Admin screens resolve only `admin.*` keys (297 admin keys, 0 public
  // keys — verified), so the public dictionary is not sent to admin routes at
  // all, and only the active locale is. See
  // components/admin/AdminLanguageProvider.tsx.
  return (
    <AdminLanguageProvider
      locale={locale}
      dictionary={adminTranslations[locale]}
    >
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
          <Toaster position="top-center" closeButton />
        </SidebarProvider>
      </DirectionProvider>
    </AdminLanguageProvider>
  );
}
