import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Multi-line text input — the same surface as `components/ui/input.tsx`, sized
 * for paragraph content (localized descriptions, bios, notes).
 *
 * `min-h-24` keeps long-form fields usable by default; callers can pass `rows`
 * or a `className` for a taller box.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-input/20 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 min-h-24 w-full min-w-0 rounded-md border px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
