"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Localized } from "@/lib/i18n/localized";
import { pick } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Shared column factories for the admin tables.
 *
 * Every factory takes the ACTIVE LOCALE as an argument (never calls hooks): the
 * section's client screen owns the locale and passes it in, keeping these plain
 * functions. Localized columns sort by the active locale's text and render the
 * other language as a muted secondary line in its own direction — Persian
 * admins read the fa line first, English admins the en line, from one row.
 */

/** Localized name column — sortable by the active locale's text. */
export function localizedColumn<TData>(args: {
  lang: Locale;
  label: string;
  access: (row: TData) => Localized | null | undefined;
}): ColumnDef<TData, unknown> {
  const other: Locale = args.lang === "fa" ? "en" : "fa";
  return {
    id: "name",
    accessorFn: (row) => {
      const value = args.access(row);
      return value ? pick(value, args.lang) : "";
    },
    header: () => <span>{args.label}</span>,
    sortingFn: "alphanumeric",
    cell: (ctx) => {
      const value = args.access(ctx.row.original);
      if (!value) return null;
      return (
        <div className="max-w-56 min-w-24">
          <span className="text-foreground block truncate font-medium">
            {pick(value, args.lang)}
          </span>
          <span
            dir={other === "fa" ? "rtl" : "ltr"}
            className="text-muted-foreground block truncate text-xs"
          >
            {pick(value, other)}
          </span>
        </div>
      );
    },
  };
}

/** Plain text column (location, year, title, category…). */
export function textColumn<TData>(args: {
  id: string;
  label: string;
  access: (row: TData) => string | null | undefined;
  className?: string;
}): ColumnDef<TData, unknown> {
  return {
    id: args.id,
    accessorFn: (row) => args.access(row) ?? "",
    header: () => <span>{args.label}</span>,
    cell: (ctx) => (
      <span className={cn("text-foreground block truncate", args.className)}>
        {args.access(ctx.row.original) || "—"}
      </span>
    ),
  };
}

/** Monospace slug column — the route handle, as a muted secondary identity. */
export function slugColumn<TData>(args: {
  id?: string;
  label: string;
  access: (row: TData) => string;
}): ColumnDef<TData, unknown> {
  return {
    id: args.id ?? "slug",
    accessorFn: (row) => args.access(row),
    header: () => <span>{args.label}</span>,
    cell: (ctx) => (
      <span
        dir="ltr"
        className="text-muted-foreground block truncate font-mono text-xs"
      >
        {args.access(ctx.row.original)}
      </span>
    ),
  };
}

/** Localized number formatting, shared with the DataTable's pagination text. */
export function formatAdminNumber(value: number, lang: Locale): string {
  return new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(value);
}

/** Numeric column with tabular figures (price, sortOrder, quantity…). */
export function numberColumn<TData>(args: {
  id: string;
  label: string;
  lang: Locale;
  access: (row: TData) => number | null | undefined;
}): ColumnDef<TData, unknown> {
  return {
    id: args.id,
    accessorFn: (row) => args.access(row) ?? 0,
    header: () => <span>{args.label}</span>,
    sortingFn: "basic",
    cell: (ctx) => (
      <span dir="ltr" className="text-foreground block tabular-nums">
        {formatAdminNumber(args.access(ctx.row.original) ?? 0, args.lang)}
      </span>
    ),
  };
}

/** Small thumbnail column (images, swatches…). */
export function imageColumn<TData>(args: {
  id: string;
  label: string;
  access: (row: TData) => string | null | undefined;
}): ColumnDef<TData, unknown> {
  return {
    id: args.id,
    enableSorting: false,
    header: () => <span>{args.label}</span>,
    cell: (ctx) => {
      const url = args.access(ctx.row.original);
      return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          className="border-border size-9 rounded-md border object-cover"
        />
      ) : (
        <span className="border-border bg-muted size-9 rounded-md border" />
      );
    },
  };
}

/** Last-updated column (ISO string in, localized medium date out). */
export function updatedColumn<TData>(args: {
  label: string;
  lang: Locale;
  access: (row: TData) => string;
}): ColumnDef<TData, unknown> {
  return {
    id: "updatedAt",
    accessorFn: (row) => args.access(row),
    header: () => <span>{args.label}</span>,
    cell: (ctx) => (
      <span className="text-muted-foreground block text-xs whitespace-nowrap">
        {new Intl.DateTimeFormat(args.lang === "fa" ? "fa-IR" : "en-US", {
          dateStyle: "medium",
        }).format(new Date(args.access(ctx.row.original)))}
      </span>
    ),
  };
}

/** Non-sorting trailing column that renders each row's actions. */
export function actionsColumn<TData>(
  render: (row: TData) => ReactNode,
): ColumnDef<TData, unknown> {
  return {
    id: "actions",
    enableSorting: false,
    header: () => null,
    cell: (ctx) => render(ctx.row.original),
  };
}
