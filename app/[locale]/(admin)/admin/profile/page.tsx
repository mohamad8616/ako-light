import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminText } from "@/components/admin/AdminText";
import { FormCard } from "@/components/admin/catalog/fields/form";
import { ChangePasswordForm } from "@/components/admin/profile/ChangePasswordForm";
import { formatDate } from "@/components/admin/media/format";
import { getAdminIdentity, requireAdminAccess } from "@/lib/admin/access";
import { prisma } from "@/lib/db/prisma";
import { getAdminDictionary } from "@/lib/i18n/admin-translations";
import { isLocale, type Locale } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";

/**
 * The signed-in staff account's own profile (Pass C.2).
 *
 * ── Access ──────────────────────────────────────────────────────────────────
 *
 * `requireAdminAccess(locale)` runs BEFORE any read: it resolves the session and
 * redirects to the localized `/sign-in?denied=1` unless the caller holds an
 * admin-level role. A plain customer who types the URL is bounced here — the
 * sidebar having no link is a convenience, never the control. `proxy.ts` and the
 * `(admin)` layout are in front of this as well, so this is the third layer, not
 * the only one.
 *
 * `getAdminIdentity()` then supplies the account id. That id comes from the
 * SESSION, so this page can only ever read the caller's own row — there is no
 * route parameter or query string that could point it at somebody else.
 *
 * ── Fields ──────────────────────────────────────────────────────────────────
 *
 * Only name, email, role, `createdAt` and `emailVerified` are selected. No
 * password (it lives on `Account`, which is not touched), no session rows, no
 * tokens, no internal ids beyond the session's own.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await requireAdminAccess(locale);

  const identity = await getAdminIdentity();
  if (!identity) notFound();

  const account = await prisma.user.findUnique({
    where: { id: identity.id },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  });

  // The session outlived its row. Render the not-found boundary rather than an
  // error that would leak the id or the Prisma message.
  if (!account) notFound();

  const t = getAdminDictionary(locale as Locale);

  const roleLabel =
    account.role === "owner"
      ? t["admin.role.owner"]
      : account.role === "admin"
        ? t["admin.role.admin"]
        : account.role;

  const rows: { label: string; value: string; ltr?: boolean }[] = [
    { label: t["admin.profile.field.name"], value: account.name },
    // An email is always LTR, whatever the surrounding direction — `dir="ltr"`
    // rather than `dir="auto"`, so a Persian display name cannot flip it.
    { label: t["admin.profile.field.email"], value: account.email, ltr: true },
    { label: t["admin.profile.field.role"], value: roleLabel },
    {
      label: t["admin.profile.field.createdAt"],
      // The project's existing locale-aware formatter rather than a sliced ISO
      // string: `fa-IR` renders the PERSIAN CALENDAR, which is what a
      // Persian-first admin expects to read. (It lives beside the media screen
      // because that was the first place a date was shown; it is a generic
      // `Intl` helper, not a media concern.)
      value: formatDate(account.createdAt.toISOString(), locale as Locale),
      ltr: locale !== "fa",
    },
    {
      label: t["admin.profile.field.emailVerified"],
      value: account.emailVerified
        ? t["admin.profile.verified.yes"]
        : t["admin.profile.verified.no"],
    },
  ];

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.profile.title"
          descriptionKey="admin.profile.description"
        />

        <FormCard title={t["admin.profile.account.card"]}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="space-y-1">
                <dt className="text-muted-foreground text-xs font-medium">
                  <AdminText>{row.label}</AdminText>
                </dt>
                <dd className="text-sm">
                  {/* An email or an ISO date is always LTR, whatever the
                      surrounding direction, so it gets an explicit `dir="ltr"`
                      rather than `dir="auto"` — a neighbouring Persian word must
                      not be able to flip it. */}
                  {row.ltr ? (
                    <span dir="ltr">{row.value}</span>
                  ) : (
                    <AdminText>{row.value}</AdminText>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </FormCard>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
