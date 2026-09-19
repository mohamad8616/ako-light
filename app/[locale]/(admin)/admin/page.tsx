import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import {
  getCollectionCount,
  getDesignerCount,
  getFlagshipCount,
  getMaterialCount,
  getProductCount,
  getProjectCount,
} from "@/lib/repositories/admin";
import { notFound } from "next/navigation";

const statConfig = [
  { key: "admin.stat.products", getter: getProductCount },
  { key: "admin.stat.designers", getter: getDesignerCount },
  { key: "admin.stat.collections", getter: getCollectionCount },
  { key: "admin.stat.materials", getter: getMaterialCount },
  { key: "admin.stat.flagships", getter: getFlagshipCount },
  { key: "admin.stat.projects", getter: getProjectCount },
] as const;

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const stats = await Promise.all(
    statConfig.map(async ({ key, getter }) => ({
      key,
      value: await getter(),
    })),
  );

  const t = translations[locale === "en" ? "en" : "fa"];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-semibold">
          {t["admin.overview.title"]}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t["admin.overview.subtitle"]}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="border-border bg-card rounded-xl border p-5 shadow-sm"
          >
            <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
              {t[stat.key as keyof typeof t]}
            </p>
            <p className="text-foreground mt-3 text-3xl font-semibold">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
