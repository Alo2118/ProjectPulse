/**
 * Analytics Service - Business logic for analytics dashboard
 * @module services/analyticsService
 */

import { prisma } from '../models/prismaClient.js'

interface OverviewStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
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
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    durationResult,
    openRisks,
    activeUsers,
  ] = await Promise.all([
    prisma.project.count({ where: { isDeleted: false } }),
    prisma.project.count({
      where: { isDeleted: false, status: { notIn: ['completed', 'cancelled'] } },
    }),
    prisma.task.count({ where: { isDeleted: false } }),
    prisma.task.count({ where: { isDeleted: false, status: 'done' } }),
    prisma.task.count({ where: { isDeleted: false, status: 'in_progress' } }),
    prisma.task.count({ where: { isDeleted: false, status: 'blocked' } }),
    prisma.timeEntry.aggregate({
      _sum: { duration: true },
    }),
    prisma.risk.count({ where: { isDeleted: false, status: 'open' } }),
    prisma.user.count({ where: { isActive: true } }),
  ])

  return {
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
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

  // Get task stats per project
  const [taskStats, riskStats] = await Promise.all([
    prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds }, isDeleted: false },
      _count: { id: true },
    }),
    prisma.risk.groupBy({
      by: ['projectId', 'impact', 'status'],
      where: { projectId: { in: projectIds }, isDeleted: false },
      _count: { id: true },
    }),
  ])

  // Aggregate task stats per project
  const projectTaskStats = new Map<
    string,
    { total: number; completed: number; blocked: number; inProgress: number }
  >()
  for (const stat of taskStats) {
    if (!stat.projectId) continue
    const current = projectTaskStats.get(stat.projectId) || {
      total: 0,
      completed: 0,
      blocked: 0,
      inProgress: 0,
    }
    current.total += stat._count.id
    if (stat.status === 'done') current.completed += stat._count.id
    if (stat.status === 'blocked') current.blocked += stat._count.id
    if (stat.status === 'in_progress') current.inProgress += stat._count.id
    projectTaskStats.set(stat.projectId, current)
  }

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

export const analyticsService = {
  getOverview,
  getTasksByStatus,
  getHoursByProject,
  getTaskCompletionTrend,
  getTopContributors,
  getProjectHealth,
}
