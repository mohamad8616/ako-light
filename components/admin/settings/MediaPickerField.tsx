"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  listMediaForPickerAction,
  type MediaPickerItem,
} from "@/lib/admin/actions/media";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { ImageOff, Search } from "lucide-react";
import Image from "next/image";
import * as React from "react";

/**
 * The reusable Media picker (Pass 13.5D).
 *
 * A chooser, not a second media library: it calls the SAME authorised
 * `listMediaForPickerAction` that wraps the library's `listMediaPage`, so the
 * dialog can never show a different set of files than /admin/media does. Search
 * and paging run in the database, exactly as in the library — the dialog is
 * handed one page, never the whole table.
 *
 * It reports a **Media id**, not a URL. The whole point of this pass is that
 * brand assets are relationships; a component that handed back a URL would
 * invite callers to store the URL instead.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaPickerItem) => void;
  /** Highlighted as already chosen. */
  selectedId?: string | null;
}) {
  const { t } = useLanguage();
  const [items, setItems] = React.useState<MediaPickerItem[]>([]);
  const [term, setTerm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listMediaForPickerAction({ search, page: 1 });
        if (result.ok) {
          setItems(result.data.items);
          setLoaded(true);
        } else {
          setError(t(`admin.error.${result.formError}`));
        }
      } catch {
        setError(t("admin.error.unknown"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  // ONE effect covers both cases — the initial load when the dialog opens and
  // the debounced search as the term changes — so there is no separate
  // synchronous setState-on-mount effect (which React rejects as a cascading
  // render). The 350 ms cadence matches the media library grid.
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => void load(term), 350);
    return () => clearTimeout(id);
  }, [term, open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {t("admin.settings.pickerTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.settings.pickerDescription")}
          </DialogDescription>
        </DialogHeader>

        {/*
          Search, error and the grid all live in the scrolling region, so a full
          page of tiles scrolls under the pinned title and never pushes the
          Cancel button off screen. `px-6 pb-6` matches the header inset.
        */}
        <DialogBody className="space-y-4 px-6 pb-6">
          <div className="relative w-full">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("admin.media.search")}
              aria-label={t("admin.media.search")}
              className="h-8 ps-8"
            />
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}

          {items.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-xs">
              {loading
                ? t("admin.settings.pickerLoading")
                : loaded
                  ? t("admin.media.noResults")
                  : t("admin.settings.pickerLoading")}
            </p>
          ) : (
            /*
              The grid no longer needs its own `max-h-[50vh]` scroll: the body
              above it already caps the region and owns the scrollbar. Keeping
              the grid's own cap would produce a scroll area inside a scroll
              area, which traps the wheel gesture halfway down the dialog.
            */
            <ul
              aria-busy={loading}
              className={cn(
                "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6",
                loading && "opacity-60",
              )}
            >
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    aria-label={`${t("admin.settings.pickerSelect")}: ${item.filename}`}
                    aria-pressed={item.id === selectedId}
                    className={cn(
                      "focus-visible:ring-ring w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      item.id === selectedId && "ring-primary ring-2 ring-offset-2",
                    )}
                  >
                    <span className="bg-muted relative block aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={item.url}
                        alt={item.alt || item.title || item.filename}
                        fill
                        sizes="(max-width: 640px) 33vw, 16vw"
                        className="object-cover"
                      />
                    </span>
                    <span className="mt-1 block truncate text-[11px]">
                      {item.filename}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>

        <DialogFooter className="justify-end px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("admin.crud.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One brand-asset slot: a preview, a picker, and a clear button.
 *
 * Reports `{ mediaId, url }` upward. `mediaId` is what gets persisted; `url` is
 * only for the preview, because the DTO the page already holds carries it.
 */
export function MediaPickerField({
  label,
  hint,
  fallbackHint,
  mediaId,
  previewUrl,
  onChange,
}: {
  label: string;
  hint?: string;
  /** Shown when nothing is selected — describes the built-in fallback. */
  fallbackHint: string;
  mediaId: string | null;
  previewUrl: string | null;
  onChange: (next: { mediaId: string | null; url: string | null }) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <div className="flex items-start gap-3">
        <div className="border-border bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-20 object-contain"
              loading="lazy"
            />
          ) : (
            <ImageOff
              aria-hidden="true"
              className="text-muted-foreground size-5"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              {mediaId ? t("admin.settings.changeMedia") : t("admin.settings.selectMedia")}
            </Button>
            {mediaId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onChange({ mediaId: null, url: null })}
              >
                {t("admin.settings.clearMedia")}
              </Button>
            ) : null}
          </div>

          <p className="text-muted-foreground text-[11px]">
            {mediaId ? (hint ?? "") : fallbackHint}
          </p>
        </div>
      </div>

      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        selectedId={mediaId}
        onSelect={(item) => onChange({ mediaId: item.id, url: item.url })}
      />
    </div>
  );
}
