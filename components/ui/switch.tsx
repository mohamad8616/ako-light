"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/**
 * Boolean toggle in the shadcn/base-ui shape.
 *
 * The thumb is positioned with `justify-start` / `data-checked:justify-end`
 * rather than a `translate-x-*` slide on purpose: the admin shell is RTL, and a
 * physical translate would need a mirrored override. Logical justification
 * follows the nearest `dir`, so the switch reads correctly in both directions
 * with no RTL-specific class.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer bg-input focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-checked:bg-primary dark:bg-input/60 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-0.5 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:justify-end",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background pointer-events-none block size-4 rounded-full shadow-sm"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
