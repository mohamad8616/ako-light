"use client";

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
import { uploadMediaAction } from "@/lib/admin/actions/media";
import { MAX_UPLOAD_BYTES } from "@/lib/admin/image-sniff";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

/**
 * Uploading a file into the media library.
 *
 * The bytes go through `uploadMediaAction` — the Pass 13.5A server action — and
 * NOT through a fresh fetch to Blob. That action already owns the whole
 * contract: it re-runs `requireAdminAccess()` (the client is never the
 * authorization), validates by sniffing the leading bytes, stores through the
 * `StorageProvider` abstraction, registers the `Media` row, and cleans up the
 * stored object if the row write fails. Re-implementing any of that here would
 * be a second, drifting copy of the security-critical path.
 *
 * Scope note: ONE file at a time, images only, inside the existing 5 MB /
 * 6 MB-body limit. Multi-file queues, progress bars and direct-to-Blob large
 * video uploads are deliberately later steps — reliability over bulk.
 */

/** The types the shared validator accepts; also the file picker's filter. */
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Mirrors `TEXT_MAX` in lib/admin/schemas/common.ts, the server's own cap. */
const METADATA_MAX = 2000;

export function MediaUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [alt, setAlt] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const reset = React.useCallback(() => {
    setFile(null);
    setAlt("");
    setTitle("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // A click on the backdrop must not abandon an in-flight upload: the
      // request has already left, and closing would hide its outcome.
      if (pending) return;
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, pending, reset],
  );

  const handleFile = React.useCallback(
    (picked: File | undefined) => {
      if (!picked) return;

      // Cheap client-side gate so an obviously oversized file never leaves the
      // browser. This is NOT the security boundary — the server re-checks the
      // byte length (and sniffs the content type) regardless.
      if (picked.size > MAX_UPLOAD_BYTES) {
        setFile(null);
        setError(t("admin.error.tooLarge"));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setError(null);
      setFile(picked);
    },
    [t],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError(t("admin.media.uploadNoFile"));
      return;
    }

    setPending(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("alt", alt);
      payload.set("title", title);

      const result = await uploadMediaAction(payload);

      if (result.ok) {
        toast.success(t("admin.upload.done"));
        reset();
        onOpenChange(false);
        // The action already revalidated the section; this guarantees the grid
        // the admin is looking at re-renders with the new tile.
        router.refresh();
        return;
      }

      // Structured code -> the shared translated message, exactly like every
      // other admin failure. The first field issue wins when there is one,
      // because a bad alt text is more actionable than the generic envelope.
      const code = result.issues[0]?.code ?? result.formError;
      const message = t(`admin.error.${code}`);
      setError(message);
      toast.error(message);
    } catch {
      // The action rethrows unknown errors on purpose; the server log carries
      // the stack while the admin sees something actionable.
      setError(t("admin.error.unknown"));
      toast.error(t("admin.error.unknown"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {t("admin.media.uploadTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.media.uploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            {/* Kept visually hidden and driven by the button below, so the
                control is a real labelled button rather than a bare file input. */}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                handleFile(picked);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden="true" />
              {file
                ? t("admin.media.uploadChange")
                : t("admin.media.uploadPick")}
            </Button>
            {file ? (
              <p
                dir="ltr"
                className="text-muted-foreground truncate text-xs"
                title={file.name}
              >
                {file.name}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t("admin.media.uploadHint")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-upload-alt">
              {t("admin.media.field.alt")}
            </Label>
            <Input
              id="media-upload-alt"
              value={alt}
              maxLength={METADATA_MAX}
              disabled={pending}
              onChange={(event) => setAlt(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-upload-title">
              {t("admin.media.field.title")}
            </Label>
            <Input
              id="media-upload-title"
              value={title}
              maxLength={METADATA_MAX}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {t("admin.media.uploadCancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending || !file}>
              {pending
                ? t("admin.upload.uploading")
                : t("admin.media.uploadSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The upload affordance, in one place.
 *
 * Both the page header and the empty state need a working "Upload media"
 * button, and each needs its own dialog instance — the dialog's open state is
 * local to the trigger, so no state has to be lifted into the server-rendered
 * page just to connect a button to a modal.
 */
export function MediaUploadButton({
  variant = "default",
  size = "sm",
  className,
  label,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  /** Overrides the default label (the empty state supplies its own copy). */
  label?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Upload aria-hidden="true" />
        {label ?? t("admin.media.upload")}
      </Button>
      <MediaUploadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
