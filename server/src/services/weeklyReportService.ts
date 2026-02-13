/**
 * Weekly Report Service - Business logic for weekly reports
 * @module services/weeklyReportService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { PaginatedResponse, EntityType, ReportStatus } from '../types/index.js'
import { auditService } from './auditService.js'

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
  projectName: string | null  assigneeId?: string | null  assigneeName?: string | null
  blockedSince: string | null
  lastComment: string | null
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
 * Gets Monday and Sunday of the week containing the given date
 */
function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday

  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
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

  return {
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
 * Gets blocked tasks for a user (or all users)
 */
async function getBlockedTasks(userId: string | null): Promise<BlockedTask[]> {
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
      project: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true } },
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true },
      },
    },
  })

  return blockedTasks.map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    projectName: t.project?.name ?? null,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
    blockedSince: t.updatedAt.toISOString(),
    lastComment: t.comments[0]?.content ?? null,
  }))
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
    throw new Error('User not found')
  }

  // Gather all data in parallel
  const [timeTracking, tasks, blockedTasks, comments] = await Promise.all([
    getWeeklyTimeData(userId, bounds.weekStart, bounds.weekEnd),
    getWeeklyTaskActivity(userId, bounds.weekStart, bounds.weekEnd),
    getBlockedTasks(userId),
    getWeeklyComments(userId, bounds.weekStart, bounds.weekEnd),
  ])

  return {
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
  }
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
  const [timeTracking, tasks, blockedTasks, comments] = await Promise.all([
    getWeeklyTimeData(null, bounds.weekStart, bounds.weekEnd),
    getWeeklyTaskActivity(null, bounds.weekStart, bounds.weekEnd),
    getBlockedTasks(null),
    getWeeklyComments(null, bounds.weekStart, bounds.weekEnd),
  ])

  return {
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
  }
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
