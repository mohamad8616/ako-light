"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2 } from "lucide-react";

import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, type Localized } from "@/lib/i18n/localized";
import type { Language } from "@/lib/i18n/translations";

/**
 * One row of the dashboard's products table. The server page builds these
 * from `getProductAdminRows()` (lib/repositories/products.ts) — every field
 * is real repository data; `Localized` values are resolved per language here
 * with `pick()`, the same convention the catalog section tables use.
 */
export interface DashboardProductRow {
  id: string;
  name: Localized;
  category: Localized;
  designer: Localized | null;
  /** Availability from `Product.existsInStore` — the same rule the products screen's stock badge uses. */
  stock: "in" | "out";
}

const columnHelper = createColumnHelper<DashboardProductRow>();

/**
 * Infinite-scroll window: 20 rows to start, 20 more per reveal. The spinner
 * stays visible for `REVEAL_DELAY_MS` so a reveal reads as a load, not a jump.
 */
const REVEAL_COUNT = 20;
const REVEAL_DELAY_MS = 350;

/** Icon per stock state — view-layer concern, like the nav icons. */
const STOCK_ICONS = {
  in: CheckmarkCircle01Icon,
  out: Cancel01Icon,
} as const;

/**
 * Column definitions are built per render with the active dictionary and
 * language, so every header and badge is translated. The name cell links to
 * the product's real edit screen — this table is a read-only overview, so
 * there is no inline editing, no row actions menu and no demo status field
 * (`Product` has no publish-status column; stock is the honest state to show).
 */
function buildColumns(t: (key: string) => string, lang: Language) {
  return [
    columnHelper.accessor("name", {
      header: t("admin.table.col.name"),
      cell: ({ row }) => (
        <LocaleLink
          href={`/admin/products/${row.original.id}`}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {pick(row.original.name, lang)}
        </LocaleLink>
      ),
      enableHiding: false,
    }),
    columnHelper.accessor("category", {
      header: t("admin.table.col.category"),
      cell: ({ row }) => (
        <div className="w-40">
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            {pick(row.original.category, lang)}
          </Badge>
        </div>
      ),
    }),
    columnHelper.accessor("stock", {
      header: t("admin.product.field.stock"),
      cell: ({ row }) => {
        const stock = row.original.stock;
        const StockIcon = STOCK_ICONS[stock];
        return (
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            <HugeiconsIcon
              icon={StockIcon}
              strokeWidth={2}
              className={
                stock === "in"
                  ? "fill-green-500 dark:fill-green-400"
                  : "fill-red-400/80"
              }
            />
            {t(`admin.product.stock.${stock}`)}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("designer", {
      header: t("admin.table.col.designer"),
      cell: ({ row }) => {
        const designer = row.original.designer;
        if (designer) return pick(designer, lang);
        // Unassigned products show a placeholder instead of an empty cell.
        return <span className="text-muted-foreground">—</span>;
      },
    }),
  ];
}

/**
 * The dashboard's product overview: real repository rows with sorting,
 * column visibility and per-language labels — and INFINITE SCROLL instead of
 * the old pager (20 rows, +20 each time the foot scrolls into view, with a
 * spinner and a message while the next chunk is revealed).
 *
 * Read-only by design — row-level editing/deleting lives on the dedicated
 * /admin/products screen, so this table has no inline editor, no fake tabs,
 * no drag-reorder (nothing persisted a reorder) and no row-selection bulk
 * actions (there are none to run).
 */
export function DataTable({ data }: { data: DashboardProductRow[] }) {
  const { t, lang } = useLanguage();
  const numberFormat = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US");
  const columns = React.useMemo(() => buildColumns(t, lang), [t, lang]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  /** Rows revealed so far — the infinite-scroll window over the full set. */
  const [visibleCount, setVisibleCount] = React.useState(REVEAL_COUNT);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const allRows = table.getRowModel().rows;
  const visibleRows = allRows.slice(0, visibleCount);
  const hasMore = visibleCount < allRows.length;

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="dashboard-columns" className="sr-only">
          {t("admin.table.columns")}
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <HugeiconsIcon
              icon={LeftToRightListBulletIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {t("admin.table.columns")}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              data-icon="inline-end"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide(),
              )
              .map((column) => {
                const label =
                  column.id === "category"
                    ? t("admin.table.col.category")
                    : column.id === "stock"
                      ? t("admin.product.field.stock")
                      : column.id === "designer"
                        ? t("admin.table.col.designer")
                        : column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="font-medium text-foreground/90"
                    >
                      {header.isPlaceholder ? null : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {visibleRows.length ? (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="odd:bg-emerald-500/[0.04] hover:bg-violet-500/[0.06] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {t("admin.table.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <p className="text-muted-foreground text-xs">
            {t("admin.table.itemCount").replace(
              "{count}",
              numberFormat.format(allRows.length),
            )}
          </p>
          {loadingMore ? (
            <p
              role="status"
              aria-live="polite"
              className="text-muted-foreground flex items-center gap-2 text-xs"
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
        {hasMore ? (
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
        ) : null}
      </div>
    </div>
  );
}
