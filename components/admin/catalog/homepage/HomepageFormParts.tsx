"use client";

/**
 * Building blocks shared by the five homepage slot forms.
 *
 * Three of the slots (FlagshipOne, ProjectBanner, ProjectDarkBackground) have
 * the exact same upper half — enabled switch, reference/override toggle, and an
 * entity picker — and all three wrap their override inputs in the same card,
 * so that shape lives here instead of being copied three times. The card is
 * ALWAYS rendered: the repository keeps the override columns when a slot returns
 * to reference mode, so hiding them would look like the edits were lost.
 *
 * Every label/hint is an already-translated string passed in by the caller (or
 * looked up here through `useLanguage`) — this kit never holds raw copy.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  SelectField,
  type SelectOption,
} from "@/components/admin/catalog/fields/SelectField";
import { SwitchField } from "@/components/admin/catalog/fields/ScalarFields";
import { Button, buttonVariants } from "@/components/ui/button";
import { HOMEPAGE_HREF } from "@/lib/admin/homepage";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * `enabled` + `mode` + the linked entity, for a slot that references one.
 *
 * The mode options are the two literals of the repository's `FeatureMode`
 * (spelled out rather than imported: the generated Prisma client is server-only).
 */
export function HomepageSlotFields({
  entityName,
  entityLabel,
  entityOptions,
  entityHint,
}: {
  /** The field holding the linked entity's id — "flagshipId" or "projectId". */
  entityName: string;
  entityLabel: string;
  /** Options for the entity picker, labelled in the active language. */
  entityOptions: SelectOption[];
  /** Overrides the shared CTA hint when a slot needs a different one. */
  entityHint?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <SwitchField
        name="enabled"
        label={t("admin.homepage.field.enabled")}
        description={t("admin.homepage.field.enabledHint")}
      />
      <SelectField
        name="mode"
        label={t("admin.homepage.field.mode")}
        hint={t("admin.homepage.field.modeHint")}
        options={[
          { value: "reference", label: t("admin.homepage.mode.reference") },
          { value: "override", label: t("admin.homepage.mode.override") },
        ]}
      />
      <SelectField
        name={entityName}
        label={entityLabel}
        hint={entityHint ?? t("admin.homepage.field.ctaHint")}
        options={entityOptions}
      />
    </div>
  );
}

/** The card that wraps a slot's override inputs, with the shared guidance. */
export function HomepageOverrideCard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <FormCard
      title={t("admin.homepage.card.override")}
      description={t("admin.homepage.card.overrideHint")}
    >
      <div className="space-y-5">{children}</div>
    </FormCard>
  );
}

/**
 * The save bar every slot form ends with: "cancel" returns to the homepage hub
 * (a slot is a singleton, so there is no list page behind it) and the submit
 * button reflects the shared `pending` flag from useCrudSubmit.
 */
export function HomepageFormActions({ pending }: { pending: boolean }) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-end gap-2">
      <LocaleLink
        href={HOMEPAGE_HREF}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {t("admin.crud.cancel")}
      </LocaleLink>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("admin.table.saving") : t("admin.crud.save")}
      </Button>
    </div>
  );
}
