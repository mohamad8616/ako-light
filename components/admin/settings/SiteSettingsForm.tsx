"use client";

import { MediaPickerField } from "@/components/admin/settings/MediaPickerField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSiteSettingsAction } from "@/lib/admin/actions/site-settings";
import { EMAIL_MAX, NAME_MAX, PHONE_MAX, TEXT_MAX } from "@/lib/admin/schemas/common";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { SiteSettingsDto } from "@/lib/repositories/site-settings";
import * as React from "react";

/**
 * The Branding + Contact half of /admin/settings.
 *
 * Brand assets are held as **Media ids** and persisted as relationships — the
 * URL only ever exists for the preview. Contact text is bilingual like the rest
 * of the site (the project stores user-visible copy as `{ en, fa }` jsonb), so
 * each field renders the two locales side by side rather than inventing a
 * single-language exception.
 *
 * Submitting goes through the shared `useCrudSubmit`, so the toast, the pending
 * state and the structured-error mapping behave exactly like every other admin
 * form.
 */
export function SiteSettingsForm({
  settings,
}: {
  settings: SiteSettingsDto | null;
}) {
  const { t } = useLanguage();
  const { run, pending } = useCrudSubmit();

  const [logoMediaId, setLogoMediaId] = React.useState<string | null>(
    settings?.logoMediaId ?? null,
  );
  const [logoUrl, setLogoUrl] = React.useState<string | null>(
    settings?.logoUrl ?? null,
  );
  const [faviconMediaId, setFaviconMediaId] = React.useState<string | null>(
    settings?.faviconMediaId ?? null,
  );
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(
    settings?.faviconUrl ?? null,
  );

  const [siteName, setSiteName] = React.useState({
    en: settings?.siteName.en ?? "",
    fa: settings?.siteName.fa ?? "",
  });
  const [siteDescription, setSiteDescription] = React.useState({
    en: settings?.siteDescription.en ?? "",
    fa: settings?.siteDescription.fa ?? "",
  });
  const [address, setAddress] = React.useState({
    en: settings?.address?.en ?? "",
    fa: settings?.address?.fa ?? "",
  });
  const [phone, setPhone] = React.useState(settings?.phone ?? "");
  const [email, setEmail] = React.useState(settings?.email ?? "");

  /** A bilingual pair is stored as null when both locales are blank. */
  const pairOrNull = (pair: { en: string; fa: string }) =>
    pair.en.trim() === "" && pair.fa.trim() === "" ? null : pair;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(() =>
      updateSiteSettingsAction({
        siteName,
        siteDescription,
        logoMediaId,
        faviconMediaId,
        phone: phone.trim() === "" ? null : phone,
        email: email.trim() === "" ? null : email,
        address: pairOrNull(address),
      }),
    );
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Branding */}
      <section className="border-border bg-card space-y-5 rounded-lg border p-4 md:p-5">
        <h3 className="text-sm font-semibold">
          {t("admin.settings.branding")}
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <MediaPickerField
            label={t("admin.settings.field.logo")}
            hint={t("admin.settings.field.logoHint")}
            fallbackHint={t("admin.settings.field.logoFallback")}
            mediaId={logoMediaId}
            previewUrl={logoUrl}
            onChange={(next) => {
              setLogoMediaId(next.mediaId);
              setLogoUrl(next.url);
            }}
          />
          <MediaPickerField
            label={t("admin.settings.field.favicon")}
            hint={t("admin.settings.field.faviconHint")}
            fallbackHint={t("admin.settings.field.faviconFallback")}
            mediaId={faviconMediaId}
            previewUrl={faviconUrl}
            onChange={(next) => {
              setFaviconMediaId(next.mediaId);
              setFaviconUrl(next.url);
            }}
          />
        </div>

        <LocalizedInput
          label={t("admin.settings.field.siteName")}
          value={siteName}
          onChange={setSiteName}
          maxLength={NAME_MAX}
          disabled={pending}
        />
        <LocalizedInput
          label={t("admin.settings.field.siteDescription")}
          value={siteDescription}
          onChange={setSiteDescription}
          maxLength={TEXT_MAX}
          disabled={pending}
          multiline
        />
      </section>

      {/* Contact */}
      <section className="border-border bg-card space-y-5 rounded-lg border p-4 md:p-5">
        <h3 className="text-sm font-semibold">
          {t("admin.settings.contact")}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">
              {t("admin.settings.field.phone")}
            </Label>
            <Input
              id="settings-phone"
              value={phone}
              maxLength={PHONE_MAX}
              disabled={pending}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">
              {t("admin.settings.field.email")}
            </Label>
            <Input
              id="settings-email"
              value={email}
              maxLength={EMAIL_MAX}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <LocalizedInput
          label={t("admin.settings.field.address")}
          value={address}
          onChange={setAddress}
          maxLength={TEXT_MAX}
          disabled={pending}
          multiline
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {t("admin.crud.save")}
        </Button>
      </div>
    </form>
  );
}

/**
 * One bilingual field, rendered as an `en` / `fa` pair.
 *
 * Kept local rather than reaching for the catalog field kit: those fields bind
 * through a `FormProvider` and a nested form path, and this screen is a single
 * flat object with no list/array semantics to reuse.
 */
function LocalizedInput({
  label,
  value,
  onChange,
  maxLength,
  disabled,
  multiline,
}: {
  label: string;
  value: { en: string; fa: string };
  onChange: (next: { en: string; fa: string }) => void;
  maxLength: number;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {(["en", "fa"] as const).map((locale) => {
          const id = `${label}-${locale}`;
          const shared = {
            id,
            value: value[locale],
            maxLength,
            disabled,
            dir: locale === "fa" ? ("rtl" as const) : ("ltr" as const),
          };
          return (
            <div key={locale} className="space-y-1.5">
              <Label htmlFor={id} className="text-xs uppercase">
                {locale}
              </Label>
              {multiline ? (
                <textarea
                  {...shared}
                  rows={3}
                  className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-ring/30 w-full rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
                  onChange={(event) =>
                    onChange({ ...value, [locale]: event.target.value })
                  }
                />
              ) : (
                <Input
                  {...shared}
                  onChange={(event) =>
                    onChange({ ...value, [locale]: event.target.value })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
