"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createSocialLinkAction,
  destroySocialLinkAction,
  reorderSocialLinksAction,
  updateSocialLinkAction,
} from "@/lib/admin/actions/site-settings";
import { NAME_MAX } from "@/lib/admin/schemas/common";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { SocialLinkDto } from "@/lib/repositories/site-settings";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import * as React from "react";

/**
 * The Social Links half of /admin/settings.
 *
 * Rows are DATA: a platform key, a label, a URL, an order and an active flag.
 * No icon is stored or chosen here — the footer maps the platform key to an
 * icon and renders a neutral fallback for a key it does not know, which is what
 * lets a new platform be added without touching this screen.
 *
 * Only ACTIVE links reach the public site; deactivating is the way to hide a
 * link without losing it.
 */
export function SocialLinksManager({ links }: { links: SocialLinkDto[] }) {
  const { t } = useLanguage();
  const { run, pending } = useCrudSubmit();

  const [platform, setPlatform] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [deleting, setDeleting] = React.useState<SocialLinkDto | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(
      () =>
        createSocialLinkAction({
          platform: platform.trim().toLowerCase(),
          label: label.trim(),
          url: url.trim(),
          // New links go to the end of the list.
          sortOrder: links.length,
          isActive: true,
        }),
      { successMessage: t("admin.crud.created") },
    );
    if (result?.ok) {
      setPlatform("");
      setLabel("");
      setUrl("");
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    const ids = links.map((link) => link.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => reorderSocialLinksAction(ids), {
      successMessage: t("admin.table.saved"),
    });
  };

  return (
    <section className="border-border bg-card space-y-4 rounded-lg border p-4 md:p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("admin.settings.social")}</h3>
        <p className="text-muted-foreground text-xs">
          {t("admin.settings.socialHint")}
        </p>
      </div>

      {links.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-xs">
          {t("admin.settings.socialEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, index) => (
            <SocialLinkRow
              key={link.id}
              link={link}
              index={index}
              total={links.length}
              disabled={pending}
              onMove={(delta) => void move(index, delta)}
              onDelete={() => setDeleting(link)}
            />
          ))}
        </ul>
      )}

      {/* Add */}
      <form
        className="border-border space-y-3 border-t pt-4"
        onSubmit={handleCreate}
      >
        <p className="text-xs font-medium">{t("admin.settings.socialAdd")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="social-platform">
              {t("admin.settings.socialPlatform")}
            </Label>
            <Input
              id="social-platform"
              value={platform}
              placeholder="instagram"
              dir="ltr"
              disabled={pending}
              onChange={(event) => setPlatform(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-label">
              {t("admin.settings.socialLabel")}
            </Label>
            <Input
              id="social-label"
              value={label}
              maxLength={NAME_MAX}
              disabled={pending}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-url">
              {t("admin.settings.socialUrl")}
            </Label>
            <Input
              id="social-url"
              value={url}
              dir="ltr"
              disabled={pending}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={
              pending ||
              platform.trim() === "" ||
              label.trim() === "" ||
              url.trim() === ""
            }
          >
            {t("admin.crud.add")}
          </Button>
        </div>
      </form>

      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await run(() => destroySocialLinkAction(deleting.id), {
            successMessage: t("admin.crud.deleted"),
          });
          if (result?.ok) setDeleting(null);
        }}
      />
    </section>
  );
}

/** One link: inline-editable label/url, visibility toggle, order, delete. */
function SocialLinkRow({
  link,
  index,
  total,
  disabled,
  onMove,
  onDelete,
}: {
  link: SocialLinkDto;
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const { run, pending } = useCrudSubmit();

  const [label, setLabel] = React.useState(link.label);
  const [url, setUrl] = React.useState(link.url);

  const dirty = label !== link.label || url !== link.url;
  const busy = pending || disabled;

  const save = () =>
    run(() => updateSocialLinkAction(link.id, { label, url }), {
      successMessage: t("admin.table.saved"),
    });

  const toggle = (isActive: boolean) =>
    run(() => updateSocialLinkAction(link.id, { isActive }), {
      successMessage: isActive
        ? t("admin.settings.socialEnabled")
        : t("admin.settings.socialDisabled"),
    });

  return (
    <li className="border-border flex flex-col gap-2 rounded-md border p-2 md:flex-row md:items-center md:gap-3">
      <Badge variant="outline" className="shrink-0 font-mono" dir="ltr">
        {link.platform}
      </Badge>

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <Input
          value={label}
          maxLength={NAME_MAX}
          disabled={busy}
          aria-label={t("admin.settings.socialLabel")}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Input
          value={url}
          dir="ltr"
          disabled={busy}
          aria-label={t("admin.settings.socialUrl")}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-1">
        {dirty ? (
          <Button type="button" size="sm" disabled={busy} onClick={save}>
            {t("admin.crud.save")}
          </Button>
        ) : null}

        <Switch
          checked={link.isActive}
          disabled={busy}
          aria-label={t("admin.settings.socialActive")}
          onCheckedChange={(checked) => void toggle(checked)}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy || index === 0}
          aria-label={t("admin.crud.moveUp")}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy || index === total - 1}
          aria-label={t("admin.crud.moveDown")}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("text-destructive hover:bg-destructive/10")}
          disabled={busy}
          aria-label={t("admin.table.delete")}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
