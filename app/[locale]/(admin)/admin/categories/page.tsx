import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export default function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <AdminPlaceholderPage params={params} labelKey="admin.nav.categories" />;
}
