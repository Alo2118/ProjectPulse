/**
 * Dashboard Service - Business logic for dashboard KPIs and activity feed
 * @module services/dashboardService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'

// ============================================================
// TYPES
// ============================================================

export interface DashboardStats {
  activeProjects: number
  activeProjectsDelta: number
  openTasks: number
  openTasksDelta: number
  weeklyHours: number
  weeklyHoursDelta: number
  openRisks: number
  criticalRisks: number
  completedTasksThisWeek: number
  teamMemberCount: number
  budgetUsedPercent: number | null
}

export type AttentionItemType = 'blocked_task' | 'due_soon' | 'critical_risk' | 'pending_review'

export interface AttentionItem {
  type: AttentionItemType
  entityId: string
  title: string
  projectName: string | null
  projectId: string | null
  dueDate: string | null
  extra: string | null
}

export interface TodayTotal {
  todayMinutes: number
  runningEntry: {
    id: string
    taskId: string
    taskTitle: string
    startedAt: string
  } | null
}

export interface MyTaskToday {
  id: string
  title: string
  status: string
  dueDate: string | null
  isRecurring: boolean
  recurrencePattern: string | null
  project: { id: string; name: string } | null
}

export interface ActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Returns Monday 00:00:00 local time for any date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Returns Sunday 23:59:59.999 local time for any date
 */
function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Returns start of today (00:00:00.000)
 */
function getTodayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Returns end of today (23:59:59.999)
 */
function getTodayEnd(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

import { RISK_CRITICAL_THRESHOLD } from '../constants/enums.js'

/**
 * Attempts to extract a human-readable entity name from stored AuditLog JSON data.
 * Tries newData first (create/update), then oldData (delete).
 */
function extractEntityName(newData: string | null, oldData: string | null): string | null {
  const raw = newData ?? oldData
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>
      const name = obj['name'] ?? obj['title'] ?? obj['code'] ?? null
      return typeof name === 'string' ? name : null
    }
    return null
  } catch {
    return null
  }
}

// ============================================================
// INACTIVE PROJECT STATUSES
// ============================================================

const INACTIVE_PROJECT_STATUSES = ['completed', 'cancelled', 'on_hold']
const CLOSED_TASK_STATUSES = ['done', 'cancelled']

// ============================================================
// SERVICE METHODS
// ============================================================

/**
 * Returns KPI statistics for the dashboard.
 * - activeProjects / delta vs previous week
 * - openTasks / delta vs previous week (filtered by assignee for dipendente)
 * - weeklyHours (this week, in decimal hours) / delta vs previous week
 * - openRisks / criticalRisks (0 for dipendente)
 */
export async function getStats(userId: string, role: string): Promise<DashboardStats> {
  const now = new Date()
  const thisWeekStart = getWeekStart(now)
  const thisWeekEnd = getWeekEnd(now)
  const prevWeekStart = getWeekStart(new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))
  const prevWeekEnd = getWeekEnd(new Date(thisWeekStart.getTime() - 1))

  const isDipendente = role === 'dipendente'

  // Build task filters
  const taskWhereBase = {
    isDeleted: false,
    status: { notIn: CLOSED_TASK_STATUSES },
  }
  const taskWhere = isDipendente
    ? { ...taskWhereBase, assigneeId: userId }
    : taskWhereBase

  // Build time entry filters
  const timeWhere = (start: Date, end: Date) => ({
    isDeleted: false,
    startTime: { gte: start, lte: end },
    ...(isDipendente ? { userId } : {}),
  })

  const [
    activeProjects,
    prevActiveProjects,
    openTasks,
    prevWeekTasks,
    thisWeekTime,
    prevWeekTime,
    openRisksRaw,
    completedTasksThisWeek,
    teamMemberCount,
  ] = await Promise.all([
    // Active projects (current)
    prisma.project.count({
      where: {
        isDeleted: false,
        status: { notIn: INACTIVE_PROJECT_STATUSES },
      },
    }),
    // Active projects (previous week snapshot — count projects created before end of prev week that are still active)
    prisma.project.count({
      where: {
        isDeleted: false,
        status: { notIn: INACTIVE_PROJECT_STATUSES },
        createdAt: { lte: prevWeekEnd },
      },
    }),
    // Open tasks (current)
    prisma.task.count({ where: taskWhere }),
    // Open tasks (previous week — created before end of prev week)
    prisma.task.count({
      where: {
        ...taskWhere,
        createdAt: { lte: prevWeekEnd },
      },
    }),
    // This week time in minutes
    prisma.timeEntry.aggregate({
      where: timeWhere(thisWeekStart, thisWeekEnd),
      _sum: { duration: true },
    }),
    // Previous week time in minutes
    prisma.timeEntry.aggregate({
      where: timeWhere(prevWeekStart, prevWeekEnd),
      _sum: { duration: true },
    }),
    // Open risks (all) — fetch for JS filtering
    isDipendente
      ? Promise.resolve([] as Array<{ probability: number; impact: number }>)
      : prisma.risk.findMany({
          where: { isDeleted: false, status: 'open' },
          select: { probability: true, impact: true },
        }),
    // Tasks completed this week
    prisma.task.count({
      where: {
        isDeleted: false,
        status: 'done',
        updatedAt: { gte: thisWeekStart, lte: thisWeekEnd },
        ...(isDipendente ? { assigneeId: userId } : {}),
      },
    }),
    // Active team members
    prisma.user.count({
      where: { isDeleted: false, isActive: true },
    }),
  ])

  const thisWeekMinutes = thisWeekTime._sum.duration ?? 0
  const prevWeekMinutes = prevWeekTime._sum.duration ?? 0

  const criticalRisks = isDipendente
    ? 0
    : openRisksRaw.filter((r) => r.probability * r.impact >= RISK_CRITICAL_THRESHOLD).length

  const openRisks = isDipendente ? 0 : openRisksRaw.length

  const weeklyHours = Math.round((thisWeekMinutes / 60) * 100) / 100
  const prevWeeklyHours = Math.round((prevWeekMinutes / 60) * 100) / 100

  logger.info('Dashboard stats fetched', { userId, role })

  return {
    activeProjects,
    activeProjectsDelta: activeProjects - prevActiveProjects,
    openTasks,
    openTasksDelta: openTasks - prevWeekTasks,
    weeklyHours,
    weeklyHoursDelta: Math.round((weeklyHours - prevWeeklyHours) * 100) / 100,
    openRisks,
    criticalRisks,
    completedTasksThisWeek,
    teamMemberCount,
    budgetUsedPercent: null, // Budget tracking not yet implemented
  }
}

/**
 * Returns items that need attention: blocked tasks, tasks due soon, critical risks, stale reviews.
 * Dipendente only sees their own blocked/due tasks.
 */
export async function getAttentionItems(
  userId: string,
  role: string,
  limit: number
): Promise<AttentionItem[]> {
  const isDipendente = role === 'dipendente'
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const taskProjectSelect = {
    id: true,
    title: true,
    dueDate: true,
    blockedReason: true,
    project: { select: { id: true, name: true } },
  } as const

  const [blockedTasks, dueSoonTasks, openRisksRaw, staleDocs] = await Promise.all([
    // Blocked tasks
    prisma.task.findMany({
      where: {
        isDeleted: false,
        status: 'blocked',
        ...(isDipendente ? { assigneeId: userId } : {}),
      },
      select: taskProjectSelect,
      orderBy: { updatedAt: 'asc' },
      take: limit,
    }),
    // Tasks due within 24 hours
    prisma.task.findMany({
      where: {
        isDeleted: false,
        dueDate: { gte: now, lte: in24h },
        status: { notIn: CLOSED_TASK_STATUSES },
        ...(isDipendente ? { assigneeId: userId } : {}),
      },
      select: taskProjectSelect,
      orderBy: { dueDate: 'asc' },
      take: limit,
    }),
    // Open risks (for JS filtering) — omit for dipendente
    isDipendente
      ? Promise.resolve(
          [] as Array<{
            id: string
            title: string
            probability: number
            impact: number
            project: { id: string; name: string }
          }>
        )
      : prisma.risk.findMany({
          where: { isDeleted: false, status: 'open' },
          select: {
            id: true,
            title: true,
            probability: true,
            impact: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
    // Documents in review > 3 days — omit for dipendente
    isDipendente
      ? Promise.resolve(
          [] as Array<{
            id: string
            title: string
            updatedAt: Date
            project: { id: string; name: string }
          }>
        )
      : prisma.document.findMany({
          where: {
            isDeleted: false,
            status: 'review',
            updatedAt: { lt: threeDaysAgo },
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        }),
  ])

  const items: AttentionItem[] = []

  // 1. Blocked tasks (highest priority)
  for (const t of blockedTasks) {
    items.push({
      type: 'blocked_task',
      entityId: t.id,
      title: t.title,
      projectName: t.project?.name ?? null,
      projectId: t.project?.id ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      extra: t.blockedReason ?? null,
    })
  }

  // 2. Tasks due soon
  for (const t of dueSoonTasks) {
    items.push({
      type: 'due_soon',
      entityId: t.id,
      title: t.title,
      projectName: t.project?.name ?? null,
      projectId: t.project?.id ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      extra: null,
    })
  }

  // 3. Critical risks
  for (const r of openRisksRaw) {
    if (r.probability * r.impact >= RISK_CRITICAL_THRESHOLD) {
      items.push({
        type: 'critical_risk',
        entityId: r.id,
        title: r.title,
        projectName: r.project.name,
        projectId: r.project.id,
        dueDate: null,
        extra: `${r.probability}×${r.impact}=${r.probability * r.impact}`,
      })
    }
  }

  // 4. Documents pending review > 3 days
  for (const d of staleDocs) {
    const daysSince = Math.floor((now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    items.push({
      type: 'pending_review',
      entityId: d.id,
      title: d.title,
      projectName: d.project.name,
      projectId: d.project.id,
      dueDate: null,
      extra: `${daysSince}d in review`,
    })
  }

  return items.slice(0, limit)
}

/**
 * Returns today's logged minutes and the currently running timer entry for a user.
 */
export async function getTodayTotal(userId: string): Promise<TodayTotal> {
  const todayStart = getTodayStart()
  const todayEnd = getTodayEnd()

  const [todayAggregate, runningEntry] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: {
        userId,
        isDeleted: false,
        startTime: { gte: todayStart, lte: todayEnd },
      },
      _sum: { duration: true },
    }),
    prisma.timeEntry.findFirst({
      where: {
        userId,
        isRunning: true,
        isDeleted: false,
      },
      select: {
        id: true,
        taskId: true,
        startTime: true,
        task: { select: { title: true } },
      },
    }),
  ])

  return {
    todayMinutes: todayAggregate._sum.duration ?? 0,
    runningEntry: runningEntry
      ? {
          id: runningEntry.id,
          taskId: runningEntry.taskId,
          taskTitle: runningEntry.task.title,
          startedAt: runningEntry.startTime.toISOString(),
        }
      : null,
  }
}

/**
 * Returns the tasks assigned to a user that are relevant for today:
 * - Tasks currently in progress
 * - Tasks due today that are still in todo status
 * Ordered: in_progress first, then by dueDate ASC. Limit 10.
 */
export async function getMyTasksToday(userId: string): Promise<MyTaskToday[]> {
  const todayStart = getTodayStart()
  const todayEnd = getTodayEnd()

  const tasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      assigneeId: userId,
      OR: [
        { status: 'in_progress' },
        {
          status: 'todo',
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      isRecurring: true,
      recurrencePattern: true,
      project: { select: { id: true, name: true } },
    },
    take: 10,
  })

  // Sort: in_progress first, then dueDate ASC (nulls last)
  tasks.sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return 0
  })

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate?.toISOString() ?? null,
    isRecurring: t.isRecurring,
    recurrencePattern: t.recurrencePattern,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
  }))
}

/**
 * Returns recent audit log activity.
 * Dipendente sees only their own activity.
 * Returns entityName extracted from stored JSON data where available.
 */
export async function getRecentActivity(
  userId: string,
  role: string,
  limit: number
): Promise<ActivityItem[]> {
  const isDipendente = role === 'dipendente'

  const logs = await prisma.auditLog.findMany({
    where: isDipendente ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      newData: true,
      oldData: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityName: extractEntityName(log.newData, log.oldData),
    createdAt: log.createdAt.toISOString(),
    user: {
      id: log.user.id,
      firstName: log.user.firstName,
      lastName: log.user.lastName,
    },
  }))
}

export const dashboardService = {
  getStats,
  getAttentionItems,
  getTodayTotal,
  getMyTasksToday,
  getRecentActivity,
}
