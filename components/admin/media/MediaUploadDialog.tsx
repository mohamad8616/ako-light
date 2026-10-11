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
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { maxBytesFor, uploadMediaFile } from "@/lib/media/upload-client";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

/**
 * Uploading a file into the media library.
 *
 * The upload itself — which path a file takes, how each path authorises, and
 * how a failure is mapped to a code — lives in `lib/media/upload-client.ts`,
 * which the admin's media FIELDS use too (Pass D.1). This component owns only
 * the dialog around it: the file picker, the metadata inputs, the progress
 * feedback and the library refresh.
 *
 * Small files go through `uploadMediaAction` — the Pass 13.5A server action —
 * and NOT through a fresh fetch to storage. That action already owns the whole
 * contract: it re-runs `requireAdminAccess()` (the client is never the
 * authorization), validates by sniffing the leading bytes, stores through the
 * `StorageProvider` abstraction, registers the `Media` row, and cleans up the
 * stored object if the row write fails. Re-implementing any of that here would
 * be a second, drifting copy of the security-critical path.
 *
 * Large files and videos take the direct path instead, because a Server Action
 * buffers the whole payload in memory.
 */

/** The types the shared validator accepts; also the file picker's filter. */
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm";

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
  /** 0–100 while the browser is transferring bytes directly to the provider. */
  const [progress, setProgress] = React.useState<number | null>(null);
  /** Which step of the large-file flow is running, for honest feedback. */
  const [phase, setPhase] = React.useState<"idle" | "uploading" | "saving">(
    "idle",
  );

  const reset = React.useCallback(() => {
    setFile(null);
    setAlt("");
    setTitle("");
    setError(null);
    setProgress(null);
    setPhase("idle");
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
      // byte length (and sniffs the content type) regardless, and on the direct
      // path the provider enforces the ceiling on the wire.
      if (picked.size > maxBytesFor(picked)) {
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

    /**
     * ONE call, TWO paths — the decision lives in `uploadMediaFile`.
     *
     * Small images keep the existing Server Action flow; anything large — and
     * every video — goes straight from the browser to the provider, because a
     * Server Action buffers the whole payload in memory on the Next server,
     * which is exactly the bottleneck that path removes. The switch is a SIZE,
     * not a type: a 5 MB image still travels the old way, and a video is not
     * worth a second code path just because it is small.
     *
     * The helper never throws, so there is no catch here — an unexpected
     * failure comes back as the `unknown` code, which is the same message a
     * server-side storage failure produces.
     */
    const outcome = await uploadMediaFile(file, {
      alt,
      title,
      onProgress: setProgress,
      onPhase: setPhase,
    });

    if (outcome.ok) {
      toast.success(t("admin.upload.done"));
      reset();
      onOpenChange(false);
      // The action already revalidated the section; this guarantees the grid
      // the admin is looking at re-renders with the new tile.
      router.refresh();
    } else {
      // Structured code -> the shared translated message, exactly like every
      // other admin failure.
      const message = t(`admin.error.${outcome.code}`);
      setError(message);
      toast.error(message);
    }

    setPending(false);
    // Progress only ever describes the run that just finished; leaving it set
    // would show a stale bar next to a fresh file picker.
    setPhase("idle");
    setProgress(null);
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

        {/*
          The body keeps the standard px-6 inset so the fields line up with the
          header, and it is the only scrolling region — a long filename list or
          the progress block can never push the Cancel/Upload row off screen.
          The form element stays INSIDE the body because the hidden file input
          and the submit button are both its descendants.
        */}
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
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

            {/*
              Honest progress for the large-file flow. The admin is told which
              step is running — a 200 MB transfer followed by a silent pause while
              the row is written would look like a hang.
            */}
            {phase !== "idle" ? (
              <div className="space-y-1.5" aria-live="polite">
                <p className="text-muted-foreground text-xs">
                  {phase === "uploading"
                    ? `${t("admin.media.uploading")}${
                        progress === null ? "" : ` ${Math.round(progress)}%`
                      }`
                    : t("admin.media.uploadSaving")}
                </p>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    phase === "saving" ? 100 : Math.round(progress ?? 0)
                  }
                  className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-200"
                    style={{
                      width: `${
                        phase === "saving" ? 100 : Math.round(progress ?? 0)
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-destructive text-xs">
                {error}
              </p>
            ) : null}

            <DialogFooter className="justify-end">
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
            </DialogFooter>
          </form>
        </DialogBody>
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
