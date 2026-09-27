"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { AnalyticsBreakdownItem } from "@/types/api"

export interface MonthlySeries {
  key: string
  label: string
  values: number[]
}

/** Categorical slots in fixed order. A series keeps its slot when others are empty. */
const SLOTS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

function monthLabel(month: string, short = true) {
  const [year, index] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, index - 1, 1))
  return date.toLocaleDateString("en-GB", { month: short ? "short" : "long", year: short ? undefined : "numeric", timeZone: "UTC" })
}

/**
 * Monthly counts as columns: one series, or several stacked. Every series keeps
 * the colour of its position in `series`, so legends stay stable between users.
 */
export function MonthlyColumns({
  months,
  series,
  className,
  caption,
}: {
  months: string[]
  series: MonthlySeries[]
  className?: string
  /** Describes the chart for the data table and screen readers. */
  caption: string
}) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s, index) => [s.key, { label: s.label, color: SLOTS[index % SLOTS.length] }])
  )
  const rows = months.map((month, index) => ({
    month,
    ...Object.fromEntries(series.map((s) => [s.key, s.values[index] ?? 0])),
  }))
  const stacked = series.length > 1
  const total = series.reduce((sum, s) => sum + s.values.reduce((a, b) => a + b, 0), 0)

  return (
    <figure className={cn("space-y-2", className)}>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" role="img" aria-label={caption}>
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            tickFormatter={(month: string, index: number) =>
              index === 0 || month.endsWith("-01") ? `${monthLabel(month)} ${month.slice(2, 4)}` : monthLabel(month)
            }
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<ChartTooltipContent labelFormatter={(month) => monthLabel(String(month), false)} />}
          />
          {stacked ? <ChartLegend itemSorter={null} content={<ChartLegendContent className="flex-wrap" />} /> : null}
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={stacked ? "total" : undefined}
              fill={`var(--color-${s.key})`}
              stroke="var(--card)"
              strokeWidth={stacked ? 1 : 0}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <DataTable
        caption={caption}
        empty={total === 0}
        head={["Month", ...series.map((s) => s.label)]}
        rows={months.map((month, index) => [monthLabel(month, false), ...series.map((s) => s.values[index] ?? 0)])}
      />
    </figure>
  )
}

/**
 * A ranked breakdown as horizontal bars with direct value labels. One colour:
 * the bar length carries the magnitude, the label carries identity.
 */
export function BreakdownBars({
  items,
  caption,
  unit,
}: {
  items: AnalyticsBreakdownItem[]
  caption: string
  unit?: string
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No records yet.</p>
  }

  const max = Math.max(1, ...items.map((item) => item.count))
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <figure className="space-y-2">
      <ul className="space-y-2.5" aria-label={caption}>
        {items.map((item) => {
          const share = total > 0 ? Math.round((item.count / total) * 100) : 0
          return (
            <li key={item.key} className="group" title={`${item.label}: ${item.count}${unit ? ` ${unit}` : ""} (${share}%)`}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  <span className="text-foreground font-medium">{item.count.toLocaleString("en-GB")}</span> · {share}%
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-(--chart-1) transition-[width] group-hover:opacity-80"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

/** The table view behind every chart: exact values, readable without colour. */
function DataTable({
  caption,
  head,
  rows,
  empty,
}: {
  caption: string
  head: string[]
  rows: (string | number)[][]
  empty: boolean
}) {
  return (
    <details className="group text-xs">
      <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer select-none">
        {empty ? "No records in this period" : "Show data table"}
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              {head.map((cell, index) => (
                <th key={cell} scope="col" className={cn("px-2 py-1.5 font-medium", index > 0 && "text-right")}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-t">
                {row.map((cell, index) => (
                  <td key={index} className={cn("px-2 py-1", index > 0 && "text-right tabular-nums")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
