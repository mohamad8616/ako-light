"use client";
import { cn } from "@/lib/utils";

interface Props {
  hidden: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleNavItem({ hidden, children, className }: Props) {
  return (
    <div
      inert={hidden || undefined}
      aria-hidden={hidden}
      className={cn(
        "transition-[opacity,transform] duration-200 ease-out",
        hidden ? "pointer-events-none translate-y-1 opacity-0" : "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
