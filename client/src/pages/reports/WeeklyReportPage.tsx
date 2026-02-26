/**
 * Weekly Report Page - View and generate weekly reports
 * @module pages/reports/WeeklyReportPage
 */

import { useEffect, useState, useMemo, type ElementType } from 'react'
import { Link } from 'react-router-dom'
import { useWeeklyReportStore } from '@stores/weeklyReportStore'
import { useAuthStore } from '@stores/authStore'
import { useToastStore } from '@stores/toastStore'
import {
  Loader2,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Users,
  User,
  Calendar,
  FolderTree,
  Repeat2,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  Flag,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Hourglass,
  Ban,
} from 'lucide-react'
import type { WeeklyReportData, WeeklyReport, MilestoneRow } from '@/types'
import { TaskTreeView } from '@components/reports/TaskTreeView'
import { ProjectHealthCard } from '@/components/reports/ProjectHealthCard'
import { formatDuration, formatHoursFromDecimal } from '@utils/dateFormatters'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMilestoneStatusBadge(ms: MilestoneRow) {
  if (ms.status === 'done')
    return { label: 'Completata', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  if (ms.status === 'cancelled')
    return { label: 'Annullata', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' }
  if (ms.isOverdue)
    return { label: 'Scaduta', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  if (ms.daysLeft !== null && ms.daysLeft <= 7)
    return { label: 'In scadenza', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  return { label: 'In corso', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
}

function SectionHeader({ icon: Icon, label, count }: { icon: ElementType; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
      <h2 className="text-base font-semibold text-slate-800 dark:text-white">{label}</h2>
      {count !== undefined && (
        <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-600/40">
          {count}
        </span>
      )}
    </div>
  )
}

// ─── ReportPreview ─────────────────────────────────────────────────────────────

function ReportPreview({ data, selectedUserId }: { data: WeeklyReportData; selectedUserId?: string | null }) {
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'active' | 'overdue'>('all')
  const [timeEntriesOpen, setTimeEntriesOpen] = useState(false)
  const [activityUserTab, setActivityUserTab] = useState<string | null>(null)

  // ── Filtered data (by selectedUserId) ────────────────────────────────────
  const allCompleted = selectedUserId
    ? data.tasks.completed.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.completed

  const allInProgress = selectedUserId
    ? data.tasks.inProgress.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.inProgress

  const blockedTasksFiltered = selectedUserId
    ? data.blockedTasks.filter(t => t.assigneeId === selectedUserId)
    : data.blockedTasks

  const plannedFiltered = selectedUserId
    ? (data.plannedNextWeek ?? []).filter(t => t.assigneeId === selectedUserId)
    : (data.plannedNextWeek ?? [])

  // ── Global RAG status ────────────────────────────────────────────────────
  const hasOffTrack = data.projectHealth?.some(p => p.status === 'off-track') ?? false
  const hasAtRisk = data.projectHealth?.some(p => p.status === 'at-risk') ?? false
  const hasBlockers = blockedTasksFiltered.length > 0
  const hasOverdueMilestones = (data.milestonesTable ?? []).some(m => m.isOverdue)
  const globalRag: 'green' | 'amber' | 'red' =
    hasOffTrack || hasOverdueMilestones ? 'red' : hasAtRisk || hasBlockers ? 'amber' : 'green'

  const ragConfig = {
    green: { bg: 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700', text: 'text-green-800 dark:text-green-300', badge: 'ON TRACK', icon: CheckCircle2 },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-300', badge: 'A RISCHIO', icon: AlertCircle },
    red:   { bg: 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700',     text: 'text-red-800 dark:text-red-300',     badge: 'CRITICO',   icon: ShieldAlert },
  }[globalRag]
  const RagIcon = ragConfig.icon

  // ── Executive bullets ────────────────────────────────────────────────────
  const execBullets: string[] = []
  execBullets.push(`${allCompleted.length} task completati questa settimana`)
  execBullets.push(`${formatHoursFromDecimal(data.timeTracking.totalHours)} registrate`)
  if (blockedTasksFiltered.length > 0)
    execBullets.push(`${blockedTasksFiltered.length} task bloccati richiedono attenzione`)
  const imminentMs = (data.milestonesTable ?? []).find(
    m => m.status !== 'done' && m.status !== 'cancelled' && m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 7
  )
  if (imminentMs)
    execBullets.push(`Milestone "${imminentMs.title}" scade tra ${imminentMs.daysLeft} giorni`)
  if (hasOffTrack)
    execBullets.push(`${data.projectHealth!.filter(p => p.status === 'off-track').length} progett${data.projectHealth!.filter(p => p.status === 'off-track').length === 1 ? 'o' : 'i'} in ritardo`)

  // ── Accomplished grouped by project ──────────────────────────────────────
  const accomplishedByProject = useMemo(() => {
    // Use ProjectHealthData.completedThisWeek when available (more precise)
    const map = new Map<string, { projectName: string; tasks: { id: string; title: string; assigneeName: string | null }[] }>()
    if (data.projectHealth) {
      for (const ph of data.projectHealth) {
        if (ph.completedThisWeek && ph.completedThisWeek.length > 0) {
          const filtered = selectedUserId
            ? ph.completedThisWeek.filter(t => {
                const allComp = allCompleted.find(c => c.id === t.id)
                return allComp !== undefined
              })
            : ph.completedThisWeek
          if (filtered.length > 0) {
            map.set(ph.projectId, { projectName: ph.projectName, tasks: filtered })
          }
        }
      }
    }
    // Fallback: use tasks.completed grouped by projectName
    if (map.size === 0 && allCompleted.length > 0) {
      for (const t of allCompleted) {
        const key = t.projectName ?? 'Nessun progetto'
        const entry = map.get(key) ?? { projectName: key, tasks: [] }
        entry.tasks.push({ id: t.id, title: t.title, assigneeName: t.assigneeName ?? null })
        map.set(key, entry)
      }
    }
    return Array.from(map.values())
  }, [data.projectHealth, allCompleted, selectedUserId])

  // ── Planned grouped by project ───────────────────────────────────────────
  const plannedByProject = useMemo(() => {
    const map = new Map<string, { projectName: string; tasks: typeof plannedFiltered }>()
    for (const t of plannedFiltered) {
      const key = t.projectId || t.projectName || 'Altro'
      const entry = map.get(key) ?? { projectName: t.projectName ?? 'Nessun progetto', tasks: [] }
      entry.tasks.push(t)
      map.set(key, entry)
    }
    return Array.from(map.values())
  }, [plannedFiltered])

  // ── Milestones filtered ───────────────────────────────────────────────────
  const milestones = data.milestonesTable ?? []
  const filteredMilestones = milestones.filter(ms => {
    if (milestoneFilter === 'active') return ms.status !== 'done' && ms.status !== 'cancelled'
    if (milestoneFilter === 'overdue') return ms.isOverdue
    return true
  })

  // ── Blocker analysis items ────────────────────────────────────────────────
  const blockerItems = data.blockerAnalysis?.items ?? []
  const filteredBlockers = selectedUserId
    ? blockerItems.filter(b => b.assigneeId === selectedUserId)
    : blockerItems

  // ── Time entries grouped (for detail section) ─────────────────────────────
  const entryUsers = useMemo(() => {
    const entries = data.timeTracking.entries ?? []
    const userMap = new Map<string, string>()
    entries.forEach(e => userMap.set(e.userId, e.userName))
    return Array.from(userMap, ([userId, userName]) => ({ userId, userName }))
      .sort((a, b) => a.userName.localeCompare(b.userName))
  }, [data.timeTracking.entries])

  const groupedByProject = useMemo(() => {
    let entries = data.timeTracking.entries ?? []
    if (selectedUserId) entries = entries.filter(e => e.userId === selectedUserId)
    if (activityUserTab) entries = entries.filter(e => e.userId === activityUserTab)

    const projectMap = new Map<string, {
      projectId: string; projectName: string
      tasks: Map<string, { taskId: string; taskTitle: string; isRecurring: boolean; entries: Array<{ id: string; description: string | null; userName: string; duration: number | null }> }>
    }>()
    entries.forEach(entry => {
      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, { projectId: entry.projectId, projectName: entry.projectName, tasks: new Map() })
      }
      const proj = projectMap.get(entry.projectId)!
      if (!proj.tasks.has(entry.taskId)) {
        proj.tasks.set(entry.taskId, { taskId: entry.taskId, taskTitle: entry.taskTitle, isRecurring: entry.isRecurring, entries: [] })
      }
      proj.tasks.get(entry.taskId)!.entries.push({ id: entry.id, description: entry.description, userName: entry.userName, duration: entry.duration })
    })
    return Array.from(projectMap.values()).map(p => ({ ...p, tasks: Array.from(p.tasks.values()) }))
  }, [data.timeTracking.entries, selectedUserId, activityUserTab])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── SEZIONE 1: Sintesi Esecutiva ────────────────────────────────────── */}
      <section aria-label="Sintesi esecutiva">
        <div className={`rounded-xl border p-4 ${ragConfig.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <RagIcon className={`w-6 h-6 flex-shrink-0 ${ragConfig.text}`} />
            <div>
              <span className={`text-xs font-bold uppercase tracking-widest ${ragConfig.text}`}>{ragConfig.badge}</span>
              <p className={`text-sm font-medium ${ragConfig.text}`}>
                Stato generale della settimana
              </p>
            </div>
          </div>
          <ul className="space-y-1 ml-9">
            {execBullets.map((b, i) => (
              <li key={i} className={`text-sm flex items-start gap-1.5 ${ragConfig.text}`}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── SEZIONE 2: Dashboard Progetti ────────────────────────────────────── */}
      {data.projectHealth && data.projectHealth.length > 0 && (
        <section aria-label="Dashboard progetti" className="card p-5">
          <SectionHeader icon={Activity} label="Dashboard Progetti" count={data.projectHealth.length} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase">Progetto</th>
                  <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase">Avanzamento</th>
                  <th className="text-center py-2 pr-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase">Schedule</th>
                  <th className="text-center py-2 pr-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase hidden md:table-cell">Task</th>
                  <th className="text-center py-2 pr-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase hidden md:table-cell">Bloccati</th>
                  <th className="text-right py-2 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase hidden md:table-cell">Ore sett.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.projectHealth.map(p => {
                  const ragBadge = p.status === 'on-track'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : p.status === 'at-risk'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  const ragLabel = p.status === 'on-track' ? 'On Track' : p.status === 'at-risk' ? 'A Rischio' : 'In Ritardo'
                  return (
                    <tr key={p.projectId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <Link to={`/projects/${p.projectId}`} className="font-medium text-slate-900 dark:text-white hover:text-cyan-500 transition-colors">
                          {p.projectName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${p.status === 'on-track' ? 'bg-green-500' : p.status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${p.completionPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">{p.completionPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ragBadge}`}>
                          {ragLabel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center text-xs text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        <span className="text-green-600 dark:text-green-400 font-medium">{p.tasksCompleted}</span>
                        <span className="text-slate-400">/{p.tasksTotal}</span>
                      </td>
                      <td className="py-3 pr-4 text-center hidden md:table-cell">
                        {p.tasksBlocked > 0
                          ? <span className="text-red-600 dark:text-red-400 font-semibold text-xs">{p.tasksBlocked}</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="py-3 text-right text-xs text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {formatHoursFromDecimal(p.actualHours)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Cards for mobile — already handled by ProjectHealthCard */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.projectHealth.map(p => (
              <ProjectHealthCard
                key={p.projectId}
                projectId={p.projectId}
                name={p.projectName}
                code={p.projectCode}
                status={p.status}
                completion={p.completionPercent}
                tasks={{ total: p.tasksTotal, completed: p.tasksCompleted, blocked: p.tasksBlocked, inProgress: p.tasksInProgress }}
                hours={p.actualHours}
                nearestMilestone={p.nearestMilestone}
                completedThisWeek={p.completedThisWeek}
                inProgressTasks={p.inProgressTasks}
                blockedTasksList={p.blockedTasksList}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SEZIONE 3: Fatto questa settimana ───────────────────────────────── */}
      <section aria-label="Fatto questa settimana" className="card p-5">
        <SectionHeader icon={CheckCircle2} label="Fatto questa settimana" count={allCompleted.length} />
        {accomplishedByProject.length > 0 ? (
          <div className="space-y-4">
            {accomplishedByProject.map(({ projectName, tasks }) => (
              <div key={projectName}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderTree className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{projectName}</span>
                  <span className="ml-1 text-xs text-slate-400">({tasks.length})</span>
                </div>
                <ul className="space-y-1.5 ml-5">
                  {tasks.map(t => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <Link to={`/tasks/${t.id}`} className="text-slate-800 dark:text-slate-200 hover:text-cyan-500 transition-colors">
                          {t.title}
                        </Link>
                        {t.assigneeName && (
                          <span className="text-xs text-slate-400 ml-1.5">— {t.assigneeName}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">Nessuna attività completata questa settimana</p>
        )}
      </section>

      {/* ── SEZIONE 4: Da fare la prossima settimana ────────────────────────── */}
      <section aria-label="Pianificazione prossima settimana" className="card p-5">
        <SectionHeader icon={Hourglass} label="Da fare la prossima settimana" count={plannedFiltered.length} />
        {plannedByProject.length > 0 ? (
          <div className="space-y-4">
            {plannedByProject.map(({ projectName, tasks }) => (
              <div key={projectName}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderTree className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{projectName}</span>
                </div>
                <ul className="space-y-1.5 ml-5">
                  {tasks.map(t => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/tasks/${t.id}`} className="text-slate-800 dark:text-slate-200 hover:text-cyan-500 transition-colors">
                          {t.title}
                        </Link>
                        {t.assigneeName && <span className="text-xs text-slate-400 ml-1.5">— {t.assigneeName}</span>}
                        {t.dueDate && (
                          <span className={`ml-1.5 text-xs ${t.isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            · {formatDate(t.dueDate)}{t.isOverdue ? ' (scaduta)' : ''}
                          </span>
                        )}
                      </div>
                      {t.isOverdue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
                          SCADUTO
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">
            Nessun task con scadenza nella prossima settimana
          </p>
        )}
      </section>

      {/* ── SEZIONE 5: Milestone e Deliverable ──────────────────────────────── */}
      <section aria-label="Milestone e deliverable" className="card p-5">
        <SectionHeader icon={Flag} label="Milestone e Deliverable" count={milestones.length} />

        {/* Filter tabs */}
        {milestones.length > 0 && (
          <div className="flex gap-1 mb-4">
            {(['all', 'active', 'overdue'] as const).map(f => (
              <button
                key={f}
                onClick={() => setMilestoneFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  milestoneFilter === f
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'Tutte' : f === 'active' ? 'In corso' : 'In ritardo'}
              </button>
            ))}
          </div>
        )}

        {filteredMilestones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Milestone</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Progetto</th>
                  <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Scadenza</th>
                  <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Stato</th>
                  <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Delta</th>
                  <th className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Avanz.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMilestones.map(ms => {
                  const badge = getMilestoneStatusBadge(ms)
                  const dateColor = ms.isOverdue
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : ms.daysLeft !== null && ms.daysLeft <= 7
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-400'
                  const delta = ms.daysLeft !== null
                    ? ms.daysLeft < 0
                      ? <span className="text-red-500 text-xs font-medium">-{Math.abs(ms.daysLeft)}gg</span>
                      : ms.daysLeft === 0
                      ? <span className="text-amber-500 text-xs font-medium">oggi</span>
                      : <span className="text-slate-500 text-xs">+{ms.daysLeft}gg</span>
                    : <span className="text-slate-400 text-xs">—</span>
                  return (
                    <tr key={ms.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 pr-3">
                        <Link to={`/tasks/${ms.id}`} className="font-medium text-slate-900 dark:text-white hover:text-cyan-500 transition-colors text-sm">
                          {ms.title}
                        </Link>
                        <div className="text-xs text-slate-400">{ms.code}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {ms.projectName}
                      </td>
                      <td className={`py-2.5 pr-3 text-center text-xs ${dateColor}`}>
                        {ms.baselineDate ? formatDate(ms.baselineDate) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center hidden md:table-cell">{delta}</td>
                      <td className="py-2.5 text-center hidden md:table-cell">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${ms.completionPercent}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{ms.completionPercent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">Nessuna milestone{milestoneFilter !== 'all' ? ' con questo filtro' : ' nei progetti attivi'}</p>
        )}
      </section>

      {/* ── SEZIONE 6: Rischi e Blocchi ──────────────────────────────────────── */}
      <section aria-label="Rischi e blocchi" className="card p-5">
        <SectionHeader icon={ShieldAlert} label="Rischi e Blocchi" />

        {filteredBlockers.length === 0 && (!(data.risks) || data.risks.length === 0) ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">Nessun blocco o rischio attivo — settimana verde!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Blocchi attivi */}
            {filteredBlockers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" />
                  Task bloccati ({filteredBlockers.length})
                  {data.blockerAnalysis && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      data.blockerAnalysis.riskScore === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      data.blockerAnalysis.riskScore === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      Rischio {data.blockerAnalysis.riskScore}
                    </span>
                  )}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Task</th>
                        <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Progetto</th>
                        <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Bloccato da</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredBlockers.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 pr-3">
                            <Link to={`/tasks/${b.id}`} className="font-medium text-slate-900 dark:text-white hover:text-cyan-500 text-sm">
                              {b.title}
                            </Link>
                            {b.assigneeName && <div className="text-xs text-slate-400">{b.assigneeName}</div>}
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {b.projectName ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-center">
                            <span className={`text-xs font-semibold ${b.daysBlocked > 5 ? 'text-red-600 dark:text-red-400' : b.daysBlocked > 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {b.daysBlocked}gg
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-[200px] truncate">
                            {b.blockedReason ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.blockerAnalysis && data.blockerAnalysis.resolvedThisWeek > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {data.blockerAnalysis.resolvedThisWeek} blocchi risolti questa settimana
                  </p>
                )}
              </div>
            )}

            {/* Rischi aperti */}
            {data.risks && data.risks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rischi aperti ({data.risks.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Rischio</th>
                        <th className="text-left py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Progetto</th>
                        <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Prob.</th>
                        <th className="text-center py-2 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Impatto</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden lg:table-cell">Mitigazione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.risks.map(r => {
                        const probCls = r.probability === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : r.probability === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        const impCls = r.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : r.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 pr-3">
                              <span className="font-medium text-slate-900 dark:text-white">{r.title}</span>
                              <div className="text-xs text-slate-400">{r.code}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">{r.projectName}</td>
                            <td className="py-2.5 pr-3 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${probCls}`}>{r.probability}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${impCls}`}>{r.impact}</span>
                            </td>
                            <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[200px] truncate">
                              {r.mitigationPlan ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── SEZIONE 7: Metriche Operative ────────────────────────────────────── */}
      <section aria-label="Metriche operative" className="card p-5">
        <SectionHeader icon={TrendingUp} label="Metriche Operative" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ore totali', value: formatHoursFromDecimal(data.timeTracking.totalHours), icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Giorni lavorati', value: data.productivity?.daysWorked ?? '—', icon: Calendar, color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Media ore/giorno', value: data.productivity ? formatHoursFromDecimal(data.productivity.avgHoursPerDay) : '—', icon: Clock, color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Task completati', value: allCompleted.length, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
            { label: 'Task in corso', value: allInProgress.length, icon: Hourglass, color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Bloccati', value: blockedTasksFiltered.length, icon: Ban, color: blockedTasksFiltered.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500' },
            { label: 'Commenti', value: data.comments.total, icon: Users, color: 'text-slate-600 dark:text-slate-400' },
            { label: 'Consegne puntuali', value: data.productivity ? data.productivity.onTimeDeliveryRate + '%' : '—', icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-3">
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
              <div>
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trend vs previous week */}
        {data.previousWeek && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              {data.timeTracking.totalHours >= data.previousWeek.totalHours
                ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              Ore vs sett. scorsa: {formatHoursFromDecimal(data.previousWeek.totalHours)}
            </span>
            <span className="flex items-center gap-1">
              {allCompleted.length >= data.previousWeek.completedTasksCount
                ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              Task completati vs sett. scorsa: {data.previousWeek.completedTasksCount}
            </span>
          </div>
        )}
      </section>

      {/* ── SEZIONE 8: Distribuzione Ore ──────────────────────────────────────── */}
      {(data.timeTracking.byDay.length > 0 || data.timeTracking.byProject.length > 0) && (
        <section aria-label="Distribuzione ore" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart giornaliero */}
          {data.timeTracking.byDay.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Ore per giorno
              </h3>
              <div className="flex items-end gap-1.5 h-32">
                {data.timeTracking.byDay.map(day => {
                  const maxMin = Math.max(...data.timeTracking.byDay.map(d => d.totalMinutes), 1)
                  const pct = (day.totalMinutes / maxMin) * 100
                  const hoursLabel = formatDuration(day.totalMinutes)
                  const isWeekend = [0, 6].includes(new Date(day.date).getDay())
                  return (
                    <div key={day.date} title={`${formatDate(day.date)}: ${hoursLabel}`}
                      className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{hoursLabel}</span>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t h-24 flex flex-col justify-end overflow-hidden">
                        <div
                          className={`w-full rounded-t transition-all ${isWeekend ? 'bg-amber-400' : 'bg-green-500'}`}
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">{formatDate(day.date)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Per progetto */}
          {data.timeTracking.byProject.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-slate-400" />
                Ore per progetto
              </h3>
              <div className="space-y-3">
                {data.timeTracking.byProject.map((p, i) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500']
                  const totalMin = data.timeTracking.byProject.reduce((s, x) => s + x.totalMinutes, 0)
                  const pct = totalMin > 0 ? (p.totalMinutes / totalMin) * 100 : 0
                  return (
                    <div key={p.projectId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{p.projectName}</span>
                        <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{formatDuration(p.totalMinutes)} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Team mode: ore per utente */}
      {data.timeTracking.byUser && data.timeTracking.byUser.length > 0 && (
        <section aria-label="Performance team" className="card p-5">
          <SectionHeader icon={Users} label="Performance per Dipendente" />
          <div className="space-y-3">
            {[...data.timeTracking.byUser].sort((a, b) => b.totalMinutes - a.totalMinutes).map(u => {
              const totalMin = data.timeTracking.byUser!.reduce((s, x) => s + x.totalMinutes, 0)
              const pct = totalMin > 0 ? (u.totalMinutes / totalMin) * 100 : 0
              return (
                <div key={u.userId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{u.userName}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatDuration(u.totalMinutes)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── SEZIONE 9: Dettaglio registrazioni (collassabile) ─────────────────── */}
      <section aria-label="Dettaglio registrazioni ore">
        <button
          onClick={() => setTimeEntriesOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Dettaglio registrazioni ore
          </span>
          {timeEntriesOpen
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {timeEntriesOpen && (
          <div className="mt-2 card p-5">
            {/* User filter tabs */}
            {entryUsers.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActivityUserTab(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activityUserTab === null ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Tutti
                </button>
                {entryUsers.map(u => (
                  <button
                    key={u.userId}
                    onClick={() => setActivityUserTab(u.userId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${activityUserTab === u.userId ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <User className="w-3 h-3" />
                    {u.userName}
                  </button>
                ))}
              </div>
            )}

            {groupedByProject.length > 0 ? (
              <div className="space-y-4">
                {groupedByProject.map(project => (
                  <div key={project.projectId}>
                    <div className="flex items-center gap-2 mb-2">
                      <FolderTree className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{project.projectName}</span>
                    </div>
                    <div className="ml-5 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                      {project.tasks.map(task => (
                        <div key={task.taskId}>
                          <Link to={`/tasks/${task.taskId}`} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-cyan-500 mb-1">
                            {task.isRecurring
                              ? <Repeat2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />}
                            <span>{task.taskTitle}</span>
                            {task.isRecurring && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 font-medium">Ricorrente</span>
                            )}
                          </Link>
                          <div className="ml-5 space-y-0.5">
                            {task.entries.map(entry => (
                              <div key={entry.id} className="flex items-start gap-2 py-0.5 text-xs">
                                <Clock className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                <span className="flex-1 text-slate-600 dark:text-slate-400">
                                  {entry.description ?? <span className="italic text-slate-400">Nessuna nota</span>}
                                </span>
                                <span className="text-slate-500 flex-shrink-0">{entry.duration ? formatDuration(entry.duration) : '—'}</span>
                                <span className="text-cyan-500 font-medium hidden sm:inline flex-shrink-0">{entry.userName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Nessuna registrazione di tempo questa settimana</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// Report History Component
function ReportHistory({
  reports,
  pagination,
  onPageChange,
  onSelect,
}: {
  reports: WeeklyReport[]
  pagination: { page: number; pages: number } | null
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
}) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nessun report generato</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="card p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          onClick={() => onSelect(report.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{report.code}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Settimana {report.weekNumber}/{report.year}
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                report.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {report.status === 'completed' ? 'Completato' : report.status}
              </span>
              {report.generatedAt && (
                <p className="text-xs text-slate-400 mt-1">
                  Generato il {new Date(report.generatedAt).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                page === pagination.page
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeeklyReportPage() {
  const {
    currentWeekPreview,
    currentWeekInfo,
    reports,
    teamReports,
    selectedReport,
    isLoading,
    isGenerating,
    isLoadingPreview,
    error,
    pagination,
    teamPagination,
    fetchCurrentWeekInfo,
    fetchWeeklyPreview,
    fetchMyReports,
    fetchTeamReports,
    fetchReportById,
    generateReport,
    clearSelectedReport,
    clearError,
  } = useWeeklyReportStore()

  const { user } = useAuthStore()
  const { addToast } = useToastStore()
  const isDirezione = user?.role === 'direzione'
  const [activeTab, setActiveTab] = useState<'preview' | 'projectTree' | 'myReports' | 'teamReports'>('preview')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  useEffect(() => {
    fetchCurrentWeekInfo()
    fetchWeeklyPreview(isDirezione)
    fetchMyReports()
    fetchTeamReports()
  }, [fetchCurrentWeekInfo, fetchWeeklyPreview, fetchMyReports, fetchTeamReports, isDirezione])

  const handleGenerate = async () => {
    try {
      const report = await generateReport()
      addToast({
        type: 'success',
        title: 'Report Generato',
        message: `Report ${report.code} generato con successo!`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore nella generazione del report',
      })
    }
  }

  const handleExportPDF = async () => {
    if (isExportingPDF) return // Prevent double-click
    
    try {
      if (!currentWeekPreview) {
        addToast({
          type: 'error',
          title: 'Errore',
          message: 'Nessun dato disponibile per l\'export',
        })
        return
      }
      
      setIsExportingPDF(true)
      addToast({
        type: 'info',
        title: 'Generazione PDF',
        message: 'Generazione del PDF in corso...',
      })
      
      // Lazy load PDF module (code splitting)
      const { exportWeeklyReportReactPDF } = await import('@/utils/exportPDFReact')
      const result = await exportWeeklyReportReactPDF(currentWeekPreview, selectedUserId)
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'PDF Esportato',
          message: `Report esportato con successo: ${result.filename}`,
        })
      } else {
        addToast({
          type: 'error',
          title: 'Errore',
          message: result.error || 'Errore nell\'esportazione del PDF',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore inaspettato durante l\'esportazione',
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExportSelectedReportPDF = async () => {
    if (isExportingPDF) return // Prevent double-click
    
    try {
      if (!selectedReport?.reportData) {
        addToast({
          type: 'error',
          title: 'Errore',
          message: 'Nessun dato disponibile per l\'export',
        })
        return
      }
      
      setIsExportingPDF(true)
      addToast({
        type: 'info',
        title: 'Generazione PDF',
        message: 'Generazione del PDF in corso...',
      })
      
      // Lazy load PDF module (code splitting)
      const { exportWeeklyReportReactPDF } = await import('@/utils/exportPDFReact')
      const result = await exportWeeklyReportReactPDF(selectedReport.reportData)
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'PDF Esportato',
          message: `Report esportato con successo: ${result.filename}`,
        })
      } else {
        addToast({
          type: 'error',
          title: 'Errore',
          message: result.error || 'Errore nell\'esportazione del PDF',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore inaspettato durante l\'esportazione',
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleSelectReport = (id: string) => {
    fetchReportById(id)
  }

  // Show selected report detail
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              onClick={clearSelectedReport}
              className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 mb-2"
            >
              ← Torna alla lista
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {selectedReport.code}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Settimana {selectedReport.weekNumber}/{selectedReport.year}
              {selectedReport.user && ` - ${selectedReport.user.firstName} ${selectedReport.user.lastName}`}
            </p>
          </div>
          <button
            onClick={handleExportSelectedReportPDF}
            disabled={isExportingPDF}
            className="btn-secondary flex items-center gap-2 self-start disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Esporta PDF
              </>
            )}
          </button>
        </div>

        {selectedReport.reportData && (
          <ReportPreview data={selectedReport.reportData} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Report Settimanale</h1>
          {currentWeekInfo && (
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Settimana {currentWeekInfo.weekNumber}/{currentWeekInfo.year} ({formatDate(currentWeekInfo.weekStartDate)} - {formatDate(currentWeekInfo.weekEndDate)})
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchWeeklyPreview(isDirezione)}
            disabled={isLoadingPreview}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!currentWeekPreview || isExportingPDF}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Generazione...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Esporta PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Genera Report</span>
            <span className="sm:hidden">Genera</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-500 underline mt-1">
            Chiudi
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Preview Settimana
        </button>
        <button
          onClick={() => setActiveTab('projectTree')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'projectTree'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Vista Progetti
        </button>
        <button
          onClick={() => setActiveTab('myReports')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'myReports'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          I Miei Report
        </button>
        <button
          onClick={() => setActiveTab('teamReports')}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'teamReports'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Report Team
        </button>
      </div>

      {/* Content */}
      {activeTab === 'preview' && (
        isLoadingPreview && !currentWeekPreview ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : currentWeekPreview ? (
          <div className="space-y-4">
            {/* User Filter (Team Mode Only) */}
            {isDirezione && currentWeekPreview.timeTracking.byUser && currentWeekPreview.timeTracking.byUser.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Filtra per Utente
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedUserId === null
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Tutti gli utenti
                  </button>
                  {currentWeekPreview.timeTracking.byUser.map((u) => (
                    <button
                      key={u.userId}
                      onClick={() => setSelectedUserId(u.userId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedUserId === u.userId
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>{u.userName}</span>
                        <span className="text-xs opacity-75">({formatDuration(u.totalMinutes)})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ReportPreview data={currentWeekPreview} selectedUserId={selectedUserId} />
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>Nessun dato disponibile per questa settimana</p>
          </div>
        )
      )}

      {activeTab === 'projectTree' && (
        <div className="space-y-4">
          {/* User Filter (Team Mode Only) */}
          {isDirezione && currentWeekPreview?.timeTracking.byUser && currentWeekPreview.timeTracking.byUser.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Filtra per Utente
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedUserId === null
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Tutti gli utenti
                </button>
                {currentWeekPreview.timeTracking.byUser.map((u) => (
                  <button
                    key={u.userId}
                    onClick={() => setSelectedUserId(u.userId)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedUserId === u.userId
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{u.userName}</span>
                      <span className="text-xs opacity-75">({formatDuration(u.totalMinutes)})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <TaskTreeView myTasksOnly={!isDirezione} filterUserId={selectedUserId || undefined} />
        </div>
      )}

      {activeTab === 'myReports' && (
        isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <ReportHistory
            reports={reports}
            pagination={pagination}
            onPageChange={fetchMyReports}
            onSelect={handleSelectReport}
          />
        )
      )}

      {activeTab === 'teamReports' && (
        isLoading && teamReports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <ReportHistory
            reports={teamReports}
            pagination={teamPagination}
            onPageChange={fetchTeamReports}
            onSelect={handleSelectReport}
          />
        )
      )}
    </div>
  )
}
