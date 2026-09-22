"use client";

import { buttonVariants } from "@/components/ui/button";
import LocaleLink from "@/lib/i18n/Link";
import { cn } from "@/lib/utils";

/**
 * Locale-aware "back to <section>" link styled as an outline button — the
 * affordance every dedicated form page opens with (the label is passed in
 * already translated, e.g. "Back to Products").
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <LocaleLink
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {label}
    </LocaleLink>
  );
}
