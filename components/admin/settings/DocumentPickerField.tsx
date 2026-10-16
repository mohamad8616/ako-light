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
import { Label } from "@/components/ui/label";
import {
  listDocumentsForPickerAction,
  type DocumentPickerItem,
} from "@/lib/admin/actions/documents";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { DOCUMENT_ACCEPT } from "@/lib/media/document-upload-client";
import { cn } from "@/lib/utils";
import { FileText, Search } from "lucide-react";
import { toast } from "sonner";
import * as React from "react";

/**
 * The catalogue-link value a picker/upload hands back.
 *
 * `url` is the stored object URL and `name` the presentable filename — the same
 * pair `/admin/catalogue` keeps for its documents, because the download route
 * needs both for `Content-Disposition`. Documents are NOT Media rows (see the
 * `CatalogueDocument` note in prisma/schema.prisma), so this field reports a
 * URL, not a media id.
 */
export interface CatalogueDocumentValue {
  url: string;
  name: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * The reusable DOCUMENT picker.
 *
 * A chooser, not a second library: it calls the SAME authorised
 * `listDocumentsForPickerAction` that wraps `listCatalogueDocuments`, so the
 * dialog can never show a different set of files than the registry holds.
 * Search and paging run in the database, exactly as in the media picker — the
 * dialog is handed one page, never the whole table.
 *
 * This is the "option 1" the catalogue-link field offers: pick an already
 * uploaded PDF/PowerPoint instead of pasting a URL or re-uploading a file.
 */
export function DocumentPickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: DocumentPickerItem) => void;
  /** Highlighted as already chosen. */
  selectedUrl?: string | null;
}) {
  const { t } = useLanguage();
  const [items, setItems] = React.useState<DocumentPickerItem[]>([]);
  const [term, setTerm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listDocumentsForPickerAction({ search, page: 1 });
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

  // ONE effect covers both the initial open and the debounced search — the
  // same shape as MediaPickerDialog, and for the same reason (a synchronous
  // setState-on-mount effect is a cascading render React rejects).
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => void load(term), 350);
    return () => clearTimeout(id);
  }, [term, open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-admin-shell="" dir={ADMIN_SHELL_DIR} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {t("admin.settings.documentPickerTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.settings.documentPickerDescription")}
          </DialogDescription>
        </DialogHeader>

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
              {loading || !loaded
                ? t("admin.settings.pickerLoading")
                : t("admin.settings.documentPickerEmpty")}
            </p>
          ) : (
            <ul aria-busy={loading} className={cn("space-y-2", loading && "opacity-60")}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    aria-label={`${t("admin.settings.pickerSelect")}: ${item.filename}`}
                    aria-pressed={item.url === selectedUrl}
                    className={cn(
                      "border-border hover:bg-muted/60 focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border p-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      item.url === selectedUrl && "border-primary ring-primary ring-1",
                    )}
                  >
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                      <FileText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        dir="ltr"
                        className="block truncate text-xs font-medium"
                        title={item.filename}
                      >
                        {item.filename}
                      </span>
                      <span className="text-muted-foreground block text-[11px] uppercase">
                        {item.extension} · {formatBytes(item.size)}
                      </span>
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
 * The catalogue-link control: TWO ways to set the file, no URL input.
 *
 *   1. Choose an already-uploaded document from the picker dialog.
 *   2. Upload a new file (which also registers it in the registry, so it shows
 *      up under option 1 next time).
 *
 * The whole point of the field is that the operator never pastes a URL: the
 * catalogue file is an object in storage, and both paths report the same
 * `{ url, name }` pair back to the form.
 */
export function DocumentPickerField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: CatalogueDocumentValue;
  onChange: (next: CatalogueDocumentValue) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setUploading(true);
      try {
        // Imported lazily so the picker field's chunk does not pull the whole
        // document upload client in until the operator actually uploads.
        const { uploadCatalogueDocumentFile } = await import(
          "@/lib/media/document-upload-client"
        );
        const outcome = await uploadCatalogueDocumentFile(file);
        if (!outcome.ok) {
          toast.error(t(`admin.error.${outcome.code}`));
          return;
        }
        onChange({ url: outcome.url, name: outcome.name });
        toast.success(t("admin.upload.documentDone"));
      } catch {
        toast.error(t("admin.error.unknown"));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, t],
  );

  const hasValue = value.url.trim() !== "" || value.name.trim() !== "";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => setOpen(true)}
        >
          {t("admin.settings.documentSelect")}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? t("admin.upload.uploading")
            : hasValue
              ? t("admin.upload.documentReplace")
              : t("admin.upload.documentPick")}
        </Button>

        {hasValue ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            disabled={disabled || uploading}
            onClick={() => onChange({ url: "", name: "" })}
          >
            {t("admin.settings.clearMedia")}
          </Button>
        ) : null}
      </div>

      <p
        dir="ltr"
        className="text-muted-foreground max-w-full truncate text-xs"
        title={value.name || value.url}
      >
        {hasValue
          ? value.name || value.url.split("/").pop() || value.url
          : t("admin.upload.documentEmpty")}
      </p>

      {hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}

      <DocumentPickerDialog
        open={open}
        onOpenChange={setOpen}
        selectedUrl={value.url}
        onSelect={(item) => onChange({ url: item.url, name: item.filename })}
      />
    </div>
  );
}
