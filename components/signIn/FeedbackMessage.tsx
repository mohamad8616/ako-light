import { cn } from "@/lib/utils";

interface FeedbackMessageProps {
  /** Error text from the current attempt; wins over `success` when set. */
  error: string;
  /** Confirmation text ("Verification code sent."); ignored if `error` set. */
  success: string;
}

/**
 * Inline error/success banner for the sign-in card — and the only place
 * credentials feedback is rendered.
 *
 * Usage:
 *
 *   <FeedbackMessage error={error} success={success} />
 *
 * Invisible behaviour worth preserving:
 *   - Renders `null` when both strings are empty, so the form does not reserve
 *     blank space (no layout shift once a message appears).
 *   - `role="alert"` for errors and `role="status"` for successes: assistive
 *     tech announces an error immediately but lets a success wait its turn.
 *   - `error` takes precedence in both content and colour, so a failed retry
 *     can never leave a stale "success" on screen beside the failure.
 *   - No `"use client"` needed: it takes strings and renders markup, so it can
 *     stay a server component. Add the directive only if it gains handlers or
 *     hooks.
 *
 * To change wording or add a "info" state, extend the props here and pass a
 * plain `variant` — keep the translated strings coming from the caller
 * (auth.* keys in lib/i18n/translations/auth.ts) rather than from this file.
 */
export default function FeedbackMessage({
  error,
  success,
}: FeedbackMessageProps) {
  if (!error && !success) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        error
          ? "border-red-500/30 bg-red-500/5 text-red-500"
          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
      )}
    >
      {error || success}
    </div>
  );
}
