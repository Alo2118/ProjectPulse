/**
 * Stats Service - Shared task statistics computation
 *
 * Single source of truth for task counts, overdue detection, and team
 * workload.  All other services must import from here instead of
 * computing their own stats, so a bug-fix (e.g. "blocked count must
 * exclude deleted tasks") only needs to happen in one place.
 *
 * @module services/statsService
 */

import { prisma } from '../models/prismaClient.js'
import { RISK_CRITICAL_THRESHOLD, RISK_HIGH_THRESHOLD } from '../constants/enums.js'
import type { KpiCard } from '../types/index.js'

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface TaskStatsOptions {
  /** Restrict to a single project */
  projectId?: string
  /** Restrict to a single assignee */
  assigneeId?: string
  /** Earliest task creation / update date boundary (inclusive) */
  dateFrom?: Date
  /** Latest task creation / update date boundary (inclusive) */
  dateTo?: Date
  /**
   * When true, soft-deleted tasks are included.
   * Defaults to false (always exclude deleted tasks).
   */
  includeDeleted?: boolean
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  review: number
  blocked: number
  done: number
  cancelled: number
  /** Tasks whose dueDate is in the past and status is not done/cancelled */
  overdue: number
}

export interface TeamMemberStats {
  userId: string
  firstName: string
  lastName: string
  /** Active (non-done, non-cancelled) tasks currently assigned */
  taskCount: number
  /** Tasks with status === 'done' assigned to this user */
  completedCount: number
  /** Total minutes logged via TimeEntry */
  totalMinutes: number
}

/**
 * Per-project task counts.
 * Returned as a Map keyed by projectId so callers can look up any project
 * in O(1) without an extra query.
 */
export type ProjectTaskCountsMap = Map<
  string,
  { total: number; completed: number; blocked: number; inProgress: number }
>

// ============================================================
// SHARED HELPERS
// ============================================================

/**
 * Builds the base Prisma `where` clause shared by all stat functions.
 * Ensures soft-deleted tasks are excluded unless explicitly requested.
 */
function buildBaseWhere(options: TaskStatsOptions) {
  const { projectId, assigneeId, includeDeleted = false } = options

  const where: Record<string, unknown> = {}

  if (!includeDeleted) {
    where.isDeleted = false
  }

  if (projectId) {
    where.projectId = projectId
  }

  if (assigneeId) {
    where.assigneeId = assigneeId
  }

  return where
}

// ============================================================
// EXPORTED FUNCTIONS
// ============================================================

/**
 * Returns task counts grouped by status plus an `overdue` counter.
 *
 * A task is considered overdue when:
 *   - its `dueDate` is in the past (< now)
 *   - its status is NOT 'done' or 'cancelled'
 *
 * @example
 * const stats = await getTaskStats({ projectId: 'proj-1' })
 * console.log(stats.blocked) // 2
 */
export async function getTaskStats(options: TaskStatsOptions = {}): Promise<TaskStats> {
  const baseWhere = buildBaseWhere(options)
  const now = new Date()

  const [grouped, overdue] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { notIn: ['done', 'cancelled'] },
        dueDate: { lt: now },
      },
    }),
  ])

  const counts: Record<string, number> = {}
  for (const row of grouped) {
    counts[row.status] = row._count.id
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return {
    total,
    todo: counts['todo'] ?? 0,
    inProgress: counts['in_progress'] ?? 0,
    review: counts['review'] ?? 0,
    blocked: counts['blocked'] ?? 0,
    done: counts['done'] ?? 0,
    cancelled: counts['cancelled'] ?? 0,
    overdue,
  }
}

/**
 * Returns active-user workload: task counts and total minutes logged.
 *
 * @param options  Only `projectId` and `includeDeleted` are used here;
 *                 `assigneeId` filters tasks per member.
 */
export async function getTeamWorkload(
  options: TaskStatsOptions = {}
): Promise<TeamMemberStats[]> {
  const { projectId, includeDeleted = false } = options

  // Fetch all active users
  const users = await prisma.user.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true, firstName: true, lastName: true },
  })

  if (users.length === 0) return []

  const userIds = users.map((u) => u.id)

  const taskWhere: Record<string, unknown> = {
    assigneeId: { in: userIds },
    isDeleted: includeDeleted ? undefined : false,
  }
  if (projectId) taskWhere.projectId = projectId

  const [activeCounts, completedCounts, timeEntries] = await Promise.all([
    // Non-terminal tasks per user
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...taskWhere, status: { notIn: ['done', 'cancelled'] } },
      _count: { id: true },
    }),
    // Completed tasks per user
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...taskWhere, status: 'done' },
      _count: { id: true },
    }),
    // Total minutes logged per user (no project filter — time entries are
    // linked via task, and this reflects overall utilisation)
    prisma.timeEntry.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, isDeleted: false },
      _sum: { duration: true },
    }),
  ])

  const activeMap = new Map(activeCounts.map((r) => [r.assigneeId!, r._count.id]))
  const completedMap = new Map(completedCounts.map((r) => [r.assigneeId!, r._count.id]))
  const minutesMap = new Map(timeEntries.map((r) => [r.userId, r._sum?.duration ?? 0]))

  return users.map((u) => ({
    userId: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    taskCount: activeMap.get(u.id) ?? 0,
    completedCount: completedMap.get(u.id) ?? 0,
    totalMinutes: minutesMap.get(u.id) ?? 0,
  }))
}

/**
 * Returns the count of overdue tasks matching the given options.
 *
 * Convenience wrapper around `getTaskStats` for callers that only need the
 * overdue number.
 */
export async function getOverdueTasks(options: TaskStatsOptions = {}): Promise<number> {
  const baseWhere = buildBaseWhere(options)
  const now = new Date()

  return prisma.task.count({
    where: {
      ...baseWhere,
      status: { notIn: ['done', 'cancelled'] },
      dueDate: { lt: now },
    },
  })
}

// ============================================================
// IN-MEMORY HELPERS (for data already fetched from DB)
// ============================================================

/**
 * Computes task counts from an already-loaded task array.
 *
 * Use this when the caller has already fetched the task records for other
 * purposes (e.g. iterating over detail fields) and needs counts without an
 * additional database round-trip.
 *
 * Milestones are excluded from all counts by convention.
 */
export function countTasksFromArray(
  tasks: ReadonlyArray<{ taskType: string; status: string }>
): { total: number; completed: number; blocked: number; inProgress: number } {
  const nonMilestones = tasks.filter((t) => t.taskType !== 'milestone')
  return {
    total: nonMilestones.length,
    completed: nonMilestones.filter((t) => t.status === 'done').length,
    blocked: nonMilestones.filter((t) => t.status === 'blocked').length,
    inProgress: nonMilestones.filter((t) => t.status === 'in_progress').length,
  }
}

/**
 * Returns per-project task counts for a list of project IDs in a single
 * batched query, keyed by projectId.
 *
 * Prefer this over calling `getTaskStats` once per project inside a loop.
 *
 * @param projectIds   IDs to aggregate — returns an empty map for `[]`.
 * @param includeDeleted  Defaults to false.
 */
export async function getProjectTaskCountsMap(
  projectIds: string[],
  includeDeleted = false
): Promise<ProjectTaskCountsMap> {
  if (projectIds.length === 0) return new Map()

  const rows = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: {
      projectId: { in: projectIds },
      isDeleted: includeDeleted ? undefined : false,
    },
    _count: { id: true },
  })

  const result: ProjectTaskCountsMap = new Map()

  for (const row of rows) {
    if (!row.projectId) continue
    const current = result.get(row.projectId) ?? {
      total: 0,
      completed: 0,
      blocked: 0,
      inProgress: 0,
    }
    current.total += row._count.id
    if (row.status === 'done') current.completed += row._count.id
    if (row.status === 'blocked') current.blocked += row._count.id
    if (row.status === 'in_progress') current.inProgress += row._count.id
    result.set(row.projectId, current)
  }

  return result
}

// ============================================================
// LIST-LEVEL KPI CARDS
// ============================================================

/**
 * KPI cards for the project list page.
 */
export async function getProjectStats(userId?: string, role?: string): Promise<KpiCard[]> {
  // Suppress unused param warnings — reserved for future role-based filtering
  void userId; void role
  const where = { isDeleted: false }
  const [total, active, onHold, completed] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.count({ where: { ...where, status: 'active' } }),
    prisma.project.count({ where: { ...where, status: 'on_hold' } }),
    prisma.project.count({ where: { ...where, status: 'completed' } }),
  ])

  return [
    { label: 'Totale progetti', value: total, color: 'blue', icon: 'FolderKanban' },
    { label: 'Attivi', value: active, color: 'green', icon: 'Play' },
    { label: 'In pausa', value: onHold, color: 'amber', icon: 'Pause' },
    { label: 'Completati', value: completed, color: 'emerald', icon: 'CheckCircle' },
  ]
}

/**
 * KPI cards for the task list page.
 * Named getTaskKpis to avoid collision with existing getTaskStats().
 */
export async function getTaskKpis(userId?: string, role?: string): Promise<KpiCard[]> {
  const baseWhere: Record<string, unknown> = { isDeleted: false, taskType: { not: 'milestone' } }
  const assigneeFilter = role === 'dipendente' && userId
    ? { assigneeId: userId }
    : {}
  const where = { ...baseWhere, ...assigneeFilter }

  const [total, todo, inProgress, done, blocked] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: 'todo' } }),
    prisma.task.count({ where: { ...where, status: 'in_progress' } }),
    prisma.task.count({ where: { ...where, status: 'done' } }),
    prisma.task.count({ where: { ...where, status: 'blocked' } }),
  ])

  return [
    { label: 'Totale task', value: total, color: 'blue', icon: 'CheckSquare' },
    { label: 'Da fare', value: todo, color: 'slate', icon: 'Circle' },
    { label: 'In corso', value: inProgress, color: 'blue', icon: 'Play' },
    { label: 'Completati', value: done, color: 'green', icon: 'CheckCircle' },
    { label: 'Bloccati', value: blocked, color: 'red', icon: 'Ban' },
  ]
}

/**
 * KPI cards for the risk list page.
 */
export async function getRiskStats(userId?: string, role?: string): Promise<KpiCard[]> {
  void userId; void role
  const where = { isDeleted: false }

  const [total, open, mitigated] = await Promise.all([
    prisma.risk.count({ where }),
    prisma.risk.count({ where: { ...where, status: 'open' } }),
    prisma.risk.count({ where: { ...where, status: 'mitigated' } }),
  ])

  // Count critical/high risks by score
  const openRisks = await prisma.risk.findMany({
    where: { ...where, status: 'open' },
    select: { probability: true, impact: true },
  })
  const critical = openRisks.filter(r => Number(r.probability) * Number(r.impact) >= RISK_CRITICAL_THRESHOLD).length
  const high = openRisks.filter(r => {
    const s = Number(r.probability) * Number(r.impact)
    return s >= RISK_HIGH_THRESHOLD && s < RISK_CRITICAL_THRESHOLD
  }).length

  return [
    { label: 'Totale rischi', value: total, color: 'red', icon: 'AlertTriangle' },
    { label: 'Aperti', value: open, color: 'red', icon: 'AlertCircle' },
    { label: 'Critici', value: critical, color: 'red', icon: 'Flame' },
    { label: 'Alti', value: high, color: 'orange', icon: 'TrendingUp' },
    { label: 'Mitigati', value: mitigated, color: 'blue', icon: 'Shield' },
  ]
}

/**
 * KPI cards for the document list page.
 */
export async function getDocumentStats(userId?: string, role?: string): Promise<KpiCard[]> {
  void userId; void role
  const where = { isDeleted: false }

  const [total, draft, review, approved] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, status: 'draft' } }),
    prisma.document.count({ where: { ...where, status: 'review' } }),
    prisma.document.count({ where: { ...where, status: 'approved' } }),
  ])

  return [
    { label: 'Totale documenti', value: total, color: 'purple', icon: 'FileText' },
    { label: 'Bozze', value: draft, color: 'slate', icon: 'FilePlus' },
    { label: 'In revisione', value: review, color: 'amber', icon: 'FileSearch' },
    { label: 'Approvati', value: approved, color: 'green', icon: 'FileCheck' },
  ]
}

/**
 * KPI cards for the user management page.
 */
export async function getUserStats(): Promise<KpiCard[]> {
  const where = { isDeleted: false, isActive: true }

  const [total, admins, direzione, dipendenti] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, role: 'admin' } }),
    prisma.user.count({ where: { ...where, role: 'direzione' } }),
    prisma.user.count({ where: { ...where, role: 'dipendente' } }),
  ])

  return [
    { label: 'Totale utenti', value: total, color: 'green', icon: 'Users' },
    { label: 'Admin', value: admins, color: 'red', icon: 'ShieldCheck' },
    { label: 'Direzione', value: direzione, color: 'purple', icon: 'Crown' },
    { label: 'Dipendenti', value: dipendenti, color: 'blue', icon: 'User' },
  ]
}

// ============================================================
// DETAIL-LEVEL SUMMARY CARDS
// ============================================================

/**
 * Summary KPI cards for a single project detail page.
 */
export async function getProjectSummary(projectId: string): Promise<KpiCard[]> {
  const [tasks, milestones, timeEntries, project] = await Promise.all([
    prisma.task.findMany({
      where: { projectId, isDeleted: false, taskType: { not: 'milestone' } },
      select: { status: true, estimatedHours: true },
    }),
    prisma.task.count({
      where: { projectId, isDeleted: false, taskType: 'milestone' },
    }),
    prisma.timeEntry.findMany({
      where: { task: { projectId }, isDeleted: false },
      select: { duration: true, user: { select: { hourlyRate: true } } },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { budget: true },
    }),
  ])

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const hoursLogged = timeEntries.reduce((sum, te) => sum + (te.duration ?? 0), 0) / 60
  const hoursEstimated = tasks.reduce((sum, t) => sum + Number(t.estimatedHours ?? 0), 0)
  const budgetHoursPercent = hoursEstimated > 0
    ? Math.round((hoursLogged / hoursEstimated) * 100)
    : null

  // Money budget
  const moneyUsed = timeEntries.reduce((sum, te) => {
    const rate = te.user?.hourlyRate ? Number(te.user.hourlyRate) : 0
    return sum + ((te.duration ?? 0) / 60) * rate
  }, 0)
  const budgetTotal = project?.budget ? Number(project.budget) : null
  const budgetMoneyPercent = budgetTotal
    ? Math.round((moneyUsed / budgetTotal) * 100)
    : null

  const cards: KpiCard[] = [
    { label: 'Avanzamento', value: `${progress}%`, color: 'blue', icon: 'TrendingUp' },
    { label: 'Task', value: `${completedTasks}/${totalTasks}`, color: 'blue', icon: 'CheckSquare' },
    { label: 'Milestone', value: milestones, color: 'purple', icon: 'Flag' },
    {
      label: 'Ore registrate', value: `${hoursLogged.toFixed(1)}h`, color: 'green', icon: 'Clock',
      subtitle: hoursEstimated > 0 ? `di ${hoursEstimated}h stimate` : undefined,
    },
  ]

  if (budgetHoursPercent !== null) {
    cards.push({
      label: 'Budget ore', value: `${budgetHoursPercent}%`,
      color: budgetHoursPercent > 100 ? 'red' : 'green', icon: 'Timer',
    })
  }

  if (budgetMoneyPercent !== null) {
    cards.push({
      label: 'Budget €', value: `${budgetMoneyPercent}%`,
      color: budgetMoneyPercent > 100 ? 'red' : 'green', icon: 'Euro',
      subtitle: `€${moneyUsed.toFixed(0)} di €${budgetTotal!.toFixed(0)}`,
    })
  }

  return cards
}

/**
 * Summary KPI cards for a single task detail page.
 */
export async function getTaskSummary(taskId: string): Promise<KpiCard[]> {
  const [subtasks, timeEntries, task] = await Promise.all([
    prisma.task.findMany({
      where: { parentTaskId: taskId, isDeleted: false },
      select: { status: true },
    }),
    prisma.timeEntry.findMany({
      where: { taskId, isDeleted: false },
      select: { duration: true },
    }),
    prisma.task.findUnique({
      where: { id: taskId },
      select: { estimatedHours: true },
    }),
  ])

  const subtotalDone = subtasks.filter(s => s.status === 'done').length
  const subtasksTotal = subtasks.length
  const completion = subtasksTotal > 0
    ? Math.round((subtotalDone / subtasksTotal) * 100)
    : 0

  const hoursLogged = timeEntries.reduce((sum, te) => sum + (te.duration ?? 0), 0) / 60
  const hoursEstimated = Number(task?.estimatedHours ?? 0)
  const hoursRemaining = Math.max(0, hoursEstimated - hoursLogged)

  const cards: KpiCard[] = []

  if (subtasksTotal > 0) {
    cards.push({
      label: 'Subtask', value: `${subtotalDone}/${subtasksTotal}`, color: 'blue', icon: 'GitBranch',
      subtitle: `${completion}% completato`,
    })
  }

  cards.push({ label: 'Ore registrate', value: `${hoursLogged.toFixed(1)}h`, color: 'green', icon: 'Clock' })

  if (hoursEstimated > 0) {
    cards.push(
      { label: 'Ore stimate', value: `${hoursEstimated}h`, color: 'blue', icon: 'Timer' },
      { label: 'Ore rimanenti', value: `${hoursRemaining.toFixed(1)}h`, color: hoursRemaining > 0 ? 'amber' : 'green', icon: 'Hourglass' },
    )
  }

  return cards
}
