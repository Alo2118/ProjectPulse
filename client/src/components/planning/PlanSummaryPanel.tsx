/**
 * PlanSummaryPanel - Final review panel for the planning wizard (Step 3: Conferma).
 * Displays a summary of milestones/tasks/hours, per-user distribution with
 * overload warnings, an inline timeline preview, and confirm/back actions.
 * @module components/planning/PlanSummaryPanel
 */

import { useMemo } from 'react'
import {
  Flag,
  CheckSquare,
  CircleDot,
  Clock,
  Users,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Rocket,
} from 'lucide-react'
import type { PlanTask, ScheduledTask } from '@stores/planningStore'
import { PlanTimelinePreview } from './PlanTimelinePreview'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamCapacityEntry {
  userId: string
  firstName: string
  lastName: string
  availableHours: number
  assignedHours: number
}

export interface PlanSummaryPanelProps {
  tasks: PlanTask[]
  scheduledTasks: ScheduledTask[] | null
  teamCapacity: TeamCapacityEntry[]
  totalDurationDays: number
  onConfirm: () => void
  onBack: () => void
  isCommitting: boolean
}

// ---------------------------------------------------------------------------
// Helper: compute derived stats
// ---------------------------------------------------------------------------

interface PlanStats {
  milestoneCount: number
  taskCount: number
  subtaskCount: number
  totalHours: number
  unassignedCount: number
  unestimatedCount: number
}

function computeStats(tasks: PlanTask[]): PlanStats {
  let milestoneCount = 0
  let taskCount = 0
  let subtaskCount = 0
  let totalHours = 0
  let unassignedCount = 0
  let unestimatedCount = 0

  for (const t of tasks) {
    if (t.taskType === 'milestone') milestoneCount++
    else if (t.taskType === 'task') taskCount++
    else if (t.taskType === 'subtask') subtaskCount++

    totalHours += t.estimatedHours ?? 0

    if (!t.assigneeId) unassignedCount++
    if (!t.estimatedHours || t.estimatedHours === 0) unestimatedCount++
  }

  return { milestoneCount, taskCount, subtaskCount, totalHours, unassignedCount, unestimatedCount }
}

// ---------------------------------------------------------------------------
// Sub-component: Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg p-3 flex flex-col gap-1">
      <div className={`${color}`}>{icon}</div>
      <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: User distribution row
// ---------------------------------------------------------------------------

interface UserDistRowProps {
  userId: string
  firstName: string
  lastName: string
  taskCount: number
  assignedHours: number
  availableHours: number
}

function UserDistRow({ firstName, lastName, taskCount, assignedHours, availableHours }: UserDistRowProps) {
  const isOverloaded = availableHours > 0 && assignedHours > availableHours
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase()
  const pct = availableHours > 0 ? Math.min(Math.round((assignedHours / availableHours) * 100), 150) : 100

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
        {initials}
      </div>

      {/* Name + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {firstName} {lastName}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {taskCount} {taskCount === 1 ? 'task' : 'task'}
            </span>
            <span className={`text-xs font-semibold ${isOverloaded ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {formatHoursFromDecimal(assignedHours)}
              {availableHours > 0 && ` / ${formatHoursFromDecimal(availableHours)}`}
            </span>
            {isOverloaded && (
              <AlertTriangle size={12} className="text-red-500 flex-shrink-0" aria-label="Utente sovraccarico" />
            )}
          </div>
        </div>
        {/* Capacity bar */}
        {availableHours > 0 && (
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-visible relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverloaded
                  ? 'bg-red-500 dark:bg-red-400'
                  : pct >= 80
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : 'bg-emerald-500 dark:bg-emerald-400'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanSummaryPanel({
  tasks,
  scheduledTasks,
  teamCapacity,
  totalDurationDays,
  onConfirm,
  onBack,
  isCommitting,
}: PlanSummaryPanelProps) {
  const stats = useMemo(() => computeStats(tasks), [tasks])

  // Per-user task counts and hours derived from the plan itself
  const userDistribution = useMemo(() => {
    const map = new Map<string, { taskCount: number; assignedHours: number }>()

    for (const t of tasks) {
      if (t.assigneeId) {
        const entry = map.get(t.assigneeId) ?? { taskCount: 0, assignedHours: 0 }
        entry.taskCount++
        entry.assignedHours += t.estimatedHours ?? 0
        map.set(t.assigneeId, entry)
      }
    }

    return map
  }, [tasks])

  // Merge with teamCapacity to get names and availability
  const distributionRows = useMemo(() => {
    return Array.from(userDistribution.entries()).map(([userId, dist]) => {
      const capacity = teamCapacity.find((c) => c.userId === userId)
      return {
        userId,
        firstName: capacity?.firstName ?? 'Utente',
        lastName: capacity?.lastName ?? '',
        taskCount: dist.taskCount,
        assignedHours: dist.assignedHours,
        availableHours: capacity?.availableHours ?? 0,
      }
    })
  }, [userDistribution, teamCapacity])

  // Overloaded users
  const overloadedUsers = useMemo(
    () => distributionRows.filter((r) => r.availableHours > 0 && r.assignedHours > r.availableHours),
    [distributionRows]
  )

  // Warnings list
  const warnings = useMemo(() => {
    const list: string[] = []
    if (stats.unassignedCount > 0) {
      list.push(`${stats.unassignedCount} ${stats.unassignedCount === 1 ? 'task non assegnato' : 'task non assegnati'}`)
    }
    if (stats.unestimatedCount > 0) {
      list.push(`${stats.unestimatedCount} ${stats.unestimatedCount === 1 ? 'task senza stima ore' : 'task senza stima ore'}`)
    }
    for (const user of overloadedUsers) {
      list.push(
        `${user.firstName} ${user.lastName} superera la capacita (${formatHoursFromDecimal(user.assignedHours)} / ${formatHoursFromDecimal(user.availableHours)} disponibili)`
      )
    }
    return list
  }, [stats, overloadedUsers])

  const criticalPathLength = scheduledTasks
    ? scheduledTasks.filter((st) => st.isCriticalPath).length
    : 0

  return (
    <div className="space-y-4">
      {/* ----------------------------------------------------------------- */}
      {/* Section 1: Riepilogo                                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckSquare size={15} className="text-cyan-500" aria-hidden="true" />
          Riepilogo
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            icon={<Flag size={14} />}
            label="Milestone"
            value={stats.milestoneCount}
            color="text-purple-500 dark:text-purple-400"
          />
          <StatTile
            icon={<CheckSquare size={14} />}
            label="Task"
            value={stats.taskCount}
            color="text-blue-500 dark:text-blue-400"
          />
          <StatTile
            icon={<CircleDot size={14} />}
            label="Subtask"
            value={stats.subtaskCount}
            color="text-slate-500 dark:text-slate-400"
          />
          <StatTile
            icon={<Clock size={14} />}
            label="Ore totali"
            value={formatHoursFromDecimal(stats.totalHours)}
            color="text-amber-500 dark:text-amber-400"
          />
        </div>

        {totalDurationDays > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Clock size={13} className="text-slate-400" aria-hidden="true" />
            Durata stimata:
            <span className="font-semibold text-slate-900 dark:text-white ml-1">
              {totalDurationDays} giorni
            </span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Section 2: Distribuzione per utente                                */}
      {/* ----------------------------------------------------------------- */}
      {distributionRows.length > 0 && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={15} className="text-cyan-500" aria-hidden="true" />
            Distribuzione per Utente
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {distributionRows.map((row) => (
              <UserDistRow key={row.userId} {...row} />
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Section 3: Timeline                                                */}
      {/* ----------------------------------------------------------------- */}
      {scheduledTasks && scheduledTasks.length > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Flag size={15} className="text-cyan-500" aria-hidden="true" />
            Timeline
          </h3>
          <PlanTimelinePreview
            tasks={tasks}
            scheduledTasks={scheduledTasks}
            totalDurationDays={totalDurationDays}
            criticalPathLength={criticalPathLength}
          />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Section 4: Warnings                                                */}
      {/* ----------------------------------------------------------------- */}
      {warnings.length > 0 && (
        <div className="card p-4 space-y-2 border border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle size={15} aria-hidden="true" />
            Avvertenze ({warnings.length})
          </h3>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Section 5: Actions                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isCommitting}
          aria-label="Torna al passo precedente"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ChevronLeft size={15} aria-hidden="true" />
          Indietro
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isCommitting || tasks.length === 0}
          aria-label="Crea i task nel progetto"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {isCommitting ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Creazione in corso...
            </>
          ) : (
            <>
              <Rocket size={14} aria-hidden="true" />
              Crea Task
            </>
          )}
        </button>
      </div>
    </div>
  )
}
