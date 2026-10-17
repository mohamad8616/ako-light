"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Loader2 } from "lucide-react";
import * as React from "react";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * Rows revealed initially and per scroll step. The admin lists are fetched
 * whole by their server pages, so "loading" here is the reveal step — kept
 * brief but VISIBLE (spinner + message) so fast scrolling never feels like the
 * table silently swallowed rows.
 */
const REVEAL_COUNT = 20;
/** How long the spinner shows while the next chunk is revealed. */
const REVEAL_DELAY_MS = 350;

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  toolbar?: React.ReactNode;
  className?: string;
  /** Renders a free-text search box filtering across all columns. */
  searchable?: boolean;
  /** Message shown in the table body when no rows match (or data is empty). */
  emptyMessage?: string;
}

/**
 * The shared admin list — sorting + INFINITE SCROLL.
 *
 * ── Pagination is gone, on purpose ──────────────────────────────────────────
 *
 * Every catalog list page hands this component the WHOLE row set (the server
 * page reads it once and passes it down), so the old Previous/Next pager was
 * pure friction: the data was already in the browser, it just hid 90 % of
 * itself behind page boundaries. The table now renders the first 20 rows and
 * reveals 20 more each time the sentinel at the table's foot scrolls into
 * view, with a spinner + "loading more" message during each reveal — the
 * operator simply scrolls and the list keeps going.
 *
 * The reveal is client-side, so it is instant by nature; the short spinner
 * window is deliberate feedback, not a network wait.
 *
 * Sorting still works across ALL rows (the sorted model is sliced last, so
 * re-sorting a long list re-reveals from its top — the correct behaviour).
 */
export function DataTable<TData>({
  columns,
  data,
  toolbar,
  className,
  emptyMessage,
}: DataTableProps<TData>) {
  const { t } = useLanguage();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [visibleCount, setVisibleCount] = React.useState(REVEAL_COUNT);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allRows = table.getRowModel().rows;
  const visibleRows = allRows.slice(0, visibleCount);
  const hasMore = visibleCount < allRows.length;

  // Guard so a fast sentinel re-entry cannot double-fire a reveal while one is
  // pending (state updates are async; the ref is the synchronous truth).
  const revealingRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || revealingRef.current) return;
        revealingRef.current = true;
        setLoadingMore(true);
        timerRef.current = window.setTimeout(() => {
          setVisibleCount((count) => count + REVEAL_COUNT);
          setLoadingMore(false);
          revealingRef.current = false;
        }, REVEAL_DELAY_MS);
      },
      // Start loading slightly BEFORE the sentinel is on screen, so the next
      // chunk is ready by the time the operator reaches the bottom.
      { rootMargin: "240px" },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        revealingRef.current = false;
      }
    };
  }, [hasMore]);

  const itemCount = t("admin.table.itemCount").replace(
    "{count}",
    String(allRows.length),
  );

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar ? (
        <div className="flex items-center justify-between">{toolbar}</div>
      ) : null}

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-border text-muted-foreground border-b px-3 py-2 text-xs font-medium tracking-wide uppercase"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-2",
                            header.column.getCanSort() && "cursor-pointer",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanSort() ? (
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-border border-b last:border-b-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {allRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-muted-foreground px-3 py-8 text-center text-xs"
                  >
                    {emptyMessage ?? t("admin.table.noResults")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        The scroll sentinel + status line. The spinner + message render while
        the next 20 rows are being revealed; once everything is shown a quiet
        "all loaded" note replaces it.
      */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{itemCount}</p>
        {loadingMore ? (
          <p
            className="text-muted-foreground flex items-center gap-2 text-xs"
            role="status"
            aria-live="polite"
          >
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            {t("admin.table.loadingMore")}
          </p>
        ) : visibleCount > REVEAL_COUNT && !hasMore ? (
          <p className="text-muted-foreground text-xs">
            {t("admin.table.allLoaded")}
          </p>
        ) : null}
      </div>
      {hasMore ? <div ref={sentinelRef} aria-hidden className="h-px w-full" /> : null}
    </div>
  );
}

export function createColumnHeader<TData>(
  label: string,
  accessorKey: keyof TData,
) {
  return {
    accessorKey,
    header: () => <span>{label}</span>,
  } satisfies ColumnDef<TData, unknown>;
}
