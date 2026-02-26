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
