"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import type { DailyOrdersPoint } from "@/lib/repositories/admin"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Orders placed per day"

/**
 * Orders over time — the dashboard's one real time series.
 *
 * `data` comes from getDailyOrdersSeries() (lib/repositories/admin.ts): a
 * zero-filled daily count of rows in the `order` table for the last 90 days.
 * There is deliberately no fallback sample data — with no orders yet the card
 * renders its translated empty state instead of a fabricated curve.
 *
 * Day keys are UTC (`YYYY-MM-DD`); ticks and tooltip labels are formatted with
 * `timeZone: "UTC"` so a key never renders as the previous day in a
 * negative-offset timezone.
 */
export function ChartAreaInteractive({
  data,
}: {
  data: DailyOrdersPoint[]
}) {
  const isMobile = useIsMobile()
  const { lang, t } = useLanguage()
  // No effect needed: the default range is derived ("7d" on mobile, "90d"
  // elsewhere) until the user picks a range explicitly.
  const [timeRange, setTimeRange] = React.useState<string | null>(null)
  const range = timeRange ?? (isMobile ? "7d" : "90d")

  const locale = lang === "fa" ? "fa-IR" : "en-US"
  const formatDay = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })

  const chartConfig = {
    orders: {
      label: t("admin.chart.title"),
      color: "hsl(160, 84%, 39%)",
    },
  } satisfies ChartConfig

  const rangeOptions = [
    { value: "90d", label: t("admin.chart.range.90d") },
    { value: "30d", label: t("admin.chart.range.30d") },
    { value: "7d", label: t("admin.chart.range.7d") },
  ]

  // The series is contiguous and ends today, so a range is a tail slice —
  // no hardcoded reference date to drift out of date.
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const filteredData = data.slice(-days)
  const totalOrders = filteredData.reduce((sum, point) => sum + point.orders, 0)

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <div className="absolute inset-0 bg-linear-to-tr from-emerald-500/10 via-transparent to-violet-500/10 -z-10 rounded-xl" />
        <CardTitle>{t("admin.chart.title")}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {t("admin.chart.description.long")}
          </span>
          <span className="@[540px]/card:hidden">
            {t("admin.chart.description.short")}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[range]}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? null)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {rangeOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select
            value={range}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label={t("admin.chart.select.aria")}
            >
              <SelectValue placeholder={t("admin.chart.range.90d")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {rangeOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {totalOrders === 0 ? (
          <div className="text-muted-foreground flex h-62.5 items-center justify-center px-6 text-center text-sm">
            {t("admin.chart.empty")}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(160, 84%, 39%)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="50%"
                    stopColor="hsl(160, 84%, 45%)"
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(160, 84%, 50%)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatDay}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDay(String(value))}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="orders"
                type="natural"
                fill="url(#fillOrders)"
                stroke="hsl(160, 84%, 39%)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

