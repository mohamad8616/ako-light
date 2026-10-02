"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import {
  formatBytes,
  formatDate,
  formatDimensions,
  shortType,
} from "@/components/admin/media/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  destroyMediaAction,
  updateMediaMetadataAction,
} from "@/lib/admin/actions/media";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MediaLibraryItem } from "@/lib/media/library";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import * as React from "react";

/** Mirrors `TEXT_MAX` in lib/admin/schemas/common.ts, the server's own cap. */
const METADATA_MAX = 2000;

/**
 * The media detail panel — metadata editing plus the guarded delete.
 *
 * TWO DELIBERATE BOUNDARIES:
 *
 * 1. **Only alt/title are editable.** They are the fields the `Media` model
 *    calls human-editable; `storageKey`, `url`, `mimeType` and `size` describe
 *    the object in the store, and a form able to redefine them would
 *    desynchronize the row from the file it points at. They are rendered as
 *    read-only facts instead, which is also why they are shown at all.
 *
 * 2. **Delete goes through the server's reference guard, not around it.** The
 *    panel does not decide whether the asset is safe to remove — it calls
 *    `destroyMediaAction`, and a refusal comes back as the `inUse` code that
 *    `useCrudSubmit` turns into the shared message. Checking here first would
 *    duplicate a rule that has to live on the server anyway (a server action is
 *    reachable by direct POST).
 *
 * The parent mounts this only while an item is selected and keys it by id, so
 * the form state resets between tiles without any prop-syncing effect.
 */
export function MediaDetailsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: MediaLibraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const { run, pending } = useCrudSubmit();

  // Seeded from the item at mount; the parent's `key={item.id}` is what makes
  // "a different tile" a different mount rather than a stale form.
  const [alt, setAlt] = React.useState(item.alt ?? "");
  const [title, setTitle] = React.useState(item.title ?? "");
  const [confirming, setConfirming] = React.useState(false);

  const altText = item.alt || item.title || item.filename;
  const dimensions = formatDimensions(item.width, item.height);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // No explicit successMessage: the shared "saved" copy is exactly right, and
    // reusing it keeps this screen's feedback identical to every other CRUD form.
    await run(() => updateMediaMetadataAction(item.id, { alt, title }));
  };

  const handleDelete = async () => {
    const result = await run(() => destroyMediaAction(item.id), {
      successMessage: t("admin.crud.deleted"),
    });
    // Only close on success: a refusal (the asset is in use) must stay on
    // screen with the dialog open, so the message has somewhere to land.
    if (result?.ok) {
      setConfirming(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {t("admin.media.detailsTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.media.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-md">
            {item.mediaType === "video" ? (
              /*
               * The details panel is where a video is actually PLAYABLE — the
               * grid tile only paints a still first frame. `controls` is
               * correct here (unlike the tile) because the panel has no
               * competing click target and the admin is inspecting the asset.
               */
              <video
                src={item.url}
                className="absolute inset-0 h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <Image
                src={item.url}
                alt={altText}
                fill
                sizes="(max-width: 640px) 92vw, 32rem"
                className="object-contain"
              />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <Fact label={t("admin.media.info.type")}>
              {shortType(item.mimeType)}
            </Fact>
            <Fact label={t("admin.media.info.size")}>
              {formatBytes(item.size)}
            </Fact>
            <Fact label={t("admin.media.info.dimensions")}>
              {dimensions ? (
                <span dir="ltr" className="tabular-nums">
                  {dimensions}
                </span>
              ) : (
                "—"
              )}
            </Fact>
            <Fact label={t("admin.media.info.uploaded")}>
              {formatDate(item.createdAt, lang)}
            </Fact>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted-foreground">
                {t("admin.media.info.url")}
              </dt>
              <dd
                dir="ltr"
                className="truncate font-mono text-[11px]"
                title={item.url}
              >
                {item.url}
              </dd>
            </div>
          </dl>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="media-detail-alt">
                {t("admin.media.field.alt")}
              </Label>
              <Input
                id="media-detail-alt"
                value={alt}
                maxLength={METADATA_MAX}
                disabled={pending}
                onChange={(event) => setAlt(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="media-detail-title">
                {t("admin.media.field.title")}
              </Label>
              <Input
                id="media-detail-title"
                value={title}
                maxLength={METADATA_MAX}
                disabled={pending}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setConfirming(true)}
              >
                <Trash2 aria-hidden="true" />
                {t("admin.table.delete")}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {t("admin.crud.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("admin.media.deleteTitle")}
        description={t("admin.media.deleteDescription")}
        onConfirm={handleDelete}
      />
    </>
  );
}

/** One read-only fact: a muted label above its value. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{children}</dd>
    </div>
  );
}
