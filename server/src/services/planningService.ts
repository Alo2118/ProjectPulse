/**
 * Planning Service - Business logic for the Planning Assistant feature.
 * Provides estimation metrics, team capacity, timeline suggestions, and
 * bottleneck analysis to support project planning decisions.
 * @module services/planningService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'

// ============================================================
// LOCAL INTERFACES
// ============================================================

interface EstimationMetricsOptions {
  projectId?: string
  userId?: string
  taskType?: string
}

interface UserEstimationMetric {
  userId: string
  firstName: string
  lastName: string
  avgAccuracyRatio: number
  tasksCompleted: number
  avgEstimatedHours: number
  avgActualHours: number
  overrunRate: number
}

interface TypeEstimationMetric {
  taskType: string
  avgAccuracyRatio: number
  avgDurationHours: number
  count: number
}

interface OverallEstimationMetric {
  avgAccuracyRatio: number
  totalTasksAnalyzed: number
  overrunRate: number
  avgVelocity: number
}

interface EstimationMetrics {
  byUser: UserEstimationMetric[]
  byType: TypeEstimationMetric[]
  overall: OverallEstimationMetric
}

interface TeamCapacityEntry {
  userId: string
  firstName: string
  lastName: string
  weeklyHoursTarget: number
  assignedHours: number
  loggedHours: number
  availableHours: number
  utilizationPercent: number
  overloaded: boolean
  activeTaskCount: number
}

export interface PlanTask {
  tempId: string
  title: string
  taskType: string
  estimatedHours: number
  priority?: string
  assigneeId?: string
  parentTempId?: string
  /** Predecessor links. Omitting this field is treated as an empty list (no dependencies). */
  dependencies?: {
    tempId: string
    type: string
    lagDays: number
  }[]
}

interface ScheduledTask {
  tempId: string
  startDate: Date
  endDate: Date
  isCriticalPath: boolean
}

interface SuggestTimelineResult {
  scheduledTasks: ScheduledTask[]
  totalDurationDays: number
  criticalPathLength: number
}

interface BlockedTaskInfo {
  id: string
  code: string
  title: string
  assigneeName: string | null
  blockedReason: string | null
  daysBlocked: number
}

interface OverloadedUserInfo {
  userId: string
  name: string
  assignedHours: number
  taskCount: number
}

interface AtRiskDependencyInfo {
  dependencyId: string
  predecessorId: string
  predecessorCode: string
  predecessorTitle: string
  predecessorStatus: string
  successorId: string
  successorCode: string
  successorTitle: string
  successorStartDate: Date | null
  daysUntilSuccessorStart: number | null
}

interface UnestimatedTaskInfo {
  id: string
  code: string
  title: string
  taskType: string
}

interface UnassignedTaskInfo {
  id: string
  code: string
  title: string
  priority: string
}

interface BottleneckSummary {
  totalIssues: number
  criticalCount: number
  warningCount: number
}

interface BottlenecksResult {
  blockedTasks: BlockedTaskInfo[]
  overloadedUsers: OverloadedUserInfo[]
  atRiskDependencies: AtRiskDependencyInfo[]
  unestimatedTasks: UnestimatedTaskInfo[]
  unassignedTasks: UnassignedTaskInfo[]
  summary: BottleneckSummary
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Adds the given number of workdays (Mon–Fri) to a date, skipping weekends.
 */
function addWorkdays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dow !== 0 && dow !== 6) {
      remaining--
    }
  }
  return result
}

/**
 * Converts a Prisma Decimal field (which arrives as Decimal | null) to a plain
 * JavaScript number, safely handling null / undefined.
 */
function toNumber(value: { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0
  return Number(value.toString())
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * Returns historical estimation accuracy grouped by user, task type, and overall.
 * Only considers completed tasks that have both estimatedHours > 0 and actualHours > 0.
 */
async function getEstimationMetrics(
  options: EstimationMetricsOptions = {},
): Promise<EstimationMetrics> {
  try {
    const { projectId, userId, taskType } = options

    const tasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        status: 'done',
        estimatedHours: { not: null, gt: 0 },
        actualHours: { not: null, gt: 0 },
        ...(projectId ? { projectId } : {}),
        ...(userId ? { assigneeId: userId } : {}),
        ...(taskType ? { taskType } : {}),
      },
      select: {
        id: true,
        taskType: true,
        estimatedHours: true,
        actualHours: true,
        assigneeId: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Compute velocity: tasks completed in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentlyCompleted = tasks.filter((t) => t.updatedAt >= thirtyDaysAgo)
    const avgVelocity = parseFloat((recentlyCompleted.length / 4.3).toFixed(2)) // ~4.3 weeks in 30 days

    // ---- Aggregate by user ----
    const userMap = new Map<
      string,
      {
        user: { id: string; firstName: string; lastName: string }
        estimated: number[]
        actual: number[]
      }
    >()

    for (const task of tasks) {
      if (!task.assigneeId || !task.assignee) continue
      const uid = task.assigneeId
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user: task.assignee,
          estimated: [],
          actual: [],
        })
      }
      const entry = userMap.get(uid)!
      entry.estimated.push(toNumber(task.estimatedHours))
      entry.actual.push(toNumber(task.actualHours))
    }

    const byUser: UserEstimationMetric[] = Array.from(userMap.values()).map(
      ({ user, estimated, actual }) => {
        const count = estimated.length
        const totalEstimated = estimated.reduce((s, v) => s + v, 0)
        const totalActual = actual.reduce((s, v) => s + v, 0)
        const overruns = actual.filter((a, i) => a > estimated[i]).length
        const avgAccuracyRatio =
          totalEstimated > 0
            ? parseFloat((totalActual / totalEstimated).toFixed(4))
            : 0

        return {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avgAccuracyRatio,
          tasksCompleted: count,
          avgEstimatedHours:
            count > 0 ? parseFloat((totalEstimated / count).toFixed(2)) : 0,
          avgActualHours:
            count > 0 ? parseFloat((totalActual / count).toFixed(2)) : 0,
          overrunRate:
            count > 0 ? parseFloat(((overruns / count) * 100).toFixed(1)) : 0,
        }
      },
    )

    // ---- Aggregate by task type ----
    const typeMap = new Map<
      string,
      { estimated: number[]; actual: number[] }
    >()

    for (const task of tasks) {
      const tt = task.taskType
      if (!typeMap.has(tt)) typeMap.set(tt, { estimated: [], actual: [] })
      const entry = typeMap.get(tt)!
      entry.estimated.push(toNumber(task.estimatedHours))
      entry.actual.push(toNumber(task.actualHours))
    }

    const byType: TypeEstimationMetric[] = Array.from(typeMap.entries()).map(
      ([tt, { estimated, actual }]) => {
        const count = estimated.length
        const totalEstimated = estimated.reduce((s, v) => s + v, 0)
        const totalActual = actual.reduce((s, v) => s + v, 0)
        const avgAccuracyRatio =
          totalEstimated > 0
            ? parseFloat((totalActual / totalEstimated).toFixed(4))
            : 0

        return {
          taskType: tt,
          avgAccuracyRatio,
          avgDurationHours:
            count > 0 ? parseFloat((totalActual / count).toFixed(2)) : 0,
          count,
        }
      },
    )

    // ---- Overall stats ----
    const totalTasks = tasks.length
    let totalEstimatedAll = 0
    let totalActualAll = 0
    let overrunCountAll = 0

    for (const task of tasks) {
      const est = toNumber(task.estimatedHours)
      const act = toNumber(task.actualHours)
      totalEstimatedAll += est
      totalActualAll += act
      if (act > est) overrunCountAll++
    }

    const overall: OverallEstimationMetric = {
      avgAccuracyRatio:
        totalEstimatedAll > 0
          ? parseFloat((totalActualAll / totalEstimatedAll).toFixed(4))
          : 0,
      totalTasksAnalyzed: totalTasks,
      overrunRate:
        totalTasks > 0
          ? parseFloat(((overrunCountAll / totalTasks) * 100).toFixed(1))
          : 0,
      avgVelocity,
    }

    return { byUser, byType, overall }
  } catch (error) {
    logger.error('planningService.getEstimationMetrics error', { error })
    throw error
  }
}

/**
 * Returns capacity data for every active user for a given week.
 * Sorted by utilizationPercent descending.
 */
async function getTeamCapacity(
  weekStart: Date,
  weekEnd: Date,
): Promise<TeamCapacityEntry[]> {
  try {
    const [users, timeEntries, taskStats] = await Promise.all([
      // All active, non-deleted users
      prisma.user.findMany({
        where: { isActive: true, isDeleted: false },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          weeklyHoursTarget: true,
        },
      }),

      // Time entries logged during the week (minutes → convert to hours later)
      prisma.timeEntry.groupBy({
        by: ['userId'],
        _sum: { duration: true },
        where: {
          startTime: { gte: weekStart, lt: weekEnd },
          duration: { not: null },
          isDeleted: false,
        },
      }),

      // Non-completed, non-cancelled tasks: sum of estimatedHours and count per assignee
      prisma.task.findMany({
        where: {
          isDeleted: false,
          assigneeId: { not: null },
          status: { notIn: ['done', 'cancelled'] },
        },
        select: {
          assigneeId: true,
          estimatedHours: true,
        },
      }),
    ])

    // Build logged-hours map (minutes → hours)
    const loggedMap = new Map<string, number>()
    for (const entry of timeEntries) {
      loggedMap.set(entry.userId, (entry._sum?.duration ?? 0) / 60)
    }

    // Build assigned-hours map and active task count map
    const assignedMap = new Map<string, number>()
    const taskCountMap = new Map<string, number>()
    for (const task of taskStats) {
      if (!task.assigneeId) continue
      const uid = task.assigneeId
      const hours = toNumber(task.estimatedHours)
      assignedMap.set(uid, (assignedMap.get(uid) ?? 0) + hours)
      taskCountMap.set(uid, (taskCountMap.get(uid) ?? 0) + 1)
    }

    const result: TeamCapacityEntry[] = users.map((user) => {
      const target = user.weeklyHoursTarget ?? 40
      const assignedHours = parseFloat(
        (assignedMap.get(user.id) ?? 0).toFixed(2),
      )
      const loggedHours = parseFloat(
        (loggedMap.get(user.id) ?? 0).toFixed(2),
      )
      const availableHours = parseFloat(
        Math.max(0, target - assignedHours).toFixed(2),
      )
      const utilizationPercent =
        target > 0 ? Math.round((assignedHours / target) * 100) : 0

      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        weeklyHoursTarget: target,
        assignedHours,
        loggedHours,
        availableHours,
        utilizationPercent,
        overloaded: utilizationPercent > 100,
        activeTaskCount: taskCountMap.get(user.id) ?? 0,
      }
    })

    return result.sort((a, b) => b.utilizationPercent - a.utilizationPercent)
  } catch (error) {
    logger.error('planningService.getTeamCapacity error', { error })
    throw error
  }
}

/**
 * Suggests a schedule for a set of planned tasks respecting dependencies.
 * Uses topological sort + critical-path analysis. Workdays assumed = 6h productive/day.
 *
 * @param tasks - Array of tasks with dependency information
 * @param projectStartDate - Optional explicit project start date; defaults to today (or next Monday if weekend)
 */
async function suggestTimeline(
  tasks: PlanTask[],
  projectStartDate?: Date,
): Promise<SuggestTimelineResult> {
  try {
    if (tasks.length === 0) {
      return { scheduledTasks: [], totalDurationDays: 0, criticalPathLength: 0 }
    }

    // Build lookup by tempId
    const taskById = new Map<string, PlanTask>()
    for (const t of tasks) {
      taskById.set(t.tempId, t)
    }

    // Validate that all dependency tempIds actually exist in the input list
    for (const task of tasks) {
      for (const dep of task.dependencies ?? []) {
        if (!taskById.has(dep.tempId)) {
          throw new Error(
            `Dependency tempId "${dep.tempId}" referenced by task "${task.tempId}" does not exist in the task list`,
          )
        }
      }
    }

    // ---- Topological sort (Kahn's algorithm) ----
    // adjacency: predecessor → successors
    const successorsOf = new Map<string, string[]>()
    // in-degree: how many predecessors each node still has
    const inDegree = new Map<string, number>()
    // predecessor → lagDays mapping for the successor
    const edgeLag = new Map<string, number>() // key: `${predId}→${succId}`

    for (const t of tasks) {
      if (!inDegree.has(t.tempId)) inDegree.set(t.tempId, 0)
      for (const dep of t.dependencies ?? []) {
        // dep.tempId is predecessor, t.tempId is successor
        const pred = dep.tempId
        const succ = t.tempId
        if (!successorsOf.has(pred)) successorsOf.set(pred, [])
        successorsOf.get(pred)!.push(succ)
        inDegree.set(succ, (inDegree.get(succ) ?? 0) + 1)
        edgeLag.set(`${pred}→${succ}`, dep.lagDays)
      }
    }

    // Nodes with no predecessors are the starting points
    const queue: string[] = []
    for (const t of tasks) {
      if ((inDegree.get(t.tempId) ?? 0) === 0) {
        queue.push(t.tempId)
      }
    }

    const topoOrder: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      topoOrder.push(current)
      for (const succ of successorsOf.get(current) ?? []) {
        const deg = (inDegree.get(succ) ?? 1) - 1
        inDegree.set(succ, deg)
        if (deg === 0) queue.push(succ)
      }
    }

    if (topoOrder.length !== tasks.length) {
      throw new Error(
        'Circular dependency detected among the provided tasks. Please resolve the cycle before requesting a timeline.',
      )
    }

    // ---- Schedule each task in topological order ----
    const PRODUCTIVE_HOURS_PER_DAY = 6
    // Use the caller-supplied start date when provided, otherwise default to today
    const projectStart = projectStartDate ? new Date(projectStartDate) : new Date()
    projectStart.setHours(0, 0, 0, 0)
    // Skip to next workday if the start falls on a weekend
    while (projectStart.getDay() === 0 || projectStart.getDay() === 6) {
      projectStart.setDate(projectStart.getDate() + 1)
    }

    // Earliest end date for each task (for critical path propagation)
    const earliestEnd = new Map<string, Date>()
    // Scheduled results
    const schedule = new Map<string, { startDate: Date; endDate: Date }>()

    for (const tempId of topoOrder) {
      const task = taskById.get(tempId)!
      const duration = Math.max(
        1,
        Math.ceil(task.estimatedHours / PRODUCTIVE_HOURS_PER_DAY),
      )

      // Earliest start is the maximum of all predecessors' (endDate + lagDays)
      let earliestStart = new Date(projectStart)

      for (const dep of task.dependencies ?? []) {
        const predEnd = earliestEnd.get(dep.tempId)
        if (!predEnd) continue
        const candidate = addWorkdays(predEnd, dep.lagDays)
        if (candidate > earliestStart) {
          earliestStart = new Date(candidate)
        }
      }

      // Ensure start is a workday
      while (earliestStart.getDay() === 0 || earliestStart.getDay() === 6) {
        earliestStart.setDate(earliestStart.getDate() + 1)
      }

      const endDate = addWorkdays(earliestStart, duration)
      schedule.set(tempId, { startDate: earliestStart, endDate })
      earliestEnd.set(tempId, endDate)
    }

    // ---- Critical path: longest path from start to finish ----
    // We compute the longest-path distance (in workdays) for each node using the
    // topological order we already have.
    const longestPath = new Map<string, number>()
    for (const tempId of topoOrder) {
      longestPath.set(tempId, 0)
    }

    for (const tempId of topoOrder) {
      const task = taskById.get(tempId)!
      const duration = Math.max(
        1,
        Math.ceil(task.estimatedHours / PRODUCTIVE_HOURS_PER_DAY),
      )
      const selfPath = (longestPath.get(tempId) ?? 0) + duration

      for (const succ of successorsOf.get(tempId) ?? []) {
        const lag = edgeLag.get(`${tempId}→${succ}`) ?? 0
        const candidate = selfPath + lag
        if (candidate > (longestPath.get(succ) ?? 0)) {
          longestPath.set(succ, candidate)
        }
      }
    }

    const criticalPathLength = Math.max(0, ...longestPath.values())

    // A task is on the critical path when it lies on the longest chain.
    // We determine this by back-tracking from sink nodes (no successors).
    // Simple approximation: a task is critical if (longestPath[task] + its duration)
    // equals criticalPathLength for any path passing through it. We use the known
    // property that a task t is critical iff longestPath[t] + duration[t] == criticalPathLength
    // and that value cannot be exceeded by adding any successor contribution.
    // For accuracy we compute forward distances and backward distances.

    // Forward distance already computed in longestPath (distance from project start to end of task).
    // We now need backward distances (latest finish - end of task without delaying project).
    const backwardDistance = new Map<string, number>()
    for (const tempId of [...topoOrder].reverse()) {
      const task = taskById.get(tempId)!
      const duration = Math.max(
        1,
        Math.ceil(task.estimatedHours / PRODUCTIVE_HOURS_PER_DAY),
      )
      const successorList = successorsOf.get(tempId) ?? []
      if (successorList.length === 0) {
        // Sink node: backward distance = 0
        backwardDistance.set(tempId, 0)
      } else {
        const minSuccessorBack = Math.min(
          ...successorList.map((succ) => {
            const lag = edgeLag.get(`${tempId}→${succ}`) ?? 0
            return (backwardDistance.get(succ) ?? 0) + lag
          }),
        )
        backwardDistance.set(tempId, minSuccessorBack)
      }

      // A task is critical when forward + backward == criticalPathLength
      // (total float == 0)
      const forward = (longestPath.get(tempId) ?? 0) + duration
      const backward = backwardDistance.get(tempId) ?? 0
      longestPath.set(tempId, forward) // overwrite with (start-to-endOfTask) distance
      backwardDistance.set(tempId, backward)
    }

    const criticalTempIds = new Set<string>()
    for (const tempId of topoOrder) {
      const task = taskById.get(tempId)!
      const duration = Math.max(
        1,
        Math.ceil(task.estimatedHours / PRODUCTIVE_HOURS_PER_DAY),
      )
      // float = criticalPathLength - longestPath[tempId] - backward[tempId]
      // A task is critical when float == 0
      // longestPath[tempId] here contains (forward start-to-end-of-task) value
      const forward = longestPath.get(tempId) ?? duration
      const backward = backwardDistance.get(tempId) ?? 0
      const totalFloat = criticalPathLength - forward - backward
      if (totalFloat === 0) {
        criticalTempIds.add(tempId)
      }
    }

    // ---- Compute project total duration in workdays ----
    // Total span from earliest task start to latest task end
    let latestEnd = new Date(projectStart)
    for (const { endDate } of schedule.values()) {
      if (endDate > latestEnd) latestEnd = endDate
    }

    // Count workdays between projectStart and latestEnd
    let totalDurationDays = 0
    const cursor = new Date(projectStart)
    while (cursor < latestEnd) {
      cursor.setDate(cursor.getDate() + 1)
      const dow = cursor.getDay()
      if (dow !== 0 && dow !== 6) totalDurationDays++
    }

    const scheduledTasks: ScheduledTask[] = tasks.map((task) => {
      const s = schedule.get(task.tempId)!
      return {
        tempId: task.tempId,
        startDate: s.startDate,
        endDate: s.endDate,
        isCriticalPath: criticalTempIds.has(task.tempId),
      }
    })

    return { scheduledTasks, totalDurationDays, criticalPathLength }
  } catch (error) {
    logger.error('planningService.suggestTimeline error', { error })
    throw error
  }
}

/**
 * Analyzes a project for planning bottlenecks:
 * blocked tasks, overloaded users, at-risk dependencies,
 * unestimated tasks, and unassigned tasks.
 */
async function getBottlenecks(projectId: string): Promise<BottlenecksResult> {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(now.getDate() + 3)

    const [blockedTasksRaw, projectTasks, timeEntries] = await Promise.all([
      // Blocked tasks with assignee info
      prisma.task.findMany({
        where: {
          projectId,
          isDeleted: false,
          status: 'blocked',
        },
        select: {
          id: true,
          code: true,
          title: true,
          blockedReason: true,
          updatedAt: true,
          assignee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // All non-deleted, non-completed, non-cancelled tasks for the project
      prisma.task.findMany({
        where: {
          projectId,
          isDeleted: false,
          status: { notIn: ['done', 'cancelled'] },
        },
        select: {
          id: true,
          code: true,
          title: true,
          taskType: true,
          priority: true,
          assigneeId: true,
          estimatedHours: true,
          startDate: true,
          // Include dependency info (as successor)
          predecessors: {
            select: {
              id: true,
              lagDays: true,
              predecessor: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      }),

      // Time entries for this project to detect overloaded users
      prisma.timeEntry.findMany({
        where: {
          isDeleted: false,
          task: {
            projectId,
            isDeleted: false,
          },
        },
        select: {
          userId: true,
          duration: true,
        },
      }),
    ])

    // ---- Blocked tasks ----
    const blockedTasks: BlockedTaskInfo[] = blockedTasksRaw.map((task) => {
      const diffMs = now.getTime() - task.updatedAt.getTime()
      const daysBlocked = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      return {
        id: task.id,
        code: task.code,
        title: task.title,
        assigneeName: task.assignee
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : null,
        blockedReason: task.blockedReason ?? null,
        daysBlocked,
      }
    })

    // ---- Overloaded users: > 40h assigned in this project ----
    const userAssignedMap = new Map<string, { hours: number; count: number }>()
    for (const task of projectTasks) {
      if (!task.assigneeId) continue
      const hours = toNumber(task.estimatedHours)
      const existing = userAssignedMap.get(task.assigneeId)
      if (existing) {
        existing.hours += hours
        existing.count++
      } else {
        userAssignedMap.set(task.assigneeId, { hours, count: 1 })
      }
    }

    // Fetch user names for overloaded users (> 40h)
    const overloadedUserIds = Array.from(userAssignedMap.entries())
      .filter(([, v]) => v.hours > 40)
      .map(([uid]) => uid)

    const overloadedUserRecords =
      overloadedUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: overloadedUserIds }, isDeleted: false },
            select: { id: true, firstName: true, lastName: true },
          })
        : []

    const overloadedUserNameMap = new Map(
      overloadedUserRecords.map((u) => [
        u.id,
        `${u.firstName} ${u.lastName}`,
      ]),
    )

    const overloadedUsers: OverloadedUserInfo[] = overloadedUserIds.map(
      (uid) => {
        const stats = userAssignedMap.get(uid)!
        return {
          userId: uid,
          name: overloadedUserNameMap.get(uid) ?? uid,
          assignedHours: parseFloat(stats.hours.toFixed(2)),
          taskCount: stats.count,
        }
      },
    )

    // ---- At-risk dependencies ----
    // A dependency is at risk if the predecessor is not 'done' AND the successor's
    // startDate is in the past or less than 3 days away.
    const atRiskDependencies: AtRiskDependencyInfo[] = []
    for (const task of projectTasks) {
      for (const dep of task.predecessors) {
        const pred = dep.predecessor
        if (pred.status === 'done') continue

        const successorStart = task.startDate
        if (!successorStart) continue

        const daysUntilStart = Math.ceil(
          (successorStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (daysUntilStart <= 3) {
          atRiskDependencies.push({
            dependencyId: dep.id,
            predecessorId: pred.id,
            predecessorCode: pred.code,
            predecessorTitle: pred.title,
            predecessorStatus: pred.status,
            successorId: task.id,
            successorCode: task.code,
            successorTitle: task.title,
            successorStartDate: successorStart,
            daysUntilSuccessorStart: daysUntilStart,
          })
        }
      }
    }

    // ---- Unestimated tasks ----
    const unestimatedTasks: UnestimatedTaskInfo[] = projectTasks
      .filter((t) => toNumber(t.estimatedHours) === 0)
      .map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        taskType: t.taskType,
      }))

    // ---- Unassigned tasks ----
    const unassignedTasks: UnassignedTaskInfo[] = projectTasks
      .filter((t) => !t.assigneeId)
      .map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        priority: t.priority,
      }))

    // ---- Summary ----
    const criticalCount = blockedTasks.length + overloadedUsers.length
    const warningCount =
      atRiskDependencies.length +
      unestimatedTasks.length +
      unassignedTasks.length
    const totalIssues = criticalCount + warningCount

    // Silence unused variable warning — timeEntries was fetched for potential
    // future expansion but overload detection currently uses estimatedHours.
    void timeEntries

    return {
      blockedTasks,
      overloadedUsers,
      atRiskDependencies,
      unestimatedTasks,
      unassignedTasks,
      summary: { totalIssues, criticalCount, warningCount },
    }
  } catch (error) {
    logger.error('planningService.getBottlenecks error', { error })
    throw error
  }
}

// ============================================================
// PLAN GENERATION INTERFACES
// ============================================================

interface TemplateMilestone {
  title: string
  estimatedHours?: number
  tasks?: TemplateTask[]
}

interface TemplateTask {
  title: string
  estimatedHours?: number
  priority?: string
  subtasks?: TemplateSubtask[]
}

interface TemplateSubtask {
  title: string
  estimatedHours?: number
  priority?: string
}

interface TemplateStructure {
  milestones?: TemplateMilestone[]
  dependencies?: DependencyDef[]
}

export interface DependencyDef {
  from: string
  to: string
  type: string
}

export interface CommitPlanTask {
  tempId: string
  title: string
  taskType: string
  estimatedHours: number
  priority: string
  assigneeId?: string
  startDate?: string
  dueDate?: string
  parentTempId?: string
}

export interface GeneratePlanResult {
  tasks: PlanTask[]
  dependencies: DependencyDef[]
}

export interface CommitPlanResult {
  created: number
  tasks: Array<{ tempId: string; taskId: string; code: string }>
}

// ============================================================
// GENERATE PLAN FROM TEMPLATE
// ============================================================

/**
 * Fetches a ProjectTemplate and converts its structure into a flat
 * PlanTask array with tempIds, ready for the planning wizard.
 */
async function generatePlanFromTemplate(
  templateId: string,
): Promise<GeneratePlanResult> {
  try {
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new Error(`Template with id "${templateId}" not found`)
    }

    let structure: TemplateStructure = {}
    try {
      structure = JSON.parse(template.structure) as TemplateStructure
    } catch {
      logger.warn('planningService.generatePlanFromTemplate: invalid JSON in template.structure', {
        templateId,
      })
      structure = {}
    }

    const milestones = structure.milestones ?? []
    const dependencies = structure.dependencies ?? []
    const tasks: PlanTask[] = []
    let index = 0

    for (const milestone of milestones) {
      const milestoneTempId = `temp-${index}`
      index++

      tasks.push({
        tempId: milestoneTempId,
        title: milestone.title,
        taskType: 'milestone',
        estimatedHours: milestone.estimatedHours ?? 0,
        priority: 'medium',
        dependencies: [],
      })

      for (const task of milestone.tasks ?? []) {
        const taskTempId = `temp-${index}`
        index++

        tasks.push({
          tempId: taskTempId,
          title: task.title,
          taskType: 'task',
          estimatedHours: task.estimatedHours ?? 4,
          priority: task.priority ?? 'medium',
          parentTempId: milestoneTempId,
          dependencies: [],
        })

        for (const subtask of task.subtasks ?? []) {
          const subtaskTempId = `temp-${index}`
          index++

          tasks.push({
            tempId: subtaskTempId,
            title: subtask.title,
            taskType: 'subtask',
            estimatedHours: subtask.estimatedHours ?? 2,
            priority: subtask.priority ?? 'medium',
            parentTempId: taskTempId,
            dependencies: [],
          })
        }
      }
    }

    return { tasks, dependencies }
  } catch (error) {
    logger.error('planningService.generatePlanFromTemplate error', { error })
    throw error
  }
}

// ============================================================
// COMMIT PLAN
// ============================================================

/**
 * Persists a flat list of CommitPlanTask objects to the database for a
 * given project, respecting the parent/child hierarchy encoded via
 * parentTempId.  Runs entirely inside a single Prisma transaction.
 *
 * Hierarchy is processed in three ordered passes:
 *   1. milestones  (no parentTempId, taskType === 'milestone')
 *   2. tasks       (taskType === 'task')
 *   3. subtasks    (taskType === 'subtask')
 *
 * Within each pass, tasks are inserted in the order they appear in the
 * input array.  A per-type counter is used to generate unique codes of
 * the form `${projectCode}-M001`, `${projectCode}-T002`, etc.
 */
async function commitPlan(
  projectId: string,
  tasks: CommitPlanTask[],
  userId: string,
): Promise<CommitPlanResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { id: true, code: true },
      })

      if (!project) {
        throw new Error(`Project with id "${projectId}" not found`)
      }

      // Capture as non-nullable for use inside the nested closure below
      const projectCode = project.code

      // Get existing counts per type so new codes don't collide
      const [existingMilestoneCount, existingTaskCount, existingSubtaskCount] =
        await Promise.all([
          tx.task.count({ where: { projectId, taskType: 'milestone', isDeleted: false } }),
          tx.task.count({ where: { projectId, taskType: 'task', isDeleted: false } }),
          tx.task.count({ where: { projectId, taskType: 'subtask', isDeleted: false } }),
        ])

      // tempId → real database ID mapping
      const idMap = new Map<string, string>()

      // Counters per type (start after existing records)
      let milestoneIdx = existingMilestoneCount
      let taskIdx = existingTaskCount
      let subtaskIdx = existingSubtaskCount

      const createdRecords: Array<{ tempId: string; taskId: string; code: string }> = []

      async function insertTask(task: CommitPlanTask): Promise<void> {
        let prefix: string
        let seq: number

        if (task.taskType === 'milestone') {
          prefix = 'M'
          milestoneIdx++
          seq = milestoneIdx
        } else if (task.taskType === 'subtask') {
          prefix = 'S'
          subtaskIdx++
          seq = subtaskIdx
        } else {
          prefix = 'T'
          taskIdx++
          seq = taskIdx
        }

        const code = `${projectCode}-${prefix}${String(seq).padStart(3, '0')}`
        const parentRealId = task.parentTempId ? idMap.get(task.parentTempId) : undefined

        const created = await tx.task.create({
          data: {
            title: task.title,
            taskType: task.taskType,
            projectId,
            parentTaskId: parentRealId ?? null,
            assigneeId: task.assigneeId ?? null,
            estimatedHours: task.estimatedHours,
            priority: task.priority || 'medium',
            startDate: task.startDate ? new Date(task.startDate) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            status: 'todo',
            createdById: userId,
            code,
          },
          select: { id: true, code: true },
        })

        idMap.set(task.tempId, created.id)
        createdRecords.push({ tempId: task.tempId, taskId: created.id, code: created.code })
      }

      // Pass 1: milestones
      const milestones = tasks.filter((t) => t.taskType === 'milestone')
      for (const t of milestones) {
        await insertTask(t)
      }

      // Pass 2: tasks
      const plainTasks = tasks.filter((t) => t.taskType === 'task')
      for (const t of plainTasks) {
        await insertTask(t)
      }

      // Pass 3: subtasks
      const subtasks = tasks.filter((t) => t.taskType === 'subtask')
      for (const t of subtasks) {
        await insertTask(t)
      }

      return { created: createdRecords.length, tasks: createdRecords }
    })

    return result
  } catch (error) {
    logger.error('planningService.commitPlan error', { error })
    throw error
  }
}

// ============================================================
// PHASE 3: SMART SCHEDULING ENGINE
// ============================================================

interface AutoScheduleResult {
  scheduledTasks: Array<{
    id: string
    code: string
    title: string
    startDate: string
    endDate: string
    isCriticalPath: boolean
    assigneeName: string | null
  }>
  totalDurationDays: number
  criticalPathLength: number
  conflicts: string[]
}

/**
 * Auto-schedules all tasks in a project based on dependencies,
 * estimated hours, and team availability. Uses topological sort
 * + forward pass scheduling (identical algorithm to suggestTimeline
 * but reads real tasks from the database).
 */
async function autoSchedule(projectId: string): Promise<AutoScheduleResult> {
  try {
    const PRODUCTIVE_HOURS_PER_DAY = 6

    // Fetch all active tasks in project with their dependencies
    const tasks = await prisma.task.findMany({
      where: { projectId, isDeleted: false, status: { notIn: ['done', 'cancelled'] } },
      select: {
        id: true,
        code: true,
        title: true,
        taskType: true,
        estimatedHours: true,
        assigneeId: true,
        assignee: { select: { firstName: true, lastName: true } },
        successors: {
          select: { successorId: true, dependencyType: true, lagDays: true },
        },
        predecessors: {
          select: { predecessorId: true, dependencyType: true, lagDays: true },
        },
      },
    })

    if (tasks.length === 0) {
      return { scheduledTasks: [], totalDurationDays: 0, criticalPathLength: 0, conflicts: [] }
    }

    // Get project start date
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { startDate: true },
    })

    const projectStart = project?.startDate ? new Date(project.startDate) : new Date()
    projectStart.setHours(0, 0, 0, 0)
    while (projectStart.getDay() === 0 || projectStart.getDay() === 6) {
      projectStart.setDate(projectStart.getDate() + 1)
    }

    const taskById = new Map(tasks.map((t) => [t.id, t]))
    const conflicts: string[] = []

    // Build adjacency: predecessor → successors
    const successorsOf = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    const edgeLag = new Map<string, number>()

    for (const t of tasks) {
      if (!inDegree.has(t.id)) inDegree.set(t.id, 0)
      for (const dep of t.predecessors) {
        const pred = dep.predecessorId
        if (!taskById.has(pred)) continue // predecessor outside project or deleted
        if (!successorsOf.has(pred)) successorsOf.set(pred, [])
        successorsOf.get(pred)!.push(t.id)
        inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
        edgeLag.set(`${pred}→${t.id}`, dep.lagDays)
      }
    }

    // Topological sort (Kahn's)
    const queue: string[] = []
    for (const t of tasks) {
      if ((inDegree.get(t.id) ?? 0) === 0) queue.push(t.id)
    }

    const topoOrder: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      topoOrder.push(current)
      for (const succ of successorsOf.get(current) ?? []) {
        const deg = (inDegree.get(succ) ?? 1) - 1
        inDegree.set(succ, deg)
        if (deg === 0) queue.push(succ)
      }
    }

    if (topoOrder.length !== tasks.length) {
      conflicts.push('Dipendenze circolari rilevate: alcuni task non possono essere schedulati')
    }

    // Forward pass
    const earliestEnd = new Map<string, Date>()
    const schedule = new Map<string, { startDate: Date; endDate: Date }>()

    for (const id of topoOrder) {
      const task = taskById.get(id)!
      const hours = toNumber(task.estimatedHours)
      const duration = Math.max(1, Math.ceil(hours / PRODUCTIVE_HOURS_PER_DAY))

      let earliestStart = new Date(projectStart)
      for (const dep of task.predecessors) {
        const predEnd = earliestEnd.get(dep.predecessorId)
        if (!predEnd) continue
        const candidate = addWorkdays(predEnd, dep.lagDays)
        if (candidate > earliestStart) earliestStart = new Date(candidate)
      }
      while (earliestStart.getDay() === 0 || earliestStart.getDay() === 6) {
        earliestStart.setDate(earliestStart.getDate() + 1)
      }

      const endDate = addWorkdays(earliestStart, duration)
      schedule.set(id, { startDate: earliestStart, endDate })
      earliestEnd.set(id, endDate)
    }

    // Critical path (longest path)
    const longestPath = new Map<string, number>()
    for (const id of topoOrder) longestPath.set(id, 0)

    for (const id of topoOrder) {
      const task = taskById.get(id)!
      const hours = toNumber(task.estimatedHours)
      const duration = Math.max(1, Math.ceil(hours / PRODUCTIVE_HOURS_PER_DAY))
      const selfPath = (longestPath.get(id) ?? 0) + duration

      for (const succ of successorsOf.get(id) ?? []) {
        const lag = edgeLag.get(`${id}→${succ}`) ?? 0
        const candidate = selfPath + lag
        if (candidate > (longestPath.get(succ) ?? 0)) {
          longestPath.set(succ, candidate)
        }
      }
    }

    const criticalPathLength = Math.max(0, ...longestPath.values())

    // Backward pass for total float
    const backwardDist = new Map<string, number>()
    for (const id of [...topoOrder].reverse()) {
      const task = taskById.get(id)!
      const hours = toNumber(task.estimatedHours)
      const duration = Math.max(1, Math.ceil(hours / PRODUCTIVE_HOURS_PER_DAY))
      const succList = successorsOf.get(id) ?? []
      if (succList.length === 0) {
        backwardDist.set(id, 0)
      } else {
        const minBack = Math.min(
          ...succList.map((s) => {
            const lag = edgeLag.get(`${id}→${s}`) ?? 0
            return (backwardDist.get(s) ?? 0) + lag
          })
        )
        backwardDist.set(id, minBack)
      }
      const forward = (longestPath.get(id) ?? 0) + duration
      longestPath.set(id, forward)
    }

    const criticalIds = new Set<string>()
    for (const id of topoOrder) {
      const task = taskById.get(id)!
      const hours = toNumber(task.estimatedHours)
      const duration = Math.max(1, Math.ceil(hours / PRODUCTIVE_HOURS_PER_DAY))
      const forward = longestPath.get(id) ?? 0
      const backward = backwardDist.get(id) ?? 0
      const totalFloat = criticalPathLength - forward - backward
      if (Math.abs(totalFloat) < 0.001) criticalIds.add(id)
      void duration // used in forward calculation above
    }

    // Compute total duration
    let latestEnd = projectStart
    for (const sched of schedule.values()) {
      if (sched.endDate > latestEnd) latestEnd = sched.endDate
    }
    let totalDurationDays = 0
    const cursor = new Date(projectStart)
    while (cursor < latestEnd) {
      cursor.setDate(cursor.getDate() + 1)
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) totalDurationDays++
    }

    const scheduledTasks = topoOrder
      .filter((id) => schedule.has(id))
      .map((id) => {
        const task = taskById.get(id)!
        const sched = schedule.get(id)!
        return {
          id: task.id,
          code: task.code,
          title: task.title,
          startDate: sched.startDate.toISOString(),
          endDate: sched.endDate.toISOString(),
          isCriticalPath: criticalIds.has(id),
          assigneeName: task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : null,
        }
      })

    return { scheduledTasks, totalDurationDays, criticalPathLength, conflicts }
  } catch (error) {
    logger.error('planningService.autoSchedule error', { error })
    throw error
  }
}

// ============================================================

interface ReassignmentSuggestion {
  taskId: string
  taskCode: string
  taskTitle: string
  currentAssigneeId: string | null
  currentAssigneeName: string | null
  suggestedAssigneeId: string
  suggestedAssigneeName: string
  reason: string
  estimatedHours: number
}

/**
 * Analyzes workload distribution in a project and suggests
 * reassignments to balance the load across team members.
 */
async function suggestReassignments(projectId: string): Promise<ReassignmentSuggestion[]> {
  try {
    // Get all active tasks in project
    const tasks = await prisma.task.findMany({
      where: { projectId, isDeleted: false, status: { notIn: ['done', 'cancelled'] } },
      select: {
        id: true,
        code: true,
        title: true,
        assigneeId: true,
        estimatedHours: true,
        priority: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Get all active users with their targets
    const users = await prisma.user.findMany({
      where: { isActive: true, isDeleted: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        weeklyHoursTarget: true,
      },
    })

    // Calculate current workload per user (across ALL projects, not just this one)
    const allActiveTasks = await prisma.task.findMany({
      where: { isDeleted: false, status: { notIn: ['done', 'cancelled'] }, assigneeId: { not: null } },
      select: { assigneeId: true, estimatedHours: true },
    })

    const globalWorkload = new Map<string, number>()
    for (const t of allActiveTasks) {
      if (!t.assigneeId) continue
      globalWorkload.set(
        t.assigneeId,
        (globalWorkload.get(t.assigneeId) ?? 0) + toNumber(t.estimatedHours),
      )
    }

    const userMap = new Map(users.map((u) => [u.id, u]))
    const suggestions: ReassignmentSuggestion[] = []

    // Identify overloaded users in this project
    const projectWorkload = new Map<string, number>()
    for (const t of tasks) {
      if (!t.assigneeId) continue
      projectWorkload.set(
        t.assigneeId,
        (projectWorkload.get(t.assigneeId) ?? 0) + toNumber(t.estimatedHours),
      )
    }

    // Find users with capacity
    const usersWithCapacity = users
      .map((u) => ({
        ...u,
        target: u.weeklyHoursTarget ?? 40,
        assigned: globalWorkload.get(u.id) ?? 0,
      }))
      .filter((u) => u.assigned < u.target)
      .sort((a, b) => (a.assigned / a.target) - (b.assigned / b.target))

    // For each overloaded user, suggest moving their lowest-priority tasks
    for (const [userId] of projectWorkload.entries()) {
      const user = userMap.get(userId)
      if (!user) continue
      const target = user.weeklyHoursTarget ?? 40
      const globalHours = globalWorkload.get(userId) ?? 0

      if (globalHours <= target) continue // not overloaded

      // Get tasks assigned to this user, sorted by priority (low first = move first)
      const priorityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
      const userTasks = tasks
        .filter((t) => t.assigneeId === userId)
        .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))

      let excess = globalHours - target
      for (const task of userTasks) {
        if (excess <= 0) break
        const taskHours = toNumber(task.estimatedHours)
        if (taskHours === 0) continue

        // Find best available user
        const candidate = usersWithCapacity.find(
          (u) => u.id !== userId && (u.target - u.assigned) >= taskHours,
        )
        if (!candidate) continue

        suggestions.push({
          taskId: task.id,
          taskCode: task.code,
          taskTitle: task.title,
          currentAssigneeId: userId,
          currentAssigneeName: `${user.firstName} ${user.lastName}`,
          suggestedAssigneeId: candidate.id,
          suggestedAssigneeName: `${candidate.firstName} ${candidate.lastName}`,
          reason: `${user.firstName} è sovraccarico (${globalHours.toFixed(0)}h/${target}h). ${candidate.firstName} ha capacità disponibile (${candidate.assigned.toFixed(0)}h/${candidate.target}h).`,
          estimatedHours: taskHours,
        })

        // Update simulated workload
        candidate.assigned += taskHours
        excess -= taskHours
      }
    }

    return suggestions
  } catch (error) {
    logger.error('planningService.suggestReassignments error', { error })
    throw error
  }
}

// ============================================================

interface WhatIfChange {
  type: 'add_task' | 'remove_task' | 'change_assignee' | 'change_hours'
  taskId?: string
  newAssigneeId?: string
  newEstimatedHours?: number
  newTask?: { title: string; estimatedHours: number; assigneeId?: string }
}

interface WhatIfResult {
  currentDurationDays: number
  projectedDurationDays: number
  deltaDays: number
  workloadChanges: Array<{
    userId: string
    name: string
    currentHours: number
    projectedHours: number
    deltaHours: number
  }>
  warnings: string[]
}

/**
 * Simulates the impact of hypothetical changes on a project's
 * timeline and workload without persisting anything.
 */
async function whatIfAnalysis(
  projectId: string,
  changes: WhatIfChange[],
): Promise<WhatIfResult> {
  try {
    // Fetch current project state
    const tasks = await prisma.task.findMany({
      where: { projectId, isDeleted: false, status: { notIn: ['done', 'cancelled'] } },
      select: {
        id: true,
        estimatedHours: true,
        assigneeId: true,
        predecessors: { select: { predecessorId: true, lagDays: true } },
      },
    })

    const users = await prisma.user.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, firstName: true, lastName: true, weeklyHoursTarget: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    // Calculate current state
    const HOURS_PER_DAY = 6
    const currentTotalHours = tasks.reduce((s, t) => s + toNumber(t.estimatedHours), 0)
    const currentDurationDays = Math.max(1, Math.ceil(currentTotalHours / HOURS_PER_DAY))

    // Build current workload by user
    const currentWorkload = new Map<string, number>()
    for (const t of tasks) {
      if (!t.assigneeId) continue
      currentWorkload.set(
        t.assigneeId,
        (currentWorkload.get(t.assigneeId) ?? 0) + toNumber(t.estimatedHours),
      )
    }

    // Apply changes to a simulated copy
    const simTasks = tasks.map((t) => ({
      id: t.id,
      estimatedHours: toNumber(t.estimatedHours),
      assigneeId: t.assigneeId,
    }))

    const warnings: string[] = []

    for (const change of changes) {
      switch (change.type) {
        case 'add_task': {
          if (change.newTask) {
            simTasks.push({
              id: `sim-${Math.random().toString(36).slice(2, 8)}`,
              estimatedHours: change.newTask.estimatedHours,
              assigneeId: change.newTask.assigneeId ?? null,
            })
          }
          break
        }
        case 'remove_task': {
          const idx = simTasks.findIndex((t) => t.id === change.taskId)
          if (idx >= 0) simTasks.splice(idx, 1)
          break
        }
        case 'change_assignee': {
          const task = simTasks.find((t) => t.id === change.taskId)
          if (task && change.newAssigneeId) task.assigneeId = change.newAssigneeId
          break
        }
        case 'change_hours': {
          const task = simTasks.find((t) => t.id === change.taskId)
          if (task && change.newEstimatedHours !== undefined) {
            task.estimatedHours = change.newEstimatedHours
          }
          break
        }
      }
    }

    // Calculate projected state
    const projectedTotalHours = simTasks.reduce((s, t) => s + t.estimatedHours, 0)
    const projectedDurationDays = Math.max(1, Math.ceil(projectedTotalHours / HOURS_PER_DAY))

    // Projected workload
    const projectedWorkload = new Map<string, number>()
    for (const t of simTasks) {
      if (!t.assigneeId) continue
      projectedWorkload.set(
        t.assigneeId,
        (projectedWorkload.get(t.assigneeId) ?? 0) + t.estimatedHours,
      )
    }

    // Build workload changes
    const allUserIds = new Set([...currentWorkload.keys(), ...projectedWorkload.keys()])
    const workloadChanges = Array.from(allUserIds).map((userId) => {
      const user = userMap.get(userId)
      const currentHours = currentWorkload.get(userId) ?? 0
      const projectedHours = projectedWorkload.get(userId) ?? 0
      const target = user?.weeklyHoursTarget ?? 40

      if (projectedHours > target) {
        warnings.push(
          `${user?.firstName ?? 'Utente'} ${user?.lastName ?? ''} sarà sovraccarico: ${projectedHours.toFixed(0)}h vs ${target}h target`,
        )
      }

      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Sconosciuto',
        currentHours,
        projectedHours,
        deltaHours: projectedHours - currentHours,
      }
    }).filter((c) => c.deltaHours !== 0)
      .sort((a, b) => Math.abs(b.deltaHours) - Math.abs(a.deltaHours))

    return {
      currentDurationDays,
      projectedDurationDays,
      deltaDays: projectedDurationDays - currentDurationDays,
      workloadChanges,
      warnings,
    }
  } catch (error) {
    logger.error('planningService.whatIfAnalysis error', { error })
    throw error
  }
}

// ============================================================
// EXPORT
// ============================================================

export const planningService = {
  getEstimationMetrics,
  getTeamCapacity,
  suggestTimeline,
  getBottlenecks,
  generatePlanFromTemplate,
  commitPlan,
  autoSchedule,
  suggestReassignments,
  whatIfAnalysis,
}
