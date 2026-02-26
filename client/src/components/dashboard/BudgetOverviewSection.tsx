/**
 * BudgetOverviewSection - Bar chart showing budget vs actual hours for all projects
 * @module components/dashboard/BudgetOverviewSection
 */

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { ProjectBudgetData } from '@/types'

interface BudgetOverviewSectionProps {
  data: ProjectBudgetData[]
}

const STATUS_BAR_COLORS: Record<ProjectBudgetData['status'], string> = {
  on_track: '#22C55E',
  at_risk: '#F59E0B',
  over_budget: '#EF4444',
}

const STATUS_LABELS: Record<ProjectBudgetData['status'], string> = {
  on_track: 'In linea',
  at_risk: 'A rischio',
  over_budget: 'Sforato',
}

interface ChartEntry {
  name: string
  projectCode: string
  stimato: number
  lavorato: number
  usedPercent: number
  status: ProjectBudgetData['status']
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: ChartEntry }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const entry = payload[0].payload

  return (
    <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-slate-300">
        Ore stimate: <span className="text-white font-medium">{entry.stimato}h</span>
      </p>
      <p className="text-slate-300">
        Ore lavorate: <span className="text-white font-medium">{entry.lavorato}h</span>
      </p>
      <p className="text-slate-300">
        Utilizzo:{' '}
        <span
          className="font-medium"
          style={{ color: STATUS_BAR_COLORS[entry.status] }}
        >
          {entry.usedPercent}%
        </span>
      </p>
      <p className="text-slate-300">
        Stato:{' '}
        <span
          className="font-medium"
          style={{ color: STATUS_BAR_COLORS[entry.status] }}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </p>
    </div>
  )
}

export function BudgetOverviewSection({ data }: BudgetOverviewSectionProps) {
  const chartData = useMemo<ChartEntry[]>(
    () =>
      data.map((item) => ({
        name: item.projectCode,
        projectCode: item.projectCode,
        stimato: item.estimatedHours,
        lavorato: item.totalHoursLogged,
        usedPercent: item.budgetUsedPercent,
        status: item.status,
      })),
    [data]
  )

  if (data.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          Budget Progetti
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nessun progetto con budget impostato
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Imposta un budget nei dettagli del progetto per visualizzare i dati qui
          </p>
        </div>
      </div>
    )
  }

  const chartHeight = Math.max(200, data.length * 56)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          Budget Progetti
        </h2>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600" />
            <span>Stimate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>In linea</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span>A rischio (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Sforato (&gt;100%)</span>
          </div>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="flex items-center gap-3 mb-4">
        {(['over_budget', 'at_risk', 'on_track'] as const).map((s) => {
          const count = data.filter((d) => d.status === s).length
          if (count === 0) return null
          return (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${STATUS_BAR_COLORS[s]}22`,
                color: STATUS_BAR_COLORS[s],
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: STATUS_BAR_COLORS[s] }}
              />
              {count} {STATUS_LABELS[s]}
            </span>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
          barCategoryGap="30%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={(v: number) => `${v}h`}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107,114,128,0.08)' }} />

          {/* Estimated hours bar (gray background) */}
          <Bar
            dataKey="stimato"
            name="Ore stimate"
            radius={[0, 4, 4, 0]}
            fill="#D1D5DB"
          />

          {/* Actual hours bar (colored by status) */}
          <Bar
            dataKey="lavorato"
            name="Ore lavorate"
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={STATUS_BAR_COLORS[entry.status]} />
            ))}
            <LabelList
              dataKey="usedPercent"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fill: '#6B7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
