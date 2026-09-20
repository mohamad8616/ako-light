"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  DragDropVerticalIcon,
  Edit01Icon,
  LeftToRightListBulletIcon,
  Loading03Icon,
  MoreVerticalCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

const columnHelper = createColumnHelper<z.infer<typeof schema>>();

export const schema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  designer: z.string(),
});

/**
 * Product publish states. The values are i18n-neutral slugs so the sample
 * rows stay language-independent; the visible labels come from the admin
 * dictionary (admin.status.*), which is the basis for the future
 * multi-language dashboard.
 */
export const PRODUCT_STATUSES = ["published", "draft", "pending"] as const;

/** Icon per publish state — view-layer concern, like the nav icons. */
const STATUS_ICONS = {
  published: CheckmarkCircle01Icon,
  draft: Edit01Icon,
  pending: Loading03Icon,
} as const;

/** A row is "unassigned" when the designer field is empty. */
const UNASSIGNED = "";

/** Designers offered for assignment (sample data). */
const DESIGNERS = [
  "ماسیمو کاستانیا",
  "ایزابلا جنووزه",
  "اوگو کاچاتوری",
  "جوهانا گراوندر",
  "تانجو اوزلگین",
  "داویده ناسیمبنی",
  "هیلا هاوکین",
  "استیون تیرنی",
  "یابو پوشلبرگ",
  "امیلی والن",
];

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { t } = useLanguage();
  const { attributes, listeners } = useSortable({
    id,
  });
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        strokeWidth={2}
        className="text-muted-foreground size-3"
      />
      <span className="sr-only">{t("admin.table.dragToReorder")}</span>
    </Button>
  );
}
/**
 * Column definitions are built per render with the active dictionary, so every
 * header, badge, placeholder and menu entry is translated (and the table works
 * in the future multi-language dashboard without changes).
 */
function buildColumns(t: (key: string) => string) {
  return [
  columnHelper.display({
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  }),
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() &&
            !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("admin.table.selectAll")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("admin.table.selectRow")}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("name", {
    header: t("admin.table.col.name"),
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
  }),
  columnHelper.accessor("category", {
    header: t("admin.table.col.category"),
    cell: ({ row }) => (
      <div className="w-40">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {t(`products.${row.original.category}`)}
        </Badge>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: t("admin.table.col.status"),
    cell: ({ row }) => {
      const status = row.original.status as keyof typeof STATUS_ICONS;
      const StatusIcon = STATUS_ICONS[status] ?? Loading03Icon;
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          <HugeiconsIcon
            icon={StatusIcon}
            strokeWidth={2}
            className={
              status === "published"
                ? "fill-green-500 dark:fill-green-400"
                : undefined
            }
          />
          {t(`admin.status.${status}`)}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("designer", {
    header: t("admin.table.col.designer"),
    cell: ({ row }) => {
      const isAssigned = row.original.designer !== UNASSIGNED;
      if (isAssigned) {
        return row.original.designer;
      }
      return (
        <>
          <Label htmlFor={`${row.original.id}-designer`} className="sr-only">
            {t("admin.table.col.designer")}
          </Label>
          <Select
            value={isAssigned ? row.original.designer : undefined}
          >
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-designer`}
            >
              <SelectValue placeholder={t("admin.table.assignDesigner")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {DESIGNERS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="text-muted-foreground data-open:bg-muted flex size-8"
              size="icon"
            />
          }
        >
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
          <span className="sr-only">{t("admin.table.openMenu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>{t("admin.table.edit")}</DropdownMenuItem>
          <DropdownMenuItem>{t("admin.table.duplicate")}</DropdownMenuItem>
          <DropdownMenuItem>{t("admin.table.favorite")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            {t("admin.table.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
  ];
}
function DraggableRow({
  row,
}: {
  row: Row<z.infer<typeof schema>>;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const { lang, t } = useLanguage();
  const numberFormat = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US");
  const columns = React.useMemo(() => buildColumns(t), [t]);
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] =
    React.useState<RowSelectionState>({});
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
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }
  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          {t("admin.table.viewSelector")}
        </Label>
        <Select
          defaultValue="outline"
          items={[
            { label: t("admin.tab.products"), value: "outline" },
            { label: t("admin.tab.pastPerformance"), value: "past-performance" },
            { label: t("admin.tab.keyPersonnel"), value: "key-personnel" },
            { label: t("admin.tab.focusDocuments"), value: "focus-documents" },
          ]}
        >
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder={t("admin.table.selectView")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="outline">{t("admin.tab.products")}</SelectItem>
              <SelectItem value="past-performance">
                {t("admin.tab.pastPerformance")}
              </SelectItem>
              <SelectItem value="key-personnel">
                {t("admin.tab.keyPersonnel")}
              </SelectItem>
              <SelectItem value="focus-documents">
                {t("admin.tab.focusDocuments")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">{t("admin.tab.products")}</TabsTrigger>
          <TabsTrigger value="past-performance">
            {t("admin.tab.pastPerformance")}{" "}
            <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            {t("admin.tab.keyPersonnel")}{" "}
            <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">
            {t("admin.tab.focusDocuments")}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
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
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === "name"
                        ? t("admin.table.col.name")
                        : column.id === "category"
                          ? t("admin.table.col.category")
                          : column.id === "status"
                            ? t("admin.table.col.status")
                            : column.id === "designer"
                              ? t("admin.table.col.designer")
                              : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            <span className="hidden lg:inline">
              {t("admin.table.addSection")}
            </span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
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
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {numberFormat.format(
              table.getFilteredSelectedRowModel().rows.length,
            )}{" "}
            {t("admin.table.of")}{" "}
            {numberFormat.format(table.getFilteredRowModel().rows.length)}{" "}
            {t("admin.table.rowsSelected")}
          </div>
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
              {numberFormat.format(table.getState().pagination.pageIndex + 1)}{" "}
              {t("admin.table.of")} {numberFormat.format(table.getPageCount())}
            </div>
            <div className="ms-auto flex items-center gap-2 lg:ms-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">
                  {t("admin.table.goToFirstPage")}
                </span>
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
                <span className="sr-only">
                  {t("admin.table.goToLastPage")}
                </span>
                <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}
function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const { lang, t } = useLanguage();
  const isMobile = useIsMobile();
  const drawerChartData = [
    { month: lang === "fa" ? "ژانویه" : "January", desktop: 186, mobile: 80 },
    { month: lang === "fa" ? "فوریه" : "February", desktop: 305, mobile: 200 },
    { month: lang === "fa" ? "مارس" : "March", desktop: 237, mobile: 120 },
    { month: lang === "fa" ? "آوریل" : "April", desktop: 73, mobile: 190 },
    { month: lang === "fa" ? "مه" : "May", desktop: 209, mobile: 130 },
    { month: lang === "fa" ? "ژوئن" : "June", desktop: 214, mobile: 140 },
  ];
  const drawerChartConfig = {
    desktop: { label: t("admin.chart.desktop"), color: "var(--primary)" },
    mobile: { label: t("admin.chart.mobile"), color: "var(--primary)" },
  } satisfies ChartConfig;
  return (
    <Drawer swipeDirection={isMobile ? "down" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="text-foreground w-fit px-0 text-left"
          />
        }
      >
        {item.name}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>{t("admin.drawer.views")}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={drawerChartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={drawerChartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  {t("admin.drawer.trend")}{" "}
                  <HugeiconsIcon
                    icon={ChartUpIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </div>
                <div className="text-muted-foreground">
                  {t("admin.drawer.trend.note")}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">{t("admin.drawer.field.name")}</Label>
              <Input id="header" defaultValue={item.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">{t("admin.drawer.field.category")}</Label>
                <Select
                  defaultValue={item.category}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue
                      placeholder={t("admin.drawer.field.category")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="lighting">
                        {t("products.lighting")}
                      </SelectItem>
                      <SelectItem value="bookcases">
                        {t("products.bookcases")}
                      </SelectItem>
                      <SelectItem value="cabinets-and-sideboards">
                        {t("products.cabinetsAndSideboards")}
                      </SelectItem>
                      <SelectItem value="chairs-and-stools">
                        {t("products.chairsAndStools")}
                      </SelectItem>
                      <SelectItem value="coffee-tables">
                        {t("products.coffeeTables")}
                      </SelectItem>
                      <SelectItem value="kitchens">
                        {t("products.kitchens")}
                      </SelectItem>
                      <SelectItem value="sofas-and-armchairs">
                        {t("products.sofasAndArmchairs")}
                      </SelectItem>
                      <SelectItem value="tables">
                        {t("products.tables")}
                      </SelectItem>
                      <SelectItem value="wall-panelling">
                        {t("products.wallPanelling")}
                      </SelectItem>
                      <SelectItem value="accessories">
                        {t("products.accessories")}
                      </SelectItem>
                      <SelectItem value="bedroom">
                        {t("products.bedroom")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">
                  {t("admin.drawer.field.status")}
                </Label>
                <Select
                  defaultValue={item.status}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder={t("admin.drawer.field.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="published">
                        {t("admin.status.published")}
                      </SelectItem>
                      <SelectItem value="draft">
                        {t("admin.status.draft")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("admin.status.pending")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="product-designer">
                {t("admin.drawer.field.designer")}
              </Label>
              <Select
                defaultValue={item.designer}
              >
                <SelectTrigger id="product-designer" className="w-full">
                  <SelectValue
                    placeholder={t("admin.drawer.field.designer")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DESIGNERS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>{t("admin.drawer.submit")}</Button>
          <DrawerClose render={<Button variant="outline" />}>
            {t("admin.drawer.done")}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
