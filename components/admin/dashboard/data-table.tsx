"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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
 * pagination, column visibility and per-language labels.
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
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
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
        <div className="flex items-center justify-end px-4">
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                {t("admin.table.rowsPerPage")}
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
                items={[10, 20, 30, 40, 50].map((pageSize) => ({
                  label: `${pageSize}`,
                  value: `${pageSize}`,
                }))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {t("admin.table.page")}{" "}
              {numberFormat.format(
                table.getState().pagination.pageIndex + 1,
              )}{" "}
              {t("admin.table.of")} {numberFormat.format(table.getPageCount())}
            </div>
            <div className="ms-auto flex items-center gap-2 lg:ms-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">{t("admin.table.goToFirstPage")}</span>
                <HugeiconsIcon icon={ArrowLeftDoubleIcon} strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">
                  {t("admin.table.goToPreviousPage")}
                </span>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">{t("admin.table.goToNextPage")}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">{t("admin.table.goToLastPage")}</span>
                <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
