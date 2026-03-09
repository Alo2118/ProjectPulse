/**
 * Dashboard Page — JARVIS redesign (Phase 3, Tasks 9 & 10)
 *
 * Direzione layout  (admin / direzione roles)
 *   Zone 1: Greeting header + 4 KPI cards
 *   Zone 2: Attention alerts (auto-hides when empty)
 *   Zone 3: Projects table
 *
 * Dipendente layout (dipendente role)
 *   Zone 1: Greeting + today's hours inline
 *   Zone 2: "Oggi" task list
 *   Zone 3: "Prossimi giorni" task list
 *   Zone 4: Active timer card (conditional)
 *   Zone 5: Weekly summary mini-chart
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Clock,
  Play,
  Square,
  RefreshCw,
  FolderKanban,
  CalendarClock,
} from 'lucide-react'

import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useAnalyticsStore } from '@stores/analyticsStore'
import { useTimerToggle } from '@hooks/useTimerToggle'

import { HudStatusRing } from '@/components/ui/hud'
import { SectionHeader } from '@components/common/SectionHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import KPICard from '@/components/dashboard/KPICard'
import AttentionSection from '@/components/dashboard/AttentionSection'
import { StatCardSkeleton, ListItemSkeleton } from '@/components/ui/SkeletonLoader'
import { formatDuration, formatHoursFromDecimal } from '@utils/dateFormatters'
import { TERMINAL_TASK_STATUSES } from '@/constants/enums'
import { TASK_PRIORITY_DOT_COLORS, HEALTH_STATUS_LABELS } from '@/constants'
import type { HealthStatus } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Abbreviated Italian day labels Mon–Fri */
const DAY_ABBR = ['L', 'M', 'M', 'G', 'V'] as const

// ─── Inline live timer ────────────────────────────────────────────────────────

function LiveCounter({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startTime])

  // Split into parts for animated colon separators
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')

  return (
    <span className="font-mono text-2xl text-themed-accent glow-text tabular-nums" aria-live="polite">
      {h}
      <span className="animate-timer-tick opacity-100">:</span>
      {m}
      <span className="animate-timer-tick opacity-100">:</span>
      {s}
    </span>
  )
}

// ─── Health status → HudStatusRing status ───────────────────────────────────

function healthToRingStatus(health: string): 'active' | 'warning' | 'danger' | 'idle' {
  if (health === 'healthy') return 'active'
  if (health === 'at_risk') return 'warning'
  if (health === 'critical') return 'danger'
  return 'idle'
}

// ─── Progress % → semantic color for ProgressBar ────────────────────────────

function progressColor(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 50) return 'warning'
  return 'danger'
}

// ─── Weekly progress fill colour ─────────────────────────────────────────────

function weeklyProgressFill(pct: number): string {
  if (pct >= 80) return 'bg-semantic-success-solid'
  if (pct >= 50) return 'bg-semantic-warning-solid'
  return 'bg-semantic-danger-solid'
}

function weeklyProgressText(pct: number): string {
  if (pct >= 80) return 'text-semantic-success'
  if (pct >= 50) return 'text-semantic-warning'
  return 'text-semantic-danger'
}

// ─── IT month abbreviations for date display ─────────────────────────────────

const IT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const

function formatITDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} ${IT_MONTHS[d.getMonth()]}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="skeleton h-6 w-72" />
        <div className="skeleton h-3 w-40 mt-1" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="card p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const {
    myTasks,
    weeklyHours,
    runningTimer,
    isLoading,
    isLoadingTasks,
    isLoadingWeeklyHours,
    fetchDashboardData,
    fetchAllTasks,
  } = useDashboardStore()

  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()

  const {
    overview,
    projectHealth,
    teamWorkload,
    deliveryForecast,
    isLoading: isLoadingAnalytics,
    fetchAll: fetchAnalytics,
  } = useAnalyticsStore()

  const isDirezione = user?.role === 'admin' || user?.role === 'direzione'
  const firstName = user?.firstName ?? ''

  useEffect(() => {
    fetchDashboardData()
    if (isDirezione) {
      fetchAnalytics()
      fetchAllTasks()
    }
  }, [fetchDashboardData, fetchAnalytics, fetchAllTasks, isDirezione])

  // ── KPI calculations (direzione) ─────────────────────────────────────────

  const activeProjects = useMemo(() => overview?.activeProjects ?? 0, [overview])
  const atRiskCount = useMemo(
    () => projectHealth.filter((p) => p.healthStatus === 'at_risk').length,
    [projectHealth]
  )
  const criticalCount = useMemo(
    () => projectHealth.filter((p) => p.healthStatus === 'critical').length,
    [projectHealth]
  )
  const avgUtilization = useMemo(() => {
    if (!teamWorkload.length) return 0
    return Math.round(teamWorkload.reduce((s, w) => s + w.utilizationPercent, 0) / teamWorkload.length)
  }, [teamWorkload])

  // ── Task groupings (dipendente) ───────────────────────────────────────────

  const today = useMemo(() => new Date(), [])

  const { todayTasks, nextDaysTasks } = useMemo(() => {
    const active = myTasks.filter((t) => !(TERMINAL_TASK_STATUSES as readonly string[]).includes(t.status))
    const todayList = active.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), today)
    )
    // Also include overdue (past, not done/cancelled) as priority today items
    const overdue = active.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < today &&
        !isSameDay(new Date(t.dueDate), today)
    )
    const combinedToday = [...todayList, ...overdue]

    // Next 3-5 days: tomorrow through +5 days
    const nextDays: Array<{ dateLabel: string; tasks: typeof active }> = []
    for (let offset = 1; offset <= 5; offset++) {
      const target = new Date(today)
      target.setDate(today.getDate() + offset)
      const dayTasks = active.filter(
        (t) => t.dueDate && isSameDay(new Date(t.dueDate), target)
      )
      if (dayTasks.length > 0) {
        nextDays.push({
          dateLabel: format(target, 'EEEE d MMM', { locale: it }),
          tasks: dayTasks,
        })
      }
    }

    return { todayTasks: combinedToday, nextDaysTasks: nextDays }
  }, [myTasks, today])

  // ── Weekly hours (dipendente) ─────────────────────────────────────────────

  const { todayHours, dailyTarget, weeklyTotalMinutes, weeklyTarget, weeklyPercent, dailyBars } =
    useMemo(() => {
      const target = weeklyHours ? weeklyHours.weeklyTarget / 5 : 8
      const todayDow = today.getDay()
      const byDayIndex = todayDow === 0 ? -1 : todayDow - 1
      let todayMins = 0
      if (weeklyHours && byDayIndex >= 0 && weeklyHours.byDay[byDayIndex]) {
        todayMins = weeklyHours.byDay[byDayIndex].totalMinutes
      }
      const wTarget = weeklyHours ? weeklyHours.weeklyTarget : 40
      const wTotal = weeklyHours ? weeklyHours.totalMinutes : 0
      const pct =
        wTarget > 0 ? Math.min(Math.round(((wTotal / 60) / wTarget) * 100), 100) : 0

      const bars = DAY_ABBR.map((abbr, idx) => {
        const dayData = weeklyHours?.byDay[idx]
        const minutes = dayData ? dayData.totalMinutes : 0
        return { abbr, minutes }
      })
      const maxMins = Math.max(...bars.map((b) => b.minutes), 1)
      const todayBarIndex = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : -1

      return {
        todayHours: formatDuration(todayMins),
        dailyTarget: target,
        weeklyTotalMinutes: wTotal,
        weeklyTarget: wTarget,
        weeklyPercent: pct,
        dailyBars: bars.map((b, i) => ({
          ...b,
          heightPct: (b.minutes / maxMins) * 100,
          isToday: i === todayBarIndex,
        })),
      }
    }, [weeklyHours, today])

  // ── Timer toggle callback ─────────────────────────────────────────────────

  const onToggleTimer = useCallback(
    (taskId: string) => {
      void handleTimerToggle(taskId)
    },
    [handleTimerToggle]
  )

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return <DashboardSkeleton />

  // ─────────────────────────────────────────────────────────────────────────
  // Render: direzione
  // ─────────────────────────────────────────────────────────────────────────

  if (isDirezione) {
    return (
      <div className="space-y-5 animate-fade-in">

        {/* ── Zone 1: Greeting + KPI row ───────────────────────────────── */}
        <div>
          {/* Greeting */}
          <p className="text-lg text-themed-tertiary">
            Buongiorno,{' '}
            <span className="text-themed-heading font-semibold">{firstName}</span>.
          </p>
          <p className="text-xs text-themed-secondary mt-0.5">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
          </p>

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {isLoadingAnalytics ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <KPICard
                  value={activeProjects}
                  label="Progetti attivi"
                  color="cyan"
                  delay={0}
                />
                <KPICard
                  value={atRiskCount}
                  label="A rischio"
                  color="amber"
                  delay={100}
                  onClick={atRiskCount > 0 ? () => navigate('/projects?health=at_risk') : undefined}
                />
                <KPICard
                  value={criticalCount}
                  label="Critici"
                  color="red"
                  delay={200}
                  onClick={criticalCount > 0 ? () => navigate('/projects?health=critical') : undefined}
                />
                <KPICard
                  value={avgUtilization}
                  label="Utilizzo team %"
                  color="indigo"
                  delay={300}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Zone 2: Attention section (auto-hides when empty) ─────────── */}
        <AttentionSection
          role="direzione"
          projectHealth={projectHealth}
          teamWorkload={teamWorkload}
          overview={overview ?? undefined}
        />

        {/* ── Zone 3: Projects table ────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-4 pb-0">
            <SectionHeader icon={FolderKanban} label="Progetti" />
          </div>

          {isLoadingAnalytics ? (
            <div className="px-4 pb-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          ) : projectHealth.length === 0 ? (
            <div className="px-4 pb-6 text-center text-themed-secondary text-sm">
              Nessun progetto attivo
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]/40">
                  <th className="px-4 py-2 text-xs uppercase tracking-widest text-themed-tertiary font-medium text-left">
                    Progetto
                  </th>
                  <th className="hidden sm:table-cell px-4 py-2 text-xs uppercase tracking-widest text-themed-tertiary font-medium text-left">
                    Stato
                  </th>
                  <th className="px-4 py-2 text-xs uppercase tracking-widest text-themed-tertiary font-medium text-left">
                    Progresso
                  </th>
                  <th className="hidden md:table-cell px-4 py-2 text-xs uppercase tracking-widest text-themed-tertiary font-medium text-left">
                    Scadenza
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectHealth.map((p, idx) => {
                  const ringStatus = healthToRingStatus(p.healthStatus)
                  const pColor = progressColor(p.progress)
                  const forecast = deliveryForecast.find((f) => f.projectId === p.projectId)
                  const deadlineStr = forecast?.targetEndDate
                    ? formatITDate(forecast.targetEndDate)
                    : p.daysRemaining !== null && p.daysRemaining !== undefined
                      ? `${p.daysRemaining}g`
                      : ''

                  return (
                    <tr
                      key={p.projectId}
                      className="table-row-hover cursor-pointer animate-fade-in-stagger"
                      style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                      onClick={() => navigate(`/projects/${p.projectId}`)}
                      role="row"
                      aria-label={`Progetto ${p.projectName}`}
                    >
                      {/* Progetto */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-themed-primary truncate block max-w-[16rem]">
                          {p.projectName}
                        </span>
                      </td>

                      {/* Stato */}
                      <td className="hidden sm:table-cell px-4 py-3">
                        <div className="flex items-center gap-2">
                          <HudStatusRing status={ringStatus} size={12} />
                          <span className="text-xs text-themed-tertiary capitalize">
                            {HEALTH_STATUS_LABELS[p.healthStatus as HealthStatus]}
                          </span>
                        </div>
                      </td>

                      {/* Progresso */}
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar
                              value={p.progress}
                              segments={8}
                              segmented
                              color={pColor}
                              size="sm"
                              animated={false}
                            />
                          </div>
                          <span className="font-mono text-xs text-themed-tertiary tabular-nums w-8 text-right">
                            {p.progress}%
                          </span>
                        </div>
                      </td>

                      {/* Scadenza */}
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-themed-tertiary">
                        {deadlineStr || (
                          <span className="text-themed-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: dipendente
  // ─────────────────────────────────────────────────────────────────────────

  const isLoadingAll = isLoadingTasks || isLoadingWeeklyHours

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Zone 1: Greeting + hours inline ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: greeting */}
        <div>
          <p className="text-lg text-themed-tertiary">
            Buongiorno,{' '}
            <span className="text-themed-heading font-semibold">{firstName}</span>.
          </p>
          <p className="text-xs text-themed-secondary mt-0.5">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
          </p>
        </div>

        {/* Right: today's hours */}
        {canTrackTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-themed-secondary flex-shrink-0" aria-hidden />
            <span className="font-mono text-semantic-warning font-semibold tabular-nums">
              {todayHours}
            </span>
            <span className="text-themed-secondary">
              / {formatHoursFromDecimal(dailyTarget)}h oggi
            </span>
          </div>
        )}
      </div>

      {/* ── Zone 2: "Oggi" ────────────────────────────────────────────────── */}
      <section aria-label="Task di oggi">
        <SectionHeader icon={CalendarClock} label="Oggi" count={todayTasks.length > 0 ? todayTasks.length : undefined} className="mb-3" />

        {isLoadingAll ? (
          <div className="card p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="card p-5 text-center text-themed-secondary text-sm">
            Nessun task in scadenza oggi
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {todayTasks.map((task, idx) => {
              const isRunning = runningTimerTaskId === task.id
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent-primary-bg)] transition-colors group animate-fade-in-stagger"
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
                >
                  {/* Priority dot */}
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${TASK_PRIORITY_DOT_COLORS[task.priority] ?? TASK_PRIORITY_DOT_COLORS.low}`}
                    aria-label={`Priorita: ${task.priority}`}
                  />

                  {/* Title + project */}
                  <Link to={`/tasks/${task.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-themed-primary truncate hover:text-themed-accent transition-colors">
                      {task.title}
                      {task.isRecurring && (
                        <RefreshCw
                          className="inline-block w-3 h-3 ml-1.5 text-themed-secondary"
                          aria-label="Task ricorrente"
                        />
                      )}
                    </p>
                    {task.project && (
                      <p className="text-xs text-themed-tertiary truncate">{task.project.name}</p>
                    )}
                  </Link>

                  {/* Timer button */}
                  {canTrackTime && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        onToggleTimer(task.id)
                      }}
                      aria-label={isRunning ? 'Stop timer' : 'Avvia timer'}
                      className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                        isRunning
                          ? 'bg-semantic-danger-solid text-white hover:bg-semantic-danger-solid'
                          : 'text-themed-tertiary hover:text-themed-accent opacity-0 group-hover:opacity-100 focus:opacity-100'
                      }`}
                    >
                      {isRunning ? (
                        <Square className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <Play className="w-3.5 h-3.5" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Zone 3: "Prossimi giorni" ────────────────────────────────────── */}
      {!isLoadingAll && nextDaysTasks.length > 0 && (
        <section aria-label="Task prossimi giorni">
          <SectionHeader icon={CalendarClock} label="Prossimi giorni" className="mb-3" />

          <div className="space-y-3">
            {nextDaysTasks.map(({ dateLabel, tasks }, groupIdx) => (
              <div key={groupIdx}>
                {/* Date subheader */}
                <p className="text-xs text-themed-secondary capitalize mb-1 px-1">
                  {dateLabel}
                </p>

                <div className="card divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--accent-primary-bg)] transition-colors animate-fade-in-stagger"
                      style={{
                        animationDelay: `${(groupIdx * 5 + idx) * 30}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      {/* Priority dot */}
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${TASK_PRIORITY_DOT_COLORS[task.priority] ?? TASK_PRIORITY_DOT_COLORS.low}`}
                        aria-label={`Priorita: ${task.priority}`}
                      />

                      {/* Title + project */}
                      <Link to={`/tasks/${task.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-themed-primary truncate hover:text-themed-accent transition-colors">
                          {task.title}
                          {task.isRecurring && (
                            <RefreshCw
                              className="inline-block w-3 h-3 ml-1.5 text-themed-secondary"
                              aria-label="Task ricorrente"
                            />
                          )}
                        </p>
                        {task.project && (
                          <p className="text-xs text-themed-tertiary truncate">{task.project.name}</p>
                        )}
                      </Link>

                      {/* Date label (right-aligned) */}
                      <span className="text-xs text-themed-secondary flex-shrink-0 font-mono tabular-nums">
                        {task.dueDate ? formatITDate(task.dueDate) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Zone 4: Active timer (conditional) ───────────────────────────── */}
      {runningTimer && (
        <section aria-label="Timer attivo" aria-live="polite">
          <div className="card border-[var(--accent-primary)]/20 animate-glow-pulse p-5 space-y-4">
            {/* Pulsing header */}
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0" aria-hidden>
                <div className="w-2.5 h-2.5 bg-semantic-success-solid rounded-full" />
                <div className="absolute inset-0 w-2.5 h-2.5 bg-semantic-success-solid rounded-full animate-ping opacity-40" />
              </div>
              <span className="text-xs font-semibold text-semantic-success uppercase tracking-wide">
                Timer in esecuzione
              </span>
            </div>

            {/* Task info */}
            <div className="min-w-0">
              <Link
                to={`/tasks/${runningTimer.taskId}`}
                className="text-sm font-semibold text-themed-primary hover:text-themed-accent transition-colors truncate block"
              >
                {runningTimer.task?.title ?? 'Timer attivo'}
              </Link>
              {runningTimer.task?.project && (
                <p className="text-xs text-themed-tertiary mt-0.5 truncate">
                  {runningTimer.task.project.name}
                </p>
              )}
            </div>

            {/* Large timer display */}
            <div className="flex items-center justify-center py-2">
              <LiveCounter startTime={runningTimer.startTime} />
            </div>

            {/* Stop button */}
            <button
              onClick={() => onToggleTimer(runningTimer.taskId)}
              className="btn-primary w-full bg-semantic-danger-solid hover:opacity-90 shadow-glow-red"
              aria-label="Ferma timer"
            >
              <Square className="w-4 h-4 mr-2" aria-hidden />
              Ferma timer
            </button>
          </div>
        </section>
      )}

      {/* ── Zone 5: Weekly summary ────────────────────────────────────────── */}
      {canTrackTime && (
        <section aria-label="Riepilogo settimanale">
          <div className="card p-5">
            <SectionHeader icon={Clock} label="Settimana" />

            {/* Hours + progress */}
            <div className="flex items-baseline gap-1 mb-3">
              <span className={`text-xl font-bold tabular-nums ${weeklyProgressText(weeklyPercent)}`}>
                {formatDuration(weeklyTotalMinutes)}
              </span>
              <span className="text-sm text-themed-secondary">
                / {formatHoursFromDecimal(weeklyTarget)}h
              </span>
              <span className={`ml-auto text-sm font-semibold tabular-nums ${weeklyProgressText(weeklyPercent)}`}>
                {weeklyPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-1.5 bg-[var(--bg-card-hover)] rounded-full overflow-hidden mb-4"
              role="progressbar"
              aria-valuenow={weeklyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${weeklyPercent}% dell'obiettivo settimanale`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ${weeklyProgressFill(weeklyPercent)}`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>

            {/* Mini daily bar chart */}
            <div
              className="flex items-end gap-1 h-14"
              aria-label="Ore giornaliere questa settimana"
            >
              {dailyBars.map((bar, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                >
                  <div
                    className="w-full flex items-end justify-center"
                    style={{ height: 'calc(100% - 1rem)' }}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${
                        bar.isToday
                          ? 'bg-[var(--accent-primary)]'
                          : bar.minutes > 0
                            ? 'bg-[var(--bg-disabled)]'
                            : 'bg-[var(--bg-sidebar)]'
                      }`}
                      style={{ height: `${Math.max(bar.heightPct, bar.minutes > 0 ? 8 : 2)}%` }}
                      title={`${bar.abbr}: ${formatDuration(bar.minutes)}`}
                    />
                  </div>
                  <span
                    className={`text-xs leading-none tabular-nums ${
                      bar.isToday ? 'font-bold text-themed-accent' : 'text-themed-secondary'
                    }`}
                  >
                    {bar.abbr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
