import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { HOMEPAGE_SLOT_META, homepageSlotHref } from "@/lib/admin/homepage";
import { pick } from "@/lib/i18n/localized";
import { getLocalizedPath, type Locale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import type { HomepageFeatureOverview } from "@/lib/repositories/homepage-features";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

/**
 * The homepage hub's card grid — one card per feature slot, in the order the
 * banners render on the public page.
 *
 * Server component on purpose, like every other admin list screen: the page
 * reads the slots once (getHomepageFeaturesOverview) and hands this component
 * plain, serializable DTOs, while the labels are resolved here from the page's
 * locale — so the grid never needs a client boundary just to translate itself.
 *
 * Each card answers the only question a hub can answer about a singleton slot:
 * is it on, is it referencing or overriding, which entity does it point at, and
 * when was it last saved. Everything else lives behind "Configure".
 */

/**
 * `2026-01-02T10:20:30.000Z` → `2026-01-02 10:20`.
 *
 * Deliberately not Intl-formatted: the timestamp is rendered in the server's
 * locale on every request, and a fixed ISO-ish form keeps the admin
 * authoritative without depending on the runtime's ICU data.
 */
function formatSavedAt(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export function HomepageFeaturesGrid({
  rows,
  locale,
}: {
  /** One DTO per slot, already ordered by the repository. */
  rows: HomepageFeatureOverview[];
  /** The route locale — the grid renders the site's strings, not the shell's. */
  locale: Locale;
}) {
  const t = translations[locale];

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => {
        const meta = HOMEPAGE_SLOT_META[row.id];
        const entityLabel =
          row.entityLabel == null ? null : pick(row.entityLabel, locale);
        const editHref = getLocalizedPath(homepageSlotHref(row.id), locale);

        return (
          <li
            key={row.id}
            className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm"
          >
            <div className="space-y-1">
              <h3 className="text-foreground text-sm font-semibold">
                {t[meta.labelKey]}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t[meta.descriptionKey]}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!row.configured ? (
                <Badge variant="outline">
                  {t["admin.homepage.status.notConfigured"]}
                </Badge>
              ) : row.enabled ? (
                <Badge>{t["admin.homepage.status.enabled"]}</Badge>
              ) : (
                <Badge variant="secondary">
                  {t["admin.homepage.status.disabled"]}
                </Badge>
              )}
              {row.mode ? (
                <Badge variant="outline">
                  {t[
                    row.mode === "override"
                      ? "admin.homepage.mode.override"
                      : "admin.homepage.mode.reference"
                  ]}
                </Badge>
              ) : null}
            </div>

            <div className="text-muted-foreground space-y-1 text-xs">
              {entityLabel ? (
                <p className="truncate">{entityLabel}</p>
              ) : null}
              {row.entityHref ? (
                <p dir="ltr" className="truncate font-mono text-[11px]">
                  {row.entityHref}
                </p>
              ) : null}
              {row.updatedAt ? (
                <p>
                  {t["admin.homepage.updatedAt"]}: {formatSavedAt(row.updatedAt)}
                </p>
              ) : null}
            </div>

            <div className="mt-auto flex items-center justify-end">
              <NextLink
                href={editHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                {t["admin.homepage.edit"]}
              </NextLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
