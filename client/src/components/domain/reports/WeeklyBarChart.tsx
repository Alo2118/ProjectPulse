import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface HoursDayEntry {
  day: string
  hours: number
}

interface WeeklyBarChartProps {
  data: HoursDayEntry[]
  isLoading?: boolean
}

/**
 * Bar chart for weekly hours per day.
 * Peak bar in success color, weekend bars in muted, rest in primary.
 * Matches mockup: bar-chart .bar-col pattern.
 */
export function WeeklyBarChart({ data, isLoading }: WeeklyBarChartProps) {
  const workDays = data.filter((d, i) => i < 5 && d.hours > 0)
  const totalHours = data.reduce((s, d) => s + d.hours, 0)
  const avgHours = workDays.length > 0 ? totalHours / workDays.length : 0
  const maxEntry = data.reduce((a, b) => (b.hours > a.hours ? b : a), { day: "—", hours: 0 })

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={80}>
        <RechartsBarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <RechartsTooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: 11,
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`${value}h`, "Ore"]}
          />
          <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => {
              const isWeekend = index >= 5
              const isPeak = entry.hours > 0 && entry.hours === maxEntry.hours
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    isWeekend
                      ? "hsl(var(--border))"
                      : isPeak
                      ? "hsl(var(--success))"
                      : "hsl(var(--primary))"
                  }
                />
              )
            })}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-[10px]">
        <span>
          <span className="text-muted-foreground">Totale</span>
          <span className="font-bold text-blue-400 ml-1.5 text-data">
            {totalHours > 0 ? `${totalHours.toFixed(1)}h` : "—"}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Media/giorno</span>
          <span className="font-bold text-foreground ml-1.5 text-data">
            {avgHours > 0 ? `${avgHours.toFixed(1)}h` : "—"}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Picco</span>
          <span className="font-bold text-green-400 ml-1.5 text-data">
            {maxEntry.hours > 0 ? `${maxEntry.day} · ${maxEntry.hours}h` : "—"}
          </span>
        </span>
      </div>
    </div>
  )
}
