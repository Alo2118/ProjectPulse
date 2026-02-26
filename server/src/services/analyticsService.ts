/**
 * Analytics Service - Business logic for analytics dashboard
 * @module services/analyticsService
 */

import { prisma } from '../models/prismaClient.js'
import type { PreviousWeekOverview, TeamWorkloadEntry, UserWeeklyHours } from '../types/index.js'
import { getTaskStats, getProjectTaskCountsMap } from './statsService.js'

interface OverviewStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  overdueTasks: number
  totalMinutesLogged: number
  openRisks: number
  activeUsers: number
}

interface TasksByStatus {
  status: string
  count: number
}

interface HoursByProject {
  projectId: string
  projectName: string
  projectCode: string
  totalMinutes: number
}

interface TaskCompletionTrend {
  date: string
  completed: number
  created: number
}

interface TopContributor {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  tasksCompleted: number
}

interface ProjectHealth {
  projectId: string
  projectCode: string
  projectName: string
  status: string
  priority: string
  progress: number
  tasksTotal: number
  tasksCompleted: number
  tasksBlocked: number
  tasksInProgress: number
  openRisks: number
  highRisks: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
}

async function getOverview(): Promise<OverviewStats> {
  const [
    totalProjects,
    activeProjects,
    taskStats,
    durationResult,
    openRisks,
    activeUsers,
  ] = await Promise.all([
    prisma.project.count({ where: { isDeleted: false } }),
    prisma.project.count({
      where: { isDeleted: false, status: { notIn: ['completed', 'cancelled'] } },
    }),
    // Delegate task counting to statsService (single source of truth)
    getTaskStats(),
    prisma.timeEntry.aggregate({
      _sum: { duration: true },
    }),
    prisma.risk.count({ where: { isDeleted: false, status: 'open' } }),
    prisma.user.count({ where: { isActive: true } }),
  ])

  return {
    totalProjects,
    activeProjects,
    totalTasks: taskStats.total,
    completedTasks: taskStats.done,
    inProgressTasks: taskStats.inProgress,
    blockedTasks: taskStats.blocked,
    overdueTasks: taskStats.overdue,
    totalMinutesLogged: durationResult._sum?.duration ?? 0,
    openRisks,
    activeUsers,
  }
}

async function getTasksByStatus(): Promise<TasksByStatus[]> {
  const result = await prisma.task.groupBy({
    by: ['status'],
    where: { isDeleted: false },
    _count: { id: true },
  })

  return result.map((r) => ({
    status: r.status,
    count: r._count.id,
  }))
}

async function getHoursByProject(limit = 10): Promise<HoursByProject[]> {
  // TimeEntry doesn't have projectId directly, join through task
  const entries = await prisma.timeEntry.findMany({
    where: { duration: { not: null } },
    select: {
      duration: true,
      task: {
        select: { projectId: true },
      },
    },
  })

  const projectMinutes = new Map<string, number>()
  for (const e of entries) {
    const pid = e.task.projectId
    if (!pid) continue
    projectMinutes.set(pid, (projectMinutes.get(pid) || 0) + (e.duration || 0))
  }

  const sorted = Array.from(projectMinutes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const projectIds = sorted.map(([id]) => id)
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, code: true },
  })
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  return sorted
    .filter(([id]) => projectMap.has(id))
    .map(([id, minutes]) => {
      const project = projectMap.get(id)!
      return {
        projectId: id,
        projectName: project.name,
        projectCode: project.code,
        totalMinutes: minutes,
      }
    })
}

async function getTaskCompletionTrend(days = 30): Promise<TaskCompletionTrend[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [completedTasks, createdTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        isDeleted: false,
        status: 'done',
        updatedAt: { gte: since },
      },
      select: { updatedAt: true },
    }),
    prisma.task.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    }),
  ])

  const dayMap = new Map<string, { completed: number; created: number }>()

  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    dayMap.set(key, { completed: 0, created: 0 })
  }

  for (const t of completedTasks) {
    const key = t.updatedAt.toISOString().split('T')[0]
    const entry = dayMap.get(key)
    if (entry) entry.completed++
  }

  for (const t of createdTasks) {
    const key = t.createdAt.toISOString().split('T')[0]
    const entry = dayMap.get(key)
    if (entry) entry.created++
  }

  return Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function getTopContributors(limit = 5): Promise<TopContributor[]> {
  const timeByUser = await prisma.timeEntry.groupBy({
    by: ['userId'],
    _sum: { duration: true },
    orderBy: { _sum: { duration: 'desc' } },
    take: limit,
  })

  const userIds = timeByUser.map((e) => e.userId)
  const [users, taskCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { assigneeId: { in: userIds }, status: 'done', isDeleted: false },
      _count: { id: true },
    }),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const taskMap = new Map(taskCounts.map((t) => [t.assigneeId!, t._count.id]))

  return timeByUser
    .filter((e) => userMap.has(e.userId))
    .map((e) => {
      const user = userMap.get(e.userId)!
      return {
        userId: e.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        minutesLogged: e._sum?.duration ?? 0,
        tasksCompleted: taskMap.get(e.userId) || 0,
      }
    })
}

async function getProjectHealth(): Promise<ProjectHealth[]> {
  // Get active projects (not completed or cancelled)
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      status: { notIn: ['completed', 'cancelled'] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      priority: true,
      targetEndDate: true,
    },
    orderBy: [{ priority: 'desc' }, { targetEndDate: 'asc' }],
  })

  if (projects.length === 0) return []

  const projectIds = projects.map((p) => p.id)

  // Use statsService for task counts (single source of truth)
  const [projectTaskStats, riskStats] = await Promise.all([
    getProjectTaskCountsMap(projectIds),
    prisma.risk.groupBy({
      by: ['projectId', 'impact', 'status'],
      where: { projectId: { in: projectIds }, isDeleted: false },
      _count: { id: true },
    }),
  ])

  // Aggregate risk stats per project
  const projectRiskStats = new Map<string, { open: number; high: number }>()
  for (const stat of riskStats) {
    const current = projectRiskStats.get(stat.projectId) || { open: 0, high: 0 }
    if (stat.status === 'open') {
      current.open += stat._count.id
      if (stat.impact === 'high') current.high += stat._count.id
    }
    projectRiskStats.set(stat.projectId, current)
  }

  const now = new Date()

  return projects.map((project) => {
    const tasks = projectTaskStats.get(project.id) || {
      total: 0,
      completed: 0,
      blocked: 0,
      inProgress: 0,
    }
    const risks = projectRiskStats.get(project.id) || { open: 0, high: 0 }

    // Calculate progress
    const progress = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0

    // Calculate days remaining
    let daysRemaining: number | null = null
    if (project.targetEndDate) {
      const diffMs = new Date(project.targetEndDate).getTime() - now.getTime()
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }

    // Determine health status
    let healthStatus: 'healthy' | 'at_risk' | 'critical' = 'healthy'
    if (tasks.blocked > 0 || risks.high > 0) {
      healthStatus = 'critical'
    } else if (risks.open > 2 || (daysRemaining !== null && daysRemaining < 7 && progress < 80)) {
      healthStatus = 'at_risk'
    }

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      status: project.status,
      priority: project.priority,
      progress,
      tasksTotal: tasks.total,
      tasksCompleted: tasks.completed,
      tasksBlocked: tasks.blocked,
      tasksInProgress: tasks.inProgress,
      openRisks: risks.open,
      highRisks: risks.high,
      targetEndDate: project.targetEndDate?.toISOString() ?? null,
      daysRemaining,
      healthStatus,
    }
  })
}

async function getPreviousWeekOverview(): Promise<PreviousWeekOverview> {
  // Calculate previous week boundaries (Mon 00:00 to Sun 23:59)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  const diffToThisMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - diffToThisMonday)
  thisMonday.setHours(0, 0, 0, 0)

  const prevMonday = new Date(thisMonday)
  prevMonday.setDate(thisMonday.getDate() - 7)

  const [timeResult, completedTasks, blockedTasks, activeProjects] = await Promise.all([
    prisma.timeEntry.aggregate({
      _sum: { duration: true },
      where: {
        startTime: { gte: prevMonday, lt: thisMonday },
        duration: { not: null },
      },
    }),
    prisma.task.count({
      where: {
        isDeleted: false,
        status: 'done',
        updatedAt: { gte: prevMonday, lt: thisMonday },
      },
    }),
    prisma.task.count({
      where: {
        isDeleted: false,
        status: 'blocked',
        updatedAt: { gte: prevMonday, lt: thisMonday },
      },
    }),
    prisma.project.count({
      where: {
        isDeleted: false,
        status: { notIn: ['completed', 'cancelled'] },
        updatedAt: { gte: prevMonday, lt: thisMonday },
      },
    }),
  ])

  return {
    totalMinutesLogged: timeResult._sum?.duration ?? 0,
    completedTasks,
    blockedTasks,
    activeProjects,
  }
}

async function getTeamWorkload(weekStart: Date, weekEnd: Date): Promise<TeamWorkloadEntry[]> {
  // Get all active users
  const users = await prisma.user.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true, firstName: true, lastName: true, weeklyHoursTarget: true },
  })

  // Get time entries grouped by user for the week
  const timeByUser = await prisma.timeEntry.groupBy({
    by: ['userId'],
    _sum: { duration: true },
    where: {
      startTime: { gte: weekStart, lt: weekEnd },
      duration: { not: null },
      isDeleted: false,
    },
  })

  const timeMap = new Map(timeByUser.map(e => [e.userId, e._sum?.duration ?? 0]))

  return users.map(user => {
    const minutesLogged = timeMap.get(user.id) ?? 0
    const target = user.weeklyHoursTarget ?? 40
    const utilizationPercent = target > 0 ? Math.round((minutesLogged / 60 / target) * 100) : 0

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      minutesLogged,
      weeklyHoursTarget: target,
      utilizationPercent,
    }
  }).sort((a, b) => b.minutesLogged - a.minutesLogged)
}

async function getWeeklyHoursByUser(userId: string, weekStart: Date): Promise<UserWeeklyHours> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Get user's target
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyHoursTarget: true },
  })
  const weeklyTarget = user?.weeklyHoursTarget ?? 40

  // Get all time entries for the user this week
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      startTime: { gte: weekStart, lt: weekEnd },
      duration: { not: null },
      isDeleted: false,
    },
    select: {
      startTime: true,
      duration: true,
      task: {
        select: {
          projectId: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Helper: format date as YYYY-MM-DD
  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Build day boundaries (Mon 00:00 → Tue 00:00, etc.) for reliable grouping.
  // Uses direct Date comparison instead of date strings to avoid timezone
  // mismatches between Prisma adapter datetimes and server-created Dates.
  const dayBoundaries: Array<{ start: Date; end: Date; dayOfWeek: number; date: string }> = []
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(weekStart)
    dayStart.setDate(dayStart.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    dayBoundaries.push({
      start: dayStart,
      end: dayEnd,
      dayOfWeek: dayStart.getDay(),
      date: formatDate(dayStart),
    })
  }

  // Group entries by day using boundary comparison and by project
  const byDayMinutes = new Array<number>(7).fill(0)
  const byProjectMap = new Map<string, { projectName: string; totalMinutes: number }>()
  let totalMinutes = 0

  for (const entry of entries) {
    const duration = entry.duration ?? 0
    totalMinutes += duration

    // Find which day this entry belongs to using Date comparison
    const entryTime = new Date(entry.startTime).getTime()
    for (let i = 0; i < 7; i++) {
      if (entryTime >= dayBoundaries[i].start.getTime() && entryTime < dayBoundaries[i].end.getTime()) {
        byDayMinutes[i] += duration
        break
      }
    }

    // By project
    const projectId = entry.task.projectId
    if (projectId && entry.task.project) {
      const existing = byProjectMap.get(projectId)
      if (existing) {
        existing.totalMinutes += duration
      } else {
        byProjectMap.set(projectId, {
          projectName: entry.task.project.name,
          totalMinutes: duration,
        })
      }
    }
  }

  // Build byDay array (Mon-Sun)
  const byDay = dayBoundaries.map((day, i) => ({
    dayOfWeek: day.dayOfWeek,
    date: day.date,
    totalMinutes: byDayMinutes[i],
  }))

  // Build byProject array
  const byProject = Array.from(byProjectMap.entries())
    .map(([projectId, data]) => ({
      projectId,
      projectName: data.projectName,
      totalMinutes: data.totalMinutes,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)

  return { byDay, byProject, totalMinutes, weeklyTarget }
}

export interface DeliveryForecast {
  projectId: string
  projectCode: string
  projectName: string
  progress: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  velocityTasksPerWeek: number
  remainingTasks: number
  estimatedCompletionDays: number | null
  predictedDelay: number | null
}

async function getDeliveryForecast(): Promise<DeliveryForecast[]> {
  const healthData = await getProjectHealth()

  if (healthData.length === 0) return []

  const projectIds = healthData.map((p) => p.projectId)

  // Count tasks completed in the last 28 days per project
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const recentlyCompleted = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: projectIds },
      isDeleted: false,
      status: 'done',
      updatedAt: { gte: fourWeeksAgo },
    },
    _count: { id: true },
  })

  const completedRecentlyMap = new Map(
    recentlyCompleted
      .filter((r) => r.projectId !== null)
      .map((r) => [r.projectId as string, r._count.id])
  )

  const results: DeliveryForecast[] = healthData.map((project) => {
    const completedRecently = completedRecentlyMap.get(project.projectId) ?? 0
    const velocityTasksPerWeek = completedRecently / 4
    const remainingTasks = project.tasksTotal - project.tasksCompleted

    let estimatedCompletionDays: number | null = null
    if (velocityTasksPerWeek > 0 && remainingTasks > 0) {
      estimatedCompletionDays = Math.ceil((remainingTasks / velocityTasksPerWeek) * 7)
    }

    let predictedDelay: number | null = null
    if (project.daysRemaining !== null && estimatedCompletionDays !== null) {
      predictedDelay = estimatedCompletionDays - project.daysRemaining
    }

    return {
      projectId: project.projectId,
      projectCode: project.projectCode,
      projectName: project.projectName,
      progress: project.progress,
      targetEndDate: project.targetEndDate,
      daysRemaining: project.daysRemaining,
      healthStatus: project.healthStatus,
      velocityTasksPerWeek,
      remainingTasks,
      estimatedCompletionDays,
      predictedDelay,
    }
  })

  // Sort: critical first, then at_risk, then healthy; within same status by predictedDelay descending
  const statusOrder: Record<string, number> = { critical: 0, at_risk: 1, healthy: 2 }

  return results.sort((a, b) => {
    const statusDiff = statusOrder[a.healthStatus] - statusOrder[b.healthStatus]
    if (statusDiff !== 0) return statusDiff
    // Both null predictedDelay go to the end
    if (a.predictedDelay === null && b.predictedDelay === null) return 0
    if (a.predictedDelay === null) return 1
    if (b.predictedDelay === null) return -1
    return b.predictedDelay - a.predictedDelay
  })
}

export interface ProjectBudgetData {
  projectId: string
  projectName: string
  projectCode: string
  budget: number
  totalHoursLogged: number
  estimatedHours: number
  budgetUsedPercent: number
  status: 'on_track' | 'at_risk' | 'over_budget'
}

async function getBudgetOverview(): Promise<ProjectBudgetData[]> {
  // Fetch all active projects that have a budget set (non-null, non-zero)
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      status: { notIn: ['completed', 'cancelled'] },
      budget: { not: null },
    },
    select: {
      id: true,
      code: true,
      name: true,
      budget: true,
    },
  })

  // Filter out projects with zero or null budget after fetch (Decimal type safety)
  const projectsWithBudget = projects.filter(
    (p) => p.budget !== null && Number(p.budget) > 0
  )

  if (projectsWithBudget.length === 0) return []

  const projectIds = projectsWithBudget.map((p) => p.id)

  // Get all time entries for tasks in these projects
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      isDeleted: false,
      duration: { not: null },
      task: {
        projectId: { in: projectIds },
        isDeleted: false,
      },
    },
    select: {
      duration: true,
      task: {
        select: { projectId: true },
      },
    },
  })

  // Aggregate total minutes logged per project
  const minutesMap = new Map<string, number>()
  for (const entry of timeEntries) {
    const pid = entry.task.projectId
    if (!pid) continue
    minutesMap.set(pid, (minutesMap.get(pid) ?? 0) + (entry.duration ?? 0))
  }

  // Get estimated hours per project (sum of all task estimatedHours)
  const taskEstimates = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: projectIds },
      isDeleted: false,
      estimatedHours: { not: null },
    },
    _sum: { estimatedHours: true },
  })

  const estimatedMap = new Map<string, number>()
  for (const row of taskEstimates) {
    if (row.projectId) {
      estimatedMap.set(row.projectId, Number(row._sum.estimatedHours ?? 0))
    }
  }

  const results: ProjectBudgetData[] = projectsWithBudget.map((project) => {
    const budget = Number(project.budget!)
    const totalMinutes = minutesMap.get(project.id) ?? 0
    const totalHoursLogged = Math.round((totalMinutes / 60) * 10) / 10
    const estimatedHours = Math.round((estimatedMap.get(project.id) ?? 0) * 10) / 10

    // Use estimated hours as proxy for budget usage when no hourly rate is available.
    // budgetUsedPercent = hours logged / estimated hours * 100 (or 0 if no estimate)
    const budgetUsedPercent =
      estimatedHours > 0
        ? Math.round((totalHoursLogged / estimatedHours) * 100)
        : 0

    let status: 'on_track' | 'at_risk' | 'over_budget' = 'on_track'
    if (budgetUsedPercent > 100) {
      status = 'over_budget'
    } else if (budgetUsedPercent > 80) {
      status = 'at_risk'
    }

    return {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      budget,
      totalHoursLogged,
      estimatedHours,
      budgetUsedPercent,
      status,
    }
  })

  // Sort: over_budget first, then at_risk, then on_track; within same status by percent descending
  const statusOrder: Record<string, number> = { over_budget: 0, at_risk: 1, on_track: 2 }
  return results.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return b.budgetUsedPercent - a.budgetUsedPercent
  })
}

export const analyticsService = {
  getOverview,
  getTasksByStatus,
  getHoursByProject,
  getTaskCompletionTrend,
  getTopContributors,
  getProjectHealth,
  getPreviousWeekOverview,
  getTeamWorkload,
  getWeeklyHoursByUser,
  getDeliveryForecast,
  getBudgetOverview,
}
