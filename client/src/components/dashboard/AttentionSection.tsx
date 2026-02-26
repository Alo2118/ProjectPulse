/**
 * AttentionSection - Actionable alert section for dashboard (Direzione + Dipendente)
 *
 * Returns null when there are no alerts — renders absolutely nothing if everything is fine.
 * Designed to feel urgent but professional, not alarming.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, XCircle, Clock, Users, ShieldAlert } from 'lucide-react'
import type { Task } from '@/types'

// ─── Local interfaces ───────────────────────────────────────────────────────

interface ProjectHealthItem {
  projectId: string
  projectName: string
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  tasksBlocked: number
  openRisks: number
  highRisks: number
  daysRemaining: number | null
}

interface TeamWorkloadItem {
  userId: string
  firstName: string
  lastName: string
  utilizationPercent: number
}

interface OverviewStats {
  blockedTasks: number
  overdueTasks: number
}

export interface AttentionSectionProps {
  role: 'direzione' | 'dipendente'
  // Direzione data
  projectHealth?: ProjectHealthItem[]
  teamWorkload?: TeamWorkloadItem[]
  overview?: OverviewStats | null
  // Dipendente data
  myTasks?: Task[]
}

// ─── Types ──────────────────────────────────────────────────────────────────

type AlertSeverity = 'critical' | 'warning'

interface AlertItem {
  id: string
  severity: AlertSeverity
  icon: React.ReactNode
  title: string
  detail?: string
  count?: number
  links?: Array<{ label: string; href: string }>
  link?: { label: string; href: string }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

function daysSince(date: Date): number {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Alert card styling ──────────────────────────────────────────────────────

const severityStyles: Record<AlertSeverity, {
  border: string
  bg: string
  iconColor: string
  titleColor: string
  badgeBg: string
  badgeText: string
}> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50/50 dark:bg-red-900/10',
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    badgeBg: 'bg-red-500/10 dark:bg-red-500/20',
    badgeText: 'text-red-600 dark:text-red-400',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-600 dark:text-amber-400',
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttentionSection({
  role,
  projectHealth,
  teamWorkload,
  overview,
  myTasks,
}: AttentionSectionProps) {
  const alerts = useMemo<AlertItem[]>(() => {
    if (role === 'direzione') {
      return buildDirezioneAlerts({ projectHealth, teamWorkload, overview })
    }
    return buildDipendenteAlerts(myTasks ?? [])
  }, [role, projectHealth, teamWorkload, overview, myTasks])

  // Critical: return null when there is nothing to show
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Richiede Attenzione
        </h3>
        <span
          className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold"
          aria-label={`${alerts.length} alert`}
        >
          {alerts.length}
        </span>
      </div>

      {/* Alert cards */}
      <div className="space-y-3" role="list" aria-label="Alert sezione attenzione">
        {alerts.map((alert) => {
          const styles = severityStyles[alert.severity]
          return (
            <div
              key={alert.id}
              role="listitem"
              className={`
                rounded-lg border-l-4 px-4 py-3
                ${styles.border}
                ${styles.bg}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <span className={`flex-shrink-0 mt-0.5 ${styles.iconColor}`} aria-hidden="true">
                  {alert.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold leading-snug ${styles.titleColor}`}>
                      {alert.title}
                    </p>
                    {alert.count !== undefined && (
                      <span
                        className={`
                          flex-shrink-0 inline-flex items-center justify-center
                          min-w-[1.5rem] h-6 px-1.5
                          rounded-full text-xs font-bold
                          ${styles.badgeBg} ${styles.badgeText}
                        `}
                      >
                        {alert.count}
                      </span>
                    )}
                  </div>

                  {/* Detail text */}
                  {alert.detail && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {alert.detail}
                    </p>
                  )}

                  {/* Inline links (per-item navigation) */}
                  {alert.links && alert.links.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {alert.links.map((lnk) => (
                        <Link
                          key={lnk.href}
                          to={lnk.href}
                          className={`
                            text-xs underline underline-offset-2 transition-opacity hover:opacity-70
                            ${styles.titleColor}
                          `}
                        >
                          {lnk.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Single footer link */}
                  {alert.link && (
                    <Link
                      to={alert.link.href}
                      className={`
                        inline-flex items-center gap-1 mt-1.5
                        text-xs font-medium transition-opacity hover:opacity-70
                        ${styles.titleColor}
                      `}
                    >
                      {alert.link.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Alert builders ───────────────────────────────────────────────────────────

function buildDirezioneAlerts({
  projectHealth,
  teamWorkload,
  overview,
}: Pick<AttentionSectionProps, 'projectHealth' | 'teamWorkload' | 'overview'>): AlertItem[] {
  const alerts: AlertItem[] = []

  // 1. Critical projects
  const criticalProjects = (projectHealth ?? []).filter((p) => p.healthStatus === 'critical')
  if (criticalProjects.length > 0) {
    alerts.push({
      id: 'critical-projects',
      severity: 'critical',
      icon: <ShieldAlert className="w-4 h-4" />,
      title: `${criticalProjects.length} ${pluralize(criticalProjects.length, 'progetto critico', 'progetti critici')}`,
      detail: criticalProjects.map((p) => p.projectName).join(', '),
      count: criticalProjects.length,
      links: criticalProjects.map((p) => ({
        label: p.projectName,
        href: `/projects/${p.projectId}`,
      })),
    })
  }

  // 2. Overloaded team members (>100% utilization)
  const overloaded = (teamWorkload ?? []).filter((w) => w.utilizationPercent > 100)
  if (overloaded.length > 0) {
    alerts.push({
      id: 'overloaded-members',
      severity: 'warning',
      icon: <Users className="w-4 h-4" />,
      title: `${overloaded.length} ${pluralize(overloaded.length, 'persona sovraccaricata', 'persone sovraccaricate')}`,
      detail: overloaded
        .map((w) => `${w.firstName} ${w.lastName} (${w.utilizationPercent}%)`)
        .join(', '),
      count: overloaded.length,
    })
  }

  // 3. Underutilized team members (<30% utilization)
  const underutilized = (teamWorkload ?? []).filter((w) => w.utilizationPercent < 30)
  if (underutilized.length > 0) {
    alerts.push({
      id: 'underutilized-members',
      severity: 'warning',
      icon: <Users className="w-4 h-4" />,
      title: `${underutilized.length} ${pluralize(underutilized.length, 'persona sottoutilizzata', 'persone sottoutilizzate')}`,
      detail: underutilized
        .map((w) => `${w.firstName} ${w.lastName} (${w.utilizationPercent}%)`)
        .join(', '),
      count: underutilized.length,
    })
  }

  // 4. Blocked tasks (from overview aggregate)
  if (overview && overview.blockedTasks > 0) {
    alerts.push({
      id: 'blocked-tasks',
      severity: 'critical',
      icon: <XCircle className="w-4 h-4" />,
      title: `${overview.blockedTasks} ${pluralize(overview.blockedTasks, 'task bloccato', 'task bloccati')}`,
      count: overview.blockedTasks,
      link: { label: 'Vedi task bloccati', href: '/tasks?status=blocked' },
    })
  }

  // 5. Overdue tasks (from overview aggregate)
  if (overview && overview.overdueTasks > 0) {
    alerts.push({
      id: 'overdue-tasks',
      severity: 'critical',
      icon: <Clock className="w-4 h-4" />,
      title: `${overview.overdueTasks} ${pluralize(overview.overdueTasks, 'task scaduto', 'task scaduti')}`,
      count: overview.overdueTasks,
      link: { label: 'Vedi task scaduti', href: '/tasks?overdue=true' },
    })
  }

  return alerts
}

function buildDipendenteAlerts(myTasks: Task[]): AlertItem[] {
  const alerts: AlertItem[] = []
  const now = new Date()

  // 1. Blocked tasks
  const blocked = myTasks.filter((t) => t.status === 'blocked')
  if (blocked.length > 0) {
    alerts.push({
      id: 'my-blocked',
      severity: 'critical',
      icon: <XCircle className="w-4 h-4" />,
      title: `${blocked.length} ${pluralize(blocked.length, 'task bloccato', 'task bloccati')}`,
      count: blocked.length,
      links: blocked.map((t) => ({
        label: t.title,
        href: `/tasks/${t.id}`,
      })),
    })
  }

  // 2. Overdue tasks (past due, not done/cancelled)
  const overdue = myTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      !['done', 'cancelled'].includes(t.status)
  )
  if (overdue.length > 0) {
    const buildOverdueDetail = (): string =>
      overdue
        .map((t) => {
          const days = daysSince(new Date(t.dueDate!))
          return `${t.title} (${days}g fa)`
        })
        .join(', ')

    alerts.push({
      id: 'my-overdue',
      severity: 'critical',
      icon: <Clock className="w-4 h-4" />,
      title: `${overdue.length} ${pluralize(overdue.length, 'task scaduto', 'task scaduti')}`,
      detail: buildOverdueDetail(),
      count: overdue.length,
      links: overdue.map((t) => ({
        label: t.title,
        href: `/tasks/${t.id}`,
      })),
    })
  }

  // 3. Due today (not done/cancelled)
  const dueToday = myTasks.filter(
    (t) =>
      t.dueDate &&
      isToday(new Date(t.dueDate)) &&
      !['done', 'cancelled'].includes(t.status)
  )
  if (dueToday.length > 0) {
    alerts.push({
      id: 'my-due-today',
      severity: 'warning',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: `${dueToday.length} ${pluralize(dueToday.length, 'task in scadenza oggi', 'task in scadenza oggi')}`,
      count: dueToday.length,
      links: dueToday.map((t) => ({
        label: t.title,
        href: `/tasks/${t.id}`,
      })),
    })
  }

  return alerts
}
