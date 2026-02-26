import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Ban,
  UserX,
  Clock,
  FileQuestion,
  UserMinus,
} from 'lucide-react'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

interface BottleneckData {
  blockedTasks: Array<{
    id: string; code: string; title: string
    assigneeName: string | null; blockedReason: string | null; daysBlocked: number
  }>
  overloadedUsers: Array<{
    userId: string; name: string; assignedHours: number; taskCount: number
  }>
  atRiskDependencies: Array<{
    predecessorId: string; predecessorTitle: string
    successorId: string; successorTitle: string
    daysUntilStart: number
  }>
  unestimatedTasks: Array<{ id: string; code: string; title: string; taskType: string }>
  unassignedTasks: Array<{ id: string; code: string; title: string; priority: string }>
  summary: { totalIssues: number; criticalCount: number; warningCount: number }
}

interface BottleneckAlertsProps {
  data: BottleneckData | null
  isLoading?: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-slate-400',
}

export function BottleneckAlerts({ data, isLoading }: BottleneckAlertsProps) {
  if (isLoading) {
    return (
      <div className="card p-5 space-y-3">
        <div className="skeleton h-6 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data || data.summary.totalIssues === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-cyan-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Colli di Bottiglia
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessun problema rilevato</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-cyan-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Colli di Bottiglia
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {data.summary.criticalCount > 0 && (
            <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
              {data.summary.criticalCount} critici
            </span>
          )}
          {data.summary.warningCount > 0 && (
            <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {data.summary.warningCount} avvisi
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {/* Blocked tasks */}
        {data.blockedTasks.map((task) => (
          <Link
            key={task.id}
            to={`/tasks/${task.id}`}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Ban className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {task.code} — {task.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bloccato da {task.daysBlocked}g
                {task.blockedReason ? ` · ${task.blockedReason}` : ''}
                {task.assigneeName ? ` · ${task.assigneeName}` : ''}
              </p>
            </div>
          </Link>
        ))}

        {/* Overloaded users */}
        {data.overloadedUsers.map((user) => (
          <div
            key={user.userId}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-900/10"
          >
            <UserX className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sovraccarico: {formatHoursFromDecimal(user.assignedHours)} assegnate · {user.taskCount} task
              </p>
            </div>
          </div>
        ))}

        {/* At-risk dependencies */}
        {data.atRiskDependencies.map((dep, i) => (
          <Link
            key={`dep-${i}`}
            to={`/tasks/${dep.successorId}`}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                Dipendenza a rischio
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                «{dep.predecessorTitle}» blocca «{dep.successorTitle}» — {dep.daysUntilStart <= 0 ? 'scaduto' : `${dep.daysUntilStart}g rimanenti`}
              </p>
            </div>
          </Link>
        ))}

        {/* Unestimated tasks */}
        {data.unestimatedTasks.map((task) => (
          <Link
            key={task.id}
            to={`/tasks/${task.id}`}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <FileQuestion className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {task.code} — {task.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Senza stima ore</p>
            </div>
          </Link>
        ))}

        {/* Unassigned tasks */}
        {data.unassignedTasks.map((task) => (
          <Link
            key={task.id}
            to={`/tasks/${task.id}`}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <UserMinus className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {task.code} — {task.title}
                <span className={`ml-2 text-xs ${PRIORITY_COLORS[task.priority] ?? 'text-slate-400'}`}>
                  {task.priority}
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Senza assegnatario</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
