import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_COLORS_HSL } from '@/lib/constants'

interface BurndownChartProps {
  data: {
    totalTasks: number
    series: Array<{ date: string; remaining: number; ideal: number }>
  } | undefined
  isLoading: boolean
  isError: boolean
  className?: string
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const EMPTY_MESSAGE = 'Seleziona un progetto per visualizzare il burndown'
const ERROR_MESSAGE = 'Errore nel caricamento'

function ChartContent({ chartData, isError }: { chartData: Array<{ date: string; Rimanenti: number; Ideale: number }>; isError: boolean }) {
  if (isError) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        {ERROR_MESSAGE}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        {EMPTY_MESSAGE}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
            color: 'hsl(var(--card-foreground))',
          }}
        />
        <Line
          type="monotone"
          dataKey="Rimanenti"
          stroke={STATUS_COLORS_HSL.in_progress}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="Ideale"
          stroke={STATUS_COLORS_HSL.todo}
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BurndownChart({ data, isLoading, isError, className }: BurndownChartProps) {
  const chartData = useMemo(() => {
    if (!data?.series) return []
    return data.series.map((point) => ({
      date: formatDateLabel(point.date),
      Rimanenti: point.remaining,
      Ideale: point.ideal,
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Burndown Chart</CardTitle>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.totalTasks} task totali
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ChartContent chartData={chartData} isError={isError} />
      </CardContent>
    </Card>
  )
}
