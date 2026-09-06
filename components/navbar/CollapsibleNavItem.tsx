"use client";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * When `true`, the item is visually hidden and removed from the
   * tab order. `inert` handles both focus and accessibility state, so
   * we don't need a separate `aria-hidden`.
   */
  hidden: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * A single icon/button in the navbar that fades + slides down when
 * `hidden` is true (used to swap between products/menu buttons).
 */
export default function CollapsibleNavItem({
  hidden,
  children,
  className,
}: Props) {
  return (
    <div
      // `inert` makes the subtree non-interactive AND hidden from the
      // accessibility tree. Passing `undefined` (not `false`) keeps the
      // attribute off the DOM when the item is visible.
      inert={hidden || undefined}
      className={cn(
        "transition-[opacity,transform] duration-200 ease-out",
        hidden
          ? "pointer-events-none translate-y-1 opacity-0"
          : "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
