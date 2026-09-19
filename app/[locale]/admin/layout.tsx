import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { isLocale } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";

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
    <div dir="rtl" className="bg-background text-foreground min-h-screen">
      <div className="bg-background flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbar title="Dashboard" />
          <main className="bg-background flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
