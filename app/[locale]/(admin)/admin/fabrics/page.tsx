import { redirect } from "next/navigation";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { resolveLocale } from "@/lib/seo/metadata";

export default async function LegacyFabricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(getLocalizedPath("/admin/material-items", resolveLocale(locale)));
}
