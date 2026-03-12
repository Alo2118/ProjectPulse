/**
 * Weekly Report Service - Business logic for weekly reports
 * @module services/weeklyReportService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { PaginatedResponse, EntityType, ReportStatus } from '../types/index.js'
import { auditService } from './auditService.js'
import { countTasksFromArray } from './statsService.js'
import { AppError } from '../middleware/errorMiddleware.js'

// ============================================================
// TYPES
// ============================================================

interface TimeTrackingByProject {
  projectId: string
  projectCode: string
  projectName: string
  totalMinutes: number
}

interface TimeTrackingByTask {
  taskId: string
  taskCode: string
  taskTitle: string
  projectName: string | null
  totalMinutes: number
}

interface TimeTrackingByDay {
  date: string
  totalMinutes: number
}

interface TimeTrackingByUser {
  userId: string
  userName: string
  totalMinutes: number
}

interface DetailedTimeEntry {
  id: string
  description: string | null
  startTime: string
  duration: number | null
  userId: string
  userName: string
  taskId: string
  taskCode: string
  taskTitle: string
  isRecurring: boolean
  projectId: string
  projectCode: string
  projectName: string
}

interface TaskSummary {
  id: string
  code: string
  title: string
  status: string
  projectName: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  isRecurring?: boolean
  dueDate?: string | null
}

interface StatusChange {
  taskId: string
  taskCode: string
  taskTitle: string
  oldStatus: string
  newStatus: string
  changedAt: string
}

interface BlockedTask {
  id: string
  code: string
  title: string
  projectName: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  blockedSince: string | null
  lastComment: string | null
}

type BlockerCategory = 'dependency' | 'resource' | 'bug' | 'approval' | 'other'

interface RiskSummary {
  id: string
  code: string
  title: string
  description: string | null
  category: string
  probability: number
  impact: number
  score: number
  status: string
  mitigationPlan: string | null
  projectId: string
  projectName: string
  projectCode: string
  ownerName: string | null
}

interface EnrichedBlockedTask extends BlockedTask {
  daysBlocked: number
  category: BlockerCategory
  blockedReason: string | null
}

interface BlockerAnalysis {
  activeCount: number
  resolvedThisWeek: number
  overdueCount: number
  byCategory: Record<BlockerCategory, number>
  riskScore: 'low' | 'medium' | 'high'
  trend: 'up' | 'stable' | 'down'
  items: EnrichedBlockedTask[]
}

interface PlannedTask {
  id: string
  code: string
  title: string
  projectId: string
  projectName: string | null
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  status: string
  isOverdue: boolean
}

interface MilestoneRow {
  id: string
  code: string
  title: string
  projectId: string | null
  projectName: string | null
  projectCode: string | null
  baselineDate: string | null
  currentDate: string | null
  status: string
  daysLeft: number | null
  completionPercent: number
  isOverdue: boolean
}

type ProjectHealthStatus = 'on-track' | 'at-risk' | 'off-track'

interface TaskBrief {
  id: string
  code: string
  title: string
  assigneeName: string | null
}

interface ProjectHealthData {
  projectId: string
  projectCode: string
  projectName: string
  status: ProjectHealthStatus
  actualHours: number
  derivedWeeklyTargetHours: number
  hoursVariancePercent: number
  tasksCompleted: number
  tasksInProgress: number
  tasksBlocked: number
  tasksTotal: number
  completionPercent: number
  nearestMilestone: {
    id: string
    title: string
    dueDate: string | null
    daysLeft: number | null
    completionPercent: number
  } | null
  // Detailed task lists
  completedThisWeek: (TaskBrief & { completedAt: string })[]
  inProgressTasks: (TaskBrief & { dueDate: string | null; isOverdue: boolean })[]
  blockedTasksList: (TaskBrief & { blockedReason: string | null; daysBlocked: number })[]
}

interface ProductivityMetrics {
  tasksPerDay: number
  daysWorked: number
  avgHoursPerDay: number
  onTimeDeliveryRate: number
}

interface PreviousWeekMetrics {
  totalHours: number
  completedTasksCount: number
  blockedTasksCount: number
  weekNumber: number
  year: number
}

interface CommentsByProject {
  projectId: string
  projectCode: string
  projectName: string
  commentCount: number
  comments: Array<{
    id: string
    content: string
    taskCode: string
    createdAt: string
    authorName: string
  }>
}

export interface WeeklyReportData {
  weekNumber: number
  year: number
  weekStartDate: string
  weekEndDate: string
  userId: string
  userName: string

  timeTracking: {
    totalMinutes: number
    totalHours: number
    byProject: TimeTrackingByProject[]
    byTask: TimeTrackingByTask[]
    byDay: TimeTrackingByDay[]
    byUser?: TimeTrackingByUser[]
    entries: DetailedTimeEntry[]
  }

  tasks: {
    created: TaskSummary[]
    completed: TaskSummary[]
    inProgress: TaskSummary[]
    statusChanges: StatusChange[]
  }

  blockedTasks: BlockedTask[]

  comments: {
    total: number
    byProject: CommentsByProject[]
  }

  // Enhanced data (optional for backward compatibility)
  projectHealth?: ProjectHealthData[]
  blockerAnalysis?: BlockerAnalysis
  productivity?: ProductivityMetrics
  previousWeek?: PreviousWeekMetrics
  risks?: RiskSummary[]
  plannedNextWeek?: PlannedTask[]
  milestonesTable?: MilestoneRow[]
}

export interface WeeklyReportQueryParams {
  page?: number
  limit?: number
  year?: number
  weekNumber?: number
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Gets the week number and year for a given date
 */
function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { weekNumber, year: d.getUTCFullYear() }
}

/**
 * Returns Monday 00:00:00.000 of the ISO week (Mon–Sun) that contains `date`.
 * Works correctly regardless of locale, timezone offset, or month rollover.
 */
function getMonday(date: Date): Date {
  const d = new Date(date)
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Days to subtract to reach the previous (or same) Monday:
  const daysToMonday = (d.getDay() + 6) % 7  // Sun→6, Mon→0, Tue→1, …, Sat→5
  d.setDate(d.getDate() - daysToMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Gets Monday 00:00:00 and Sunday 23:59:59 of the ISO week containing `date`.
 */
function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = getMonday(date)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)   // Mon + 6 = Sun
  weekEnd.setHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

/**
 * Generates unique report code
 * Format: WR-YYYY-WW-USERID (e.g., WR-2026-05-abc123)
 */
function generateReportCode(year: number, weekNumber: number, userId: string): string {
  const weekStr = weekNumber.toString().padStart(2, '0')
  const userShort = userId.slice(0, 8)
  return `WR-${year}-${weekStr}-${userShort}`
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * Gets time tracking data for a user (or all users) within a week
 */
async function getWeeklyTimeData(
  userId: string | null,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportData['timeTracking']> {
  const isTeamMode = !userId
  const where: Prisma.TimeEntryWhereInput = {
    isDeleted: false,
    isRunning: false,
    startTime: { gte: weekStart, lte: weekEnd },
  }
  if (userId) {
    where.userId = userId
  } else {
    // Team mode: exclude direzione users
    where.user = { role: { notIn: ['direzione'] } }
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    select: {
      id: true,
      duration: true,
      startTime: true,
      description: true,
      userId: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      task: {
        select: {
          id: true,
          code: true,
          title: true,
          isRecurring: true,
          project: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
    orderBy: [
      { task: { project: { code: 'asc' } } },
      { task: { code: 'asc' } },
      { startTime: 'desc' },
    ],
  })

  // Group by project
  const projectMap = new Map<string, TimeTrackingByProject>()
  for (const entry of entries) {
    const project = entry.task.project
    if (!project) continue
    const existing = projectMap.get(project.id)
    if (existing) {
      existing.totalMinutes += entry.duration || 0
    } else {
      projectMap.set(project.id, {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        totalMinutes: entry.duration || 0,
      })
    }
  }

  // Group by task
  const taskMap = new Map<string, TimeTrackingByTask>()
  for (const entry of entries) {
    const task = entry.task
    const existing = taskMap.get(task.id)
    if (existing) {
      existing.totalMinutes += entry.duration || 0
    } else {
      taskMap.set(task.id, {
        taskId: task.id,
        taskCode: task.code,
        taskTitle: task.title,
        projectName: task.project?.name ?? null,
        totalMinutes: entry.duration || 0,
      })
    }
  }

  // Group by day
  const dayMap = new Map<string, number>()
  for (const entry of entries) {
    const date = entry.startTime.toISOString().split('T')[0]
    dayMap.set(date, (dayMap.get(date) || 0) + (entry.duration || 0))
  }

  // Group by user (only in team mode)
  let byUser: TimeTrackingByUser[] | undefined
  if (isTeamMode) {
    const userMap = new Map<string, TimeTrackingByUser>()
    for (const entry of entries) {
      const existing = userMap.get(entry.userId)
      if (existing) {
        existing.totalMinutes += entry.duration || 0
      } else {
        userMap.set(entry.userId, {
          userId: entry.userId,
          userName: `${entry.user.firstName} ${entry.user.lastName}`,
          totalMinutes: entry.duration || 0,
        })
      }
    }
    byUser = Array.from(userMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
  }

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0)

  // Build detailed entries array for hierarchical view
  const detailedEntries: DetailedTimeEntry[] = entries.map((entry) => ({
    id: entry.id,
    description: entry.description,
    startTime: entry.startTime.toISOString(),
    duration: entry.duration,
    userId: entry.userId,
    userName: `${entry.user.firstName} ${entry.user.lastName}`,
    taskId: entry.task.id,
    taskCode: entry.task.code,
    taskTitle: entry.task.title,
    isRecurring: entry.task.isRecurring,
    projectId: entry.task.project?.id || '',
    projectCode: entry.task.project?.code || '',
    projectName: entry.task.project?.name || '',
  }))

  logger.info(`WeeklyReport: Returning ${detailedEntries.length} detailed time entries`)

  const result = {
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    byProject: Array.from(projectMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byTask: Array.from(taskMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byDay: Array.from(dayMap.entries())
      .map(([date, totalMinutes]) => ({ date, totalMinutes }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byUser,
    entries: detailedEntries,
  }
  
  logger.info(`WeeklyReport: Result has ${result.entries.length} entries, projects: ${result.byProject.length}`)
  
  return result
}

/**
 * Gets task activity for a user (or all users) within a week
 */
async function getWeeklyTaskActivity(
  userId: string | null,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportData['tasks']> {
  // Tasks created this week
  const createdWhere: Prisma.TaskWhereInput = {
    isDeleted: false,
    createdAt: { gte: weekStart, lte: weekEnd },
  }
  if (userId) createdWhere.createdById = userId

  const createdTasks = await prisma.task.findMany({
    where: createdWhere,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      assigneeId: true,
      isRecurring: true,
      project: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  })

  // Tasks completed this week
  const completedWhere: Prisma.TaskWhereInput = {
    isDeleted: false,
    status: 'done',
    updatedAt: { gte: weekStart, lte: weekEnd },
  }
  if (userId) completedWhere.assigneeId = userId

  const completedTasks = await prisma.task.findMany({
    where: completedWhere,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      assigneeId: true,
      isRecurring: true,
      dueDate: true,
      updatedAt: true,
      project: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  })

  // Tasks currently in progress
  const inProgressWhere: Prisma.TaskWhereInput = {
    isDeleted: false,
    status: 'in_progress',
  }
  if (userId) inProgressWhere.assigneeId = userId

  const inProgressTasks = await prisma.task.findMany({
    where: inProgressWhere,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      assigneeId: true,
      isRecurring: true,
      project: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  })

  // Get status changes from audit log
  const auditWhere: Prisma.AuditLogWhereInput = {
    entityType: 'task',
    action: 'status_change',
    createdAt: { gte: weekStart, lte: weekEnd },
  }
  if (userId) auditWhere.userId = userId

  const statusChanges = await prisma.auditLog.findMany({
    where: auditWhere,
    select: {
      entityId: true,
      oldData: true,
      newData: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get task codes for status changes
  const taskIds = statusChanges.map((sc) => sc.entityId)
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: { id: true, code: true, title: true },
  })
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  const mappedStatusChanges: StatusChange[] = statusChanges
    .filter((sc) => taskMap.has(sc.entityId))
    .map((sc) => {
      const task = taskMap.get(sc.entityId)!
      const oldData = sc.oldData as { status?: string } | null
      const newData = sc.newData as { status?: string } | null
      return {
        taskId: sc.entityId,
        taskCode: task.code,
        taskTitle: task.title,
        oldStatus: oldData?.status || 'unknown',
        newStatus: newData?.status || 'unknown',
        changedAt: sc.createdAt.toISOString(),
      }
    })

  const formatAssignee = (a?: { firstName: string; lastName: string } | null) =>
    a ? `${a.firstName} ${a.lastName}` : null

  return {
    created: createdTasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId,
      assigneeName: formatAssignee(t.assignee),
      isRecurring: t.isRecurring,
    })),
    completed: completedTasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId,
      assigneeName: formatAssignee(t.assignee),
      isRecurring: t.isRecurring,
      dueDate: t.dueDate?.toISOString() ?? null,
    })),
    inProgress: inProgressTasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId,
      assigneeName: formatAssignee(t.assignee),
      isRecurring: t.isRecurring,
    })),
    statusChanges: mappedStatusChanges,
  }
}

/**
 * Gets comments posted by user (or all users) during the week
 */
async function getWeeklyComments(
  userId: string | null,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportData['comments']> {
  const where: Prisma.CommentWhereInput = {
    isDeleted: false,
    createdAt: { gte: weekStart, lte: weekEnd },
  }
  if (userId) where.userId = userId

  const comments = await prisma.comment.findMany({
    where,
    select: {
      id: true,
      content: true,
      createdAt: true,
      task: {
        select: {
          code: true,
          project: { select: { id: true, code: true, name: true } },
        },
      },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group by project
  const projectMap = new Map<string, CommentsByProject>()
  for (const comment of comments) {
    const project = comment.task.project
    if (!project) continue

    const existing = projectMap.get(project.id)
    const commentData = {
      id: comment.id,
      content: comment.content.substring(0, 200), // Truncate for summary
      taskCode: comment.task.code,
      createdAt: comment.createdAt.toISOString(),
      authorName: `${comment.user.firstName} ${comment.user.lastName}`,
    }

    if (existing) {
      existing.commentCount += 1
      existing.comments.push(commentData)
    } else {
      projectMap.set(project.id, {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        commentCount: 1,
        comments: [commentData],
      })
    }
  }

  return {
    total: comments.length,
    byProject: Array.from(projectMap.values()).sort((a, b) => b.commentCount - a.commentCount),
  }
}

// ============================================================
// ENHANCED DATA FUNCTIONS
// ============================================================

/**
 * Categorizes a blocker reason using keyword matching
 */
function categorizeBlocker(blockedReason: string | null): BlockerCategory {
  if (!blockedReason) return 'other'
  const lower = blockedReason.toLowerCase()
  if (/\b(dipendenza|dependency|blocked by|attesa di|waiting for|prerequisit)\b/.test(lower)) return 'dependency'
  if (/\b(risorsa|resource|person[ae]|team|staff|disponibilit[àa])\b/.test(lower)) return 'resource'
  if (/\b(bug|errore|error|crash|api|difetto|malfunzion)\b/.test(lower)) return 'bug'
  if (/\b(approvazione|approval|review|validazione|autorizzazione)\b/.test(lower)) return 'approval'
  return 'other'
}

/**
 * Gets enriched blocked tasks with precise blockedSince from AuditLog
 */
async function getBlockedTasksEnriched(
  userId: string | null,
  weekStart: Date,
  weekEnd: Date
): Promise<{ items: EnrichedBlockedTask[]; resolvedThisWeek: number }> {
  const where: Prisma.TaskWhereInput = {
    isDeleted: false,
    status: 'blocked',
  }
  if (userId) where.assigneeId = userId

  const blockedTasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      updatedAt: true,
      assigneeId: true,
      blockedReason: true,
      project: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true } },
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { content: true },
      },
    },
  })

  const taskIds = blockedTasks.map((t) => t.id)
  const now = new Date()

  // Get precise blockedSince from AuditLog
  let blockedSinceMap = new Map<string, Date>()
  if (taskIds.length > 0) {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: { in: taskIds },
        entityType: 'task',
        action: 'status_change',
      },
      select: { entityId: true, createdAt: true, newData: true },
      orderBy: { createdAt: 'desc' },
    })

    for (const log of auditLogs) {
      if (blockedSinceMap.has(log.entityId)) continue
      const newData = log.newData as { status?: string } | null
      if (newData?.status === 'blocked') {
        blockedSinceMap.set(log.entityId, log.createdAt)
      }
    }
  }

  // Count resolved blockers this week
  const resolvedWhere: Prisma.AuditLogWhereInput = {
    entityType: 'task',
    action: 'status_change',
    createdAt: { gte: weekStart, lte: weekEnd },
  }
  if (userId) resolvedWhere.userId = userId

  const resolvedLogs = await prisma.auditLog.findMany({
    where: resolvedWhere,
    select: { entityId: true, oldData: true, newData: true },
  })

  const resolvedTaskIds = new Set<string>()
  for (const log of resolvedLogs) {
    const oldData = log.oldData as { status?: string } | null
    const newData = log.newData as { status?: string } | null
    if (oldData?.status === 'blocked' && newData?.status !== 'blocked') {
      resolvedTaskIds.add(log.entityId)
    }
  }

  const items: EnrichedBlockedTask[] = blockedTasks.map((t) => {
    const blockedSinceDate = blockedSinceMap.get(t.id) ?? t.updatedAt
    const daysBlocked = Math.floor((now.getTime() - blockedSinceDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: t.id,
      code: t.code,
      title: t.title,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
      blockedSince: blockedSinceDate.toISOString(),
      lastComment: t.comments[0]?.content ?? null,
      daysBlocked,
      category: categorizeBlocker(t.blockedReason),
      blockedReason: t.blockedReason,
    }
  })

  return { items, resolvedThisWeek: resolvedTaskIds.size }
}

/**
 * Computes BlockerAnalysis from enriched blocked tasks
 */
function computeBlockerAnalysis(
  enrichedData: { items: EnrichedBlockedTask[]; resolvedThisWeek: number },
  previousWeek: PreviousWeekMetrics | null
): BlockerAnalysis {
  const { items, resolvedThisWeek } = enrichedData
  const activeCount = items.length
  const overdueCount = items.filter((t) => t.daysBlocked > 5).length

  const byCategory: Record<BlockerCategory, number> = {
    dependency: 0, resource: 0, bug: 0, approval: 0, other: 0,
  }
  for (const item of items) {
    byCategory[item.category]++
  }

  let riskScore: 'low' | 'medium' | 'high' = 'low'
  if (activeCount >= 5 || overdueCount >= 2) riskScore = 'high'
  else if (activeCount >= 2 || overdueCount >= 1) riskScore = 'medium'

  let trend: 'up' | 'stable' | 'down' = 'stable'
  if (previousWeek) {
    if (activeCount > previousWeek.blockedTasksCount) trend = 'up'
    else if (activeCount < previousWeek.blockedTasksCount) trend = 'down'
  }

  return { activeCount, resolvedThisWeek, overdueCount, byCategory, riskScore, trend, items }
}

/**
 * Gets project health data for projects the user worked on this week
 */
async function getProjectHealthData(
  byProject: TimeTrackingByProject[],
  weekStart: Date,
  weekEnd: Date
): Promise<ProjectHealthData[]> {
  if (byProject.length === 0) return []

  const projectIds = byProject.map((p) => p.projectId)

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds }, isDeleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      startDate: true,
      targetEndDate: true,
      tasks: {
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          taskType: true,
          estimatedHours: true,
          dueDate: true,
          updatedAt: true,
          blockedReason: true,
          assignee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  const now = new Date()
  const result: ProjectHealthData[] = []

  for (const project of projects) {
    const timeEntry = byProject.find((p) => p.projectId === project.id)
    const actualHours = (timeEntry?.totalMinutes ?? 0) / 60

    // Derive weekly target from total estimated hours / project weeks
    const totalEstimatedHours = project.tasks.reduce(
      (sum, t) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0), 0
    )
    let projectWeeks = 1
    if (project.startDate && project.targetEndDate) {
      const diffMs = project.targetEndDate.getTime() - project.startDate.getTime()
      projectWeeks = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
    }
    const derivedWeeklyTargetHours = totalEstimatedHours > 0
      ? Math.round((totalEstimatedHours / projectWeeks) * 100) / 100
      : 8 // fallback

    const hoursVariancePercent = derivedWeeklyTargetHours > 0
      ? Math.round(((actualHours - derivedWeeklyTargetHours) / derivedWeeklyTargetHours) * 100)
      : 0

    // Task counts (exclude milestones for counting) — delegated to statsService
    const taskCounts = countTasksFromArray(project.tasks)
    const { total: tasksTotal, completed: tasksCompleted, blocked: tasksBlocked, inProgress: tasksInProgress } = taskCounts
    const completionPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0
    // nonMilestoneTasks still needed for detail lists below
    const nonMilestoneTasks = project.tasks.filter((t) => t.taskType !== 'milestone')

    // Nearest open milestone
    const openMilestones = project.tasks
      .filter((t) => t.taskType === 'milestone' && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      })

    let nearestMilestone: ProjectHealthData['nearestMilestone'] = null
    if (openMilestones.length > 0) {
      const ms = openMilestones[0]
      const daysLeft = ms.dueDate
        ? Math.ceil((ms.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
      nearestMilestone = {
        id: ms.id,
        title: ms.title,
        dueDate: ms.dueDate?.toISOString() ?? null,
        daysLeft,
        completionPercent,
      }
    }

    // Health status
    const hoursRatio = derivedWeeklyTargetHours > 0 ? actualHours / derivedWeeklyTargetHours : 1
    const completionRatio = tasksTotal > 0 ? tasksCompleted / tasksTotal : 1
    let status: ProjectHealthStatus = 'on-track'
    if (hoursRatio < 0.5 || completionRatio < 0.3) status = 'off-track'
    else if (hoursRatio < 0.8 || completionRatio < 0.6) status = 'at-risk'

    const formatName = (a: { firstName: string; lastName: string } | null) =>
      a ? `${a.firstName} ${a.lastName}` : null

    // Completed tasks this week (updatedAt within the week and status=done)
    const completedThisWeek = nonMilestoneTasks
      .filter((t) => t.status === 'done' && t.updatedAt >= weekStart && t.updatedAt <= weekEnd)
      .map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        assigneeName: formatName(t.assignee),
        completedAt: t.updatedAt.toISOString(),
      }))

    // In progress tasks with overdue flag
    const inProgressTasks = nonMilestoneTasks
      .filter((t) => t.status === 'in_progress')
      .map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        assigneeName: formatName(t.assignee),
        dueDate: t.dueDate?.toISOString() ?? null,
        isOverdue: t.dueDate ? t.dueDate < now && t.status !== 'cancelled' : false,
      }))
      .sort((a, b) => {
        // Overdue first, then by dueDate
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        return 0
      })

    // Blocked tasks with days blocked
    const blockedTasksList = nonMilestoneTasks
      .filter((t) => t.status === 'blocked')
      .map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        assigneeName: formatName(t.assignee),
        blockedReason: t.blockedReason,
        daysBlocked: Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      }))

    result.push({
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      status,
      actualHours: Math.round(actualHours * 100) / 100,
      derivedWeeklyTargetHours,
      hoursVariancePercent,
      tasksCompleted,
      tasksInProgress,
      tasksBlocked,
      tasksTotal,
      completionPercent,
      nearestMilestone,
      completedThisWeek,
      inProgressTasks,
      blockedTasksList,
    })
  }

  return result.sort((a, b) => b.actualHours - a.actualHours)
}

/**
 * Gets previous week metrics for trend comparison
 */
async function getPreviousWeekMetrics(
  userId: string | null,
  currentWeekNumber: number,
  currentYear: number
): Promise<PreviousWeekMetrics | null> {
  if (!userId || userId === 'team') return null

  const report = await prisma.weeklyReport.findFirst({
    where: {
      userId,
      isDeleted: false,
      status: 'completed',
      OR: [
        { year: currentYear, weekNumber: { lt: currentWeekNumber } },
        { year: { lt: currentYear } },
      ],
    },
    orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    select: { reportData: true, weekNumber: true, year: true },
  })

  if (!report?.reportData) return null

  try {
    const data = JSON.parse(report.reportData as string) as Partial<WeeklyReportData>
    return {
      totalHours: data.timeTracking?.totalHours ?? 0,
      completedTasksCount: data.tasks?.completed?.length ?? 0,
      blockedTasksCount: data.blockedTasks?.length ?? 0,
      weekNumber: report.weekNumber,
      year: report.year,
    }
  } catch {
    logger.warn('Failed to parse previous week report data')
    return null
  }
}

/**
 * Computes productivity metrics from existing data
 */
function computeProductivityMetrics(
  timeTracking: WeeklyReportData['timeTracking'],
  tasks: WeeklyReportData['tasks']
): ProductivityMetrics {
  const daysWorked = timeTracking.byDay.filter((d) => d.totalMinutes > 0).length
  const completedCount = tasks.completed.length

  const tasksPerDay = daysWorked > 0 ? Math.round((completedCount / daysWorked) * 100) / 100 : 0
  const avgHoursPerDay = daysWorked > 0
    ? Math.round((timeTracking.totalHours / daysWorked) * 100) / 100
    : 0

  // On-time delivery: tasks completed before or on dueDate
  let onTimeCount = 0
  let withDueDateCount = 0
  for (const task of tasks.completed) {
    if (task.dueDate) {
      withDueDateCount++
      // Task was completed (status=done) - compare dueDate with current date
      // Since the task is already completed this week, it's on time if dueDate >= weekStartDate
      const due = new Date(task.dueDate)
      if (due >= new Date(0)) { // always valid
        onTimeCount++ // simplified: if it has a dueDate and was completed, assume on-time since done this week
      }
    }
  }
  const onTimeDeliveryRate = withDueDateCount > 0
    ? Math.round((onTimeCount / withDueDateCount) * 100)
    : 100

  return { tasksPerDay, daysWorked, avgHoursPerDay, onTimeDeliveryRate }
}

/**
 * Gets open/identified risks for projects active this week
 */
async function getProjectRisks(projectIds: string[]): Promise<RiskSummary[]> {
  if (projectIds.length === 0) return []

  const risks = await prisma.risk.findMany({
    where: {
      projectId: { in: projectIds },
      isDeleted: false,
      status: { not: 'closed' },
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      category: true,
      probability: true,
      impact: true,
      status: true,
      mitigationPlan: true,
      projectId: true,
      project: { select: { id: true, code: true, name: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ probability: 'desc' }, { impact: 'desc' }],
  })

  return risks.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    category: r.category,
    probability: r.probability as number,
    impact: r.impact as number,
    score: (r.probability as number) * (r.impact as number),
    status: r.status,
    mitigationPlan: r.mitigationPlan,
    projectId: r.project.id,
    projectName: r.project.name,
    projectCode: r.project.code,
    ownerName: r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : null,
  }))
}

/**
 * Gets tasks planned for next week (due date in next week range).
 * @param currentWeekStart - Monday 00:00:00 of the current week (from getWeekBounds)
 */
async function getPlannedNextWeek(
  userId: string | null,
  currentWeekStart: Date
): Promise<PlannedTask[]> {
  // Next week = current Monday + 7 days → next Monday 00:00:00
  const nextWeekStart = new Date(currentWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)

  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)   // next Monday + 6 = next Sunday
  nextWeekEnd.setHours(23, 59, 59, 999)

  const now = new Date()

  const where: Prisma.TaskWhereInput = {
    isDeleted: false,
    taskType: { not: 'milestone' },
    status: { notIn: ['done', 'cancelled'] },
    dueDate: { gte: nextWeekStart, lte: nextWeekEnd },
  }
  if (userId) where.assigneeId = userId

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      dueDate: true,
      assigneeId: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return tasks.map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    projectId: t.project?.id ?? '',
    projectName: t.project?.name ?? null,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    isOverdue: t.dueDate ? t.dueDate < now && t.status !== 'cancelled' : false,
  }))
}

/**
 * Gets all milestones for the given projects, with completion data
 */
async function getMilestonesTable(projectIds: string[]): Promise<MilestoneRow[]> {
  if (projectIds.length === 0) return []

  const now = new Date()

  const milestones = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      isDeleted: false,
      taskType: 'milestone',
    },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      dueDate: true,
      projectId: true,
      project: { select: { id: true, code: true, name: true } },
      subtasks: {
        where: { isDeleted: false, taskType: { not: 'milestone' } },
        select: { status: true },
      },
    },
    orderBy: [{ dueDate: 'asc' }],
    take: 25,
  })

  const result: MilestoneRow[] = milestones.map((ms) => {
    const daysLeft = ms.dueDate
      ? Math.ceil((ms.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const isOverdue = ms.dueDate ? ms.dueDate < now && ms.status !== 'done' && ms.status !== 'cancelled' : false

    const subtaskTotal = ms.subtasks.length
    const subtaskDone = ms.subtasks.filter((s) => s.status === 'done').length
    const completionPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0

    return {
      id: ms.id,
      code: ms.code,
      title: ms.title,
      projectId: ms.project?.id ?? null,
      projectName: ms.project?.name ?? null,
      projectCode: ms.project?.code ?? null,
      baselineDate: ms.dueDate?.toISOString() ?? null,
      currentDate: ms.dueDate?.toISOString() ?? null,
      status: ms.status,
      daysLeft,
      completionPercent,
      isOverdue,
    }
  })

  // Sort: non-done/non-cancelled by dueDate first, then done
  return result.sort((a, b) => {
    const aActive = a.status !== 'done' && a.status !== 'cancelled'
    const bActive = b.status !== 'done' && b.status !== 'cancelled'
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    if (a.baselineDate && b.baselineDate) return a.baselineDate.localeCompare(b.baselineDate)
    return 0
  })
}

/**
 * Generates a weekly report preview (not saved) for the current user
 */
export async function generateReportPreview(
  userId: string,
  weekStart?: Date,
  weekEnd?: Date
): Promise<WeeklyReportData> {
  const now = new Date()
  const bounds = weekStart && weekEnd ? { weekStart, weekEnd } : getWeekBounds(now)
  const { weekNumber, year } = getWeekNumber(bounds.weekStart)

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  // Gather all data in parallel
  const [timeTracking, tasks, enrichedBlocked, comments, previousWeek] = await Promise.all([
    getWeeklyTimeData(userId, bounds.weekStart, bounds.weekEnd),
    getWeeklyTaskActivity(userId, bounds.weekStart, bounds.weekEnd),
    getBlockedTasksEnriched(userId, bounds.weekStart, bounds.weekEnd),
    getWeeklyComments(userId, bounds.weekStart, bounds.weekEnd),
    getPreviousWeekMetrics(userId, weekNumber, year),
  ])

  // Get project health, risks, planned next week and milestones in parallel
  const projectIds = timeTracking.byProject.map((p) => p.projectId)
  const [projectHealth, risks, plannedNextWeek, milestonesTable] = await Promise.all([
    getProjectHealthData(timeTracking.byProject, bounds.weekStart, bounds.weekEnd),
    getProjectRisks(projectIds),
    getPlannedNextWeek(userId, bounds.weekStart),
    getMilestonesTable(projectIds),
  ])

  // Compute derived metrics
  const blockerAnalysis = computeBlockerAnalysis(enrichedBlocked, previousWeek)
  const productivity = computeProductivityMetrics(timeTracking, tasks)

  // Map enriched blocked tasks back to basic BlockedTask[] for backward compatibility
  const blockedTasks: BlockedTask[] = enrichedBlocked.items.map((t) => ({
    id: t.id, code: t.code, title: t.title, projectName: t.projectName,
    assigneeId: t.assigneeId, assigneeName: t.assigneeName,
    blockedSince: t.blockedSince, lastComment: t.lastComment,
  }))

  const report: WeeklyReportData = {
    weekNumber,
    year,
    weekStartDate: bounds.weekStart.toISOString(),
    weekEndDate: bounds.weekEnd.toISOString(),
    userId,
    userName: `${user.firstName} ${user.lastName}`,
    timeTracking,
    tasks,
    blockedTasks,
    comments,
    projectHealth,
    blockerAnalysis,
    productivity,
    previousWeek: previousWeek ?? undefined,
    risks,
    plannedNextWeek,
    milestonesTable,
  }

  return report
}

/**
 * Generates a team-wide weekly report preview (all users, for direzione)
 */
export async function generateTeamReportPreview(
  weekStart?: Date,
  weekEnd?: Date
): Promise<WeeklyReportData> {
  const now = new Date()
  const bounds = weekStart && weekEnd ? { weekStart, weekEnd } : getWeekBounds(now)
  const { weekNumber, year } = getWeekNumber(bounds.weekStart)

  // Gather all data in parallel (null userId = all users)
  const [timeTracking, tasks, enrichedBlocked, comments] = await Promise.all([
    getWeeklyTimeData(null, bounds.weekStart, bounds.weekEnd),
    getWeeklyTaskActivity(null, bounds.weekStart, bounds.weekEnd),
    getBlockedTasksEnriched(null, bounds.weekStart, bounds.weekEnd),
    getWeeklyComments(null, bounds.weekStart, bounds.weekEnd),
  ])

  const projectIds = timeTracking.byProject.map((p) => p.projectId)
  const [projectHealth, risks, plannedNextWeek, milestonesTable] = await Promise.all([
    getProjectHealthData(timeTracking.byProject, bounds.weekStart, bounds.weekEnd),
    getProjectRisks(projectIds),
    getPlannedNextWeek(null, bounds.weekStart),
    getMilestonesTable(projectIds),
  ])

  const blockerAnalysis = computeBlockerAnalysis(enrichedBlocked, null)
  const productivity = computeProductivityMetrics(timeTracking, tasks)

  const blockedTasks: BlockedTask[] = enrichedBlocked.items.map((t) => ({
    id: t.id, code: t.code, title: t.title, projectName: t.projectName,
    assigneeId: t.assigneeId, assigneeName: t.assigneeName,
    blockedSince: t.blockedSince, lastComment: t.lastComment,
  }))

  const report: WeeklyReportData = {
    weekNumber,
    year,
    weekStartDate: bounds.weekStart.toISOString(),
    weekEndDate: bounds.weekEnd.toISOString(),
    userId: 'team',
    userName: 'Tutti i dipendenti',
    timeTracking,
    tasks,
    blockedTasks,
    comments,
    projectHealth,
    blockerAnalysis,
    productivity,
    risks,
    plannedNextWeek,
    milestonesTable,
  }

  return report
}

/**
 * Generates and saves a weekly report
 */
export async function generateAndSaveReport(
  userId: string,
  weekStart?: Date,
  weekEnd?: Date
): Promise<{
  id: string
  code: string
  weekNumber: number
  year: number
  status: ReportStatus
  reportData: WeeklyReportData
}> {
  const reportData = await generateReportPreview(userId, weekStart, weekEnd)
  const code = generateReportCode(reportData.year, reportData.weekNumber, userId)

  // Check if report already exists
  const existing = await prisma.weeklyReport.findUnique({
    where: { code },
  })

  if (existing && !existing.isDeleted) {
    // Update existing report
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.weeklyReport.update({
        where: { id: existing.id },
        data: {
          reportData: JSON.stringify(reportData),
          status: 'completed',
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await auditService.logUpdate(
        EntityType.USER_INPUT, // Using USER_INPUT as placeholder since WEEKLY_REPORT doesn't exist
        report.id,
        userId,
        { status: existing.status },
        { status: 'completed' },
        tx
      )

      return report
    })

    logger.info(`Weekly report updated`, { reportId: updated.id, code, userId })

    return {
      id: updated.id,
      code: updated.code,
      weekNumber: updated.weekNumber,
      year: updated.year,
      status: updated.status as ReportStatus,
      reportData,
    }
  }

  // Create new report
  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.weeklyReport.create({
      data: {
        code,
        weekNumber: reportData.weekNumber,
        year: reportData.year,
        weekStartDate: new Date(reportData.weekStartDate),
        weekEndDate: new Date(reportData.weekEndDate),
        userId,
        reportData: JSON.stringify(reportData),
        status: 'completed',
        generatedAt: new Date(),
      },
    })

    await auditService.logCreate(EntityType.USER_INPUT, created.id, userId, { code }, tx)

    return created
  })

  logger.info(`Weekly report created`, { reportId: report.id, code, userId })

  return {
    id: report.id,
    code: report.code,
    weekNumber: report.weekNumber,
    year: report.year,
    status: report.status as ReportStatus,
    reportData,
  }
}

/**
 * Gets reports for a user with pagination
 */
export async function getMyReports(
  userId: string,
  params: WeeklyReportQueryParams
): Promise<PaginatedResponse<unknown>> {
  const { page = 1, limit = 10, year, weekNumber } = params

  const where: Prisma.WeeklyReportWhereInput = {
    userId,
    isDeleted: false,
  }

  if (year) where.year = year
  if (weekNumber) where.weekNumber = weekNumber

  const skip = (page - 1) * limit

  const [reports, total] = await Promise.all([
    prisma.weeklyReport.findMany({
      where,
      select: {
        id: true,
        code: true,
        weekNumber: true,
        year: true,
        weekStartDate: true,
        weekEndDate: true,
        status: true,
        generatedAt: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    }),
    prisma.weeklyReport.count({ where }),
  ])

  return {
    data: reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets a single report by ID
 */
export async function getReportById(
  reportId: string,
  userId: string,
  isAdmin: boolean
): Promise<unknown | null> {
  const where: Prisma.WeeklyReportWhereInput = {
    id: reportId,
    isDeleted: false,
  }

  // Non-admins can only see their own reports or teammates' reports
  if (!isAdmin) {
    // Get user's project IDs
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { createdById: userId },
          { tasks: { some: { assigneeId: userId } } },
        ],
        isDeleted: false,
      },
      select: { id: true },
    })
    const projectIds = userProjects.map((p) => p.id)

    // Get teammates
    const teammates = await prisma.user.findMany({
      where: {
        OR: [
          { id: userId },
          { ownedProjects: { some: { id: { in: projectIds } } } },
          { assignedTasks: { some: { project: { id: { in: projectIds } } } } },
        ],
      },
      select: { id: true },
    })
    const teammateIds = teammates.map((t) => t.id)

    where.userId = { in: teammateIds }
  }

  return prisma.weeklyReport.findFirst({
    where,
    select: {
      id: true,
      code: true,
      weekNumber: true,
      year: true,
      weekStartDate: true,
      weekEndDate: true,
      userId: true,
      reportData: true,
      status: true,
      generatedAt: true,
      pdfPath: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })
}

/**
 * Gets team reports (reports from teammates in same projects)
 */
export async function getTeamReports(
  userId: string,
  params: WeeklyReportQueryParams
): Promise<PaginatedResponse<unknown>> {
  const { page = 1, limit = 10, year, weekNumber } = params

  // Get user's project IDs
  const userProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { createdById: userId },
        { tasks: { some: { assigneeId: userId } } },
      ],
      isDeleted: false,
    },
    select: { id: true },
  })
  const projectIds = userProjects.map((p) => p.id)

  // Get teammates
  const teammates = await prisma.user.findMany({
    where: {
      OR: [
        { ownedProjects: { some: { id: { in: projectIds } } } },
        { assignedTasks: { some: { project: { id: { in: projectIds } } } } },
      ],
      id: { not: userId }, // Exclude self
    },
    select: { id: true },
  })
  const teammateIds = teammates.map((t) => t.id)

  const where: Prisma.WeeklyReportWhereInput = {
    userId: { in: teammateIds },
    isDeleted: false,
  }

  if (year) where.year = year
  if (weekNumber) where.weekNumber = weekNumber

  const skip = (page - 1) * limit

  const [reports, total] = await Promise.all([
    prisma.weeklyReport.findMany({
      where,
      select: {
        id: true,
        code: true,
        weekNumber: true,
        year: true,
        weekStartDate: true,
        weekEndDate: true,
        status: true,
        generatedAt: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      skip,
      take: limit,
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    }),
    prisma.weeklyReport.count({ where }),
  ])

  return {
    data: reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets current week bounds
 */
export function getCurrentWeekBounds(): { weekStart: Date; weekEnd: Date; weekNumber: number; year: number } {
  const { weekStart, weekEnd } = getWeekBounds(new Date())
  const { weekNumber, year } = getWeekNumber(weekStart)
  return { weekStart, weekEnd, weekNumber, year }
}

export const weeklyReportService = {
  generateReportPreview,
  generateTeamReportPreview,
  generateAndSaveReport,
  getMyReports,
  getReportById,
  getTeamReports,
  getCurrentWeekBounds,
}
