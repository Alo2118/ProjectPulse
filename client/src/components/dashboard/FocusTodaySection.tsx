/**
 * FocusTodaySection - Primary daily focus component for the Dipendente dashboard
 *
 * Sections:
 *   A. Status bar — greeting + today's task count + hours logged vs daily target
 *   B. Two-column layout
 *      B1. Left (3/5): Tasks grouped by due-date horizon (today, tomorrow, this week, no due date)
 *      B2. Right (2/5): Running timer card + weekly progress bar with mini daily chart
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, Square, Clock, Calendar, Target } from 'lucide-react'
import type { Task, UserWeeklyHours, TimeEntry } from '@/types'
import { formatDuration, formatHoursFromDecimal } from '@utils/dateFormatters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusTodaySectionProps {
  tasks: Task[]
  weeklyHours: UserWeeklyHours | null
  runningTimer: TimeEntry | null
  canTrackTime: boolean
  runningTimerTaskId: string | null
  onTimerToggle: (taskId: string) => void
  isLoading?: boolean
  userName?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300 dark:bg-slate-600',
}

/** Italian abbreviated day labels Mon–Fri (ISO weekday 1–5, array index 0–4) */
const DAY_ABBR = ['L', 'M', 'M', 'G', 'V']

// ─── Helper utilities ─────────────────────────────────────────────────────────

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getProgressFillColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressTextColor(percent: number): string {
  if (percent >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (percent >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Inline live timer that counts up every second from a given startTime.
 * Kept local to this file to avoid an import dependency for such a simple need,
 * but mirrors the pattern from LiveTimer.tsx exactly.
 */
function InlineLiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <span className="font-mono font-bold text-3xl text-cyan-600 dark:text-cyan-400 tabular-nums">
      {formatElapsed(elapsed)}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FocusSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status bar skeleton */}
      <div className="rounded-xl p-4 bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-900/20 dark:to-transparent">
        <div className="skeleton h-6 w-96 max-w-full" />
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-3 card p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-2 h-2 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/3" />
              </div>
              <div className="skeleton w-6 h-6 rounded-lg flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="skeleton h-5 w-32 mb-4" />
            <div className="skeleton h-10 w-40 mb-2" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
          <div className="card p-5">
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-32 mb-3" />
            <div className="skeleton h-2.5 w-full rounded-full mb-4" />
            <div className="flex items-end gap-1 h-16">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1">
                  <div className="skeleton rounded-sm" style={{ height: `${40 + i * 8}%` }} />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Horizon section header ────────────────────────────────────────────────────

interface HorizonHeaderProps {
  label: string
  count: number
  emphasis?: boolean
}

function HorizonHeader({ label, count, emphasis = false }: HorizonHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span
        className={
          emphasis
            ? 'text-sm font-semibold text-cyan-600 dark:text-cyan-400'
            : 'text-sm font-medium text-slate-500 dark:text-slate-400'
        }
      >
        {label}
      </span>
      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
        {count}
      </span>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task
  isRunningTimer: boolean
  canTrackTime: boolean
  onTimerToggle: (taskId: string) => void
}

function TaskRow({ task, isRunningTimer, canTrackTime, onTimerToggle }: TaskRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      {/* Priority dot */}
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.low}`}
        title={task.priority}
        aria-label={`Priorita: ${task.priority}`}
      />

      {/* Title + project */}
      <Link to={`/tasks/${task.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 truncate">
          {task.title}
        </p>
        {task.project && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {task.project.name}
          </p>
        )}
      </Link>

      {/* Timer button */}
      {canTrackTime && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onTimerToggle(task.id)
          }}
          title={isRunningTimer ? 'Stop timer' : 'Avvia timer'}
          aria-label={isRunningTimer ? 'Stop timer' : 'Avvia timer'}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
            isRunningTimer
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'text-slate-400 hover:text-cyan-500 opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
        >
          {isRunningTimer ? (
            <Square className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Play className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FocusTodaySection({
  tasks,
  weeklyHours,
  runningTimer,
  canTrackTime,
  runningTimerTaskId,
  onTimerToggle,
  isLoading = false,
  userName,
}: FocusTodaySectionProps) {
  // ── Date boundaries ──────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => today.toDateString(), [today])

  const tomorrow = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return d
  }, [today])
  const tomorrowStr = useMemo(() => tomorrow.toDateString(), [tomorrow])

  const weekEnd = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return d
  }, [today])

  // ── Task grouping ────────────────────────────────────────────────────────
  const { todayTasks, tomorrowTasks, weekTasks, noDueDateTasks } = useMemo(() => {
    const active = tasks.filter((t) => !['done', 'cancelled'].includes(t.status))

    const todayList: Task[] = []
    const tomorrowList: Task[] = []
    const weekList: Task[] = []
    const noDueList: Task[] = []

    for (const t of active) {
      if (!t.dueDate) {
        noDueList.push(t)
        continue
      }
      const d = new Date(t.dueDate)
      if (d.toDateString() === todayStr) {
        todayList.push(t)
      } else if (d.toDateString() === tomorrowStr) {
        tomorrowList.push(t)
      } else if (d > tomorrow && d <= weekEnd) {
        weekList.push(t)
      }
    }

    return {
      todayTasks: todayList,
      tomorrowTasks: tomorrowList,
      weekTasks: weekList,
      noDueDateTasks: noDueList.slice(0, 3),
    }
  }, [tasks, todayStr, tomorrowStr, tomorrow, weekEnd])

  // ── Status bar metrics ───────────────────────────────────────────────────
  const { todayTaskCount, todayMinutes: todayMinutesLogged, dailyTarget } = useMemo(() => {
    const count = todayTasks.length
    const target = weeklyHours ? weeklyHours.weeklyTarget / 5 : 8

    // Find today's day-of-week (0=Sun…6=Sat); byDay uses ISO (1=Mon…7=Sun) mapped to index 0–6
    const todayDow = today.getDay() // 0=Sun, 1=Mon, …, 6=Sat
    // byDay from the API: index 0 = Mon (dayOfWeek=1), …, index 4 = Fri (dayOfWeek=5)
    // We convert JS getDay() → byDay index: Mon=0, Tue=1, …, Fri=4
    const byDayIndex = todayDow === 0 ? -1 : todayDow - 1 // -1 on Sunday (weekend)

    let todayMinutes = 0
    if (weeklyHours && byDayIndex >= 0 && weeklyHours.byDay[byDayIndex]) {
      todayMinutes = weeklyHours.byDay[byDayIndex].totalMinutes
    }
    return { todayTaskCount: count, todayMinutes, dailyTarget: target }
  }, [todayTasks, weeklyHours, today])

  // ── Weekly progress ──────────────────────────────────────────────────────
  const { weeklyTotalMinutes, weeklyTarget, weeklyPercent, dailyBars } = useMemo(() => {
    const target = weeklyHours ? weeklyHours.weeklyTarget : 40
    const totalMins = weeklyHours ? weeklyHours.totalMinutes : 0
    const currentHoursDecimal = totalMins / 60
    const percent = target > 0 ? Math.min(Math.round((currentHoursDecimal / target) * 100), 100) : 0

    // Build 5-bar data (Mon–Fri, byDay index 0–4)
    const bars = DAY_ABBR.map((abbr, idx) => {
      const dayData = weeklyHours?.byDay[idx]
      const minutes = dayData ? dayData.totalMinutes : 0
      return { abbr, minutes }
    })

    const maxMinutes = Math.max(...bars.map((b) => b.minutes), 1)

    // Determine "today" bar index (Mon=0…Fri=4, other days = -1)
    const todayDow = new Date().getDay()
    const todayBarIndex = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : -1

    return {
      weeklyTotalMinutes: totalMins,
      weeklyTarget: target,
      weeklyPercent: percent,
      dailyBars: bars.map((b, i) => ({
        ...b,
        heightPct: maxMinutes > 0 ? (b.minutes / maxMinutes) * 100 : 0,
        isToday: i === todayBarIndex,
      })),
    }
  }, [weeklyHours])

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) return <FocusSkeleton />

  const hasAnyTask =
    todayTasks.length > 0 ||
    tomorrowTasks.length > 0 ||
    weekTasks.length > 0 ||
    noDueDateTasks.length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── A. Status Bar ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-900/20 dark:to-transparent"
        role="banner"
        aria-label="Riepilogo giornaliero"
      >
        <p className="text-lg text-slate-700 dark:text-slate-300 leading-snug">
          Buongiorno,{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {userName ?? 'utente'}
          </span>
          ! Oggi hai{' '}
          <span className="font-semibold text-cyan-600 dark:text-cyan-400">
            {todayTaskCount} {todayTaskCount === 1 ? 'task' : 'task'}
          </span>{' '}
          in scadenza{' '}
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 text-base">
            <Clock className="w-4 h-4 opacity-70" aria-hidden />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatDuration(todayMinutesLogged)}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              / {formatHoursFromDecimal(dailyTarget)} loggate oggi
            </span>
          </span>
        </p>
      </div>

      {/* ── B. Two-column layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── B1. Left: Task list by horizon ──────────────────────────────── */}
        <section
          className="lg:col-span-3 card p-5"
          aria-label="Task per scadenza"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan-500" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Focus della settimana
            </h2>
          </div>

          {!hasAnyTask ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden />
              <p className="text-sm italic">
                Nessun task con scadenza questa settimana
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Oggi */}
              {todayTasks.length > 0 && (
                <div>
                  <HorizonHeader label="Oggi" count={todayTasks.length} emphasis />
                  <div>
                    {todayTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isRunningTimer={runningTimerTaskId === task.id}
                        canTrackTime={canTrackTime}
                        onTimerToggle={onTimerToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Domani */}
              {tomorrowTasks.length > 0 && (
                <div>
                  <HorizonHeader label="Domani" count={tomorrowTasks.length} />
                  <div>
                    {tomorrowTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isRunningTimer={runningTimerTaskId === task.id}
                        canTrackTime={canTrackTime}
                        onTimerToggle={onTimerToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Questa settimana */}
              {weekTasks.length > 0 && (
                <div>
                  <HorizonHeader label="Questa settimana" count={weekTasks.length} />
                  <div>
                    {weekTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isRunningTimer={runningTimerTaskId === task.id}
                        canTrackTime={canTrackTime}
                        onTimerToggle={onTimerToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Senza scadenza */}
              {noDueDateTasks.length > 0 && (
                <div>
                  <HorizonHeader label="Senza scadenza" count={noDueDateTasks.length} />
                  <div>
                    {noDueDateTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isRunningTimer={runningTimerTaskId === task.id}
                        canTrackTime={canTrackTime}
                        onTimerToggle={onTimerToggle}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── B2. Right: Timer + Weekly progress ──────────────────────────── */}
        <aside className="lg:col-span-2 space-y-4" aria-label="Timer e progresso settimanale">

          {/* Running timer card */}
          <div
            className={`card p-5 transition-all duration-300 ${
              runningTimer
                ? 'border-cyan-400/40 dark:border-cyan-500/40 bg-gradient-to-br from-cyan-50/60 to-transparent dark:from-cyan-900/25 dark:to-transparent'
                : ''
            }`}
            aria-live="polite"
            aria-label="Timer attivo"
          >
            {runningTimer ? (
              <div className="space-y-4">
                {/* Header row with pulse dot */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0" aria-hidden>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-40" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Timer in esecuzione
                  </span>
                </div>

                {/* Task info */}
                <div className="min-w-0">
                  <Link
                    to={`/tasks/${runningTimer.taskId}`}
                    className="text-sm font-semibold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 truncate block"
                  >
                    {runningTimer.task?.title ?? 'Timer attivo'}
                  </Link>
                  {runningTimer.task?.project && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {runningTimer.task.project.name}
                    </p>
                  )}
                </div>

                {/* Live counter — full width, centred, large */}
                <div className="flex items-center justify-center py-2">
                  <InlineLiveTimer startTime={runningTimer.startTime} />
                </div>

                {/* Stop button */}
                <button
                  onClick={() => onTimerToggle(runningTimer.taskId)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] transition-all font-medium text-sm shadow-md shadow-red-500/20"
                  aria-label="Ferma timer"
                >
                  <Square className="w-4 h-4" aria-hidden />
                  Ferma timer
                </button>
              </div>
            ) : (
              /* No timer active */
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 py-1">
                <Clock className="w-4 h-4 flex-shrink-0 opacity-60" aria-hidden />
                <span className="text-sm">Nessun timer attivo</span>
              </div>
            )}
          </div>

          {/* Weekly progress card */}
          <div className="card p-5" aria-label="Progresso settimanale">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-cyan-500" aria-hidden />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Progresso Settimana
              </span>
            </div>

            {/* Hours */}
            <div className="flex items-baseline gap-1 mb-3">
              <span className={`text-2xl font-bold ${getProgressTextColor(weeklyPercent)}`}>
                {formatDuration(weeklyTotalMinutes)}
              </span>
              <span className="text-base text-slate-400 dark:text-slate-500">
                / {formatHoursFromDecimal(weeklyTarget)}
              </span>
              <span className={`ml-auto text-sm font-semibold ${getProgressTextColor(weeklyPercent)}`}>
                {weeklyPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4"
              role="progressbar"
              aria-valuenow={weeklyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${weeklyPercent}% dell'obiettivo settimanale completato`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressFillColor(weeklyPercent)}`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>

            {/* Mini daily bar chart */}
            <div
              className="flex items-end gap-1 h-16"
              aria-label="Ore giornaliere questa settimana"
            >
              {dailyBars.map((bar, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                >
                  {/* Bar */}
                  <div className="w-full flex items-end justify-center" style={{ height: 'calc(100% - 1.25rem)' }}>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${
                        bar.isToday
                          ? 'bg-cyan-500 dark:bg-cyan-400'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      style={{ height: `${Math.max(bar.heightPct, bar.minutes > 0 ? 8 : 2)}%` }}
                      title={`${bar.abbr}: ${formatDuration(bar.minutes)}`}
                    />
                  </div>
                  {/* Day label */}
                  <span
                    className={`text-xs leading-none ${
                      bar.isToday
                        ? 'font-bold text-cyan-600 dark:text-cyan-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-label={bar.abbr}
                  >
                    {bar.abbr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
