import Link from "@/lib/i18n/Link";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { notFound } from "next/navigation";

export default async function AdminPlaceholderPage({
  params,
  title,
}: {
  params: Promise<{ locale: string }>;
  title: string;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = translations[locale === "en" ? "en" : "fa"];

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="border-border bg-card w-full max-w-xl rounded-2xl border p-8 text-center shadow-sm">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
          {title}
        </p>
        <h2 className="text-foreground mt-4 text-3xl font-semibold">
          {t["admin.placeholder.title"]}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          {t["admin.placeholder.description"]}
        </p>
        <Link
          href="/admin"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition"
        >
          {t["admin.placeholder.back"]}
        </Link>
      </div>
    </div>
  );
}
