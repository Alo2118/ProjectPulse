/**
 * Time Entry Service - Business logic for time tracking
 * @module services/timeEntryService
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryQueryParams,
  PaginatedResponse,
  EntityType,
} from '../types/index.js'

const timeEntrySelectFields = {
  id: true,
  description: true,
  startTime: true,
  endTime: true,
  duration: true,
  isRunning: true,
  isDeleted: true,
  approvalStatus: true,
  approvedById: true,
  approvedAt: true,
  rejectionNote: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
}

const timeEntryWithRelationsSelect = {
  ...timeEntrySelectFields,
  task: {
    select: {
      id: true,
      code: true,
      title: true,
      project: {
        select: { id: true, code: true, name: true },
      },
    },
  },
  user: {
    select: { id: true, firstName: true, lastName: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
}

/**
 * Starts a new time entry (timer)
 * @param taskId - Task ID to track time for
 * @param userId - User starting the timer
 * @param description - Optional description
 * @returns Created time entry
 */
export async function startTimer(taskId: string, userId: string, description?: string) {
  // Verify task exists
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: { id: true, code: true, taskType: true },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  // Milestones cannot have direct time entries
  if (task.taskType === 'milestone') {
    throw new Error('Cannot track time directly on a milestone. Track time on tasks within the milestone instead.')
  }

  // Stop any running timer for this user
  await stopAllRunningTimers(userId)

  const timeEntry = await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.create({
      data: {
        taskId,
        userId,
        description,
        startTime: new Date(),
        isRunning: true,
      },
      select: timeEntryWithRelationsSelect,
    })

    await auditService.logCreate(EntityType.TIME_ENTRY, entry.id, userId, { ...entry }, tx)

    return entry
  })

  logger.info(`Timer started for task ${task.code}`, { timeEntryId: timeEntry.id, taskId, userId })

  return timeEntry
}

/**
 * Stops a running time entry
 * @param timeEntryId - Time entry ID
 * @param userId - User stopping the timer
 * @returns Updated time entry
 */
export async function stopTimer(timeEntryId: string, userId: string) {
  const existing = await prisma.timeEntry.findFirst({
    where: { id: timeEntryId, userId, isRunning: true, isDeleted: false },
  })

  if (!existing) {
    throw new Error('Running timer not found')
  }

  const endTime = new Date()
  const duration = Math.round((endTime.getTime() - existing.startTime.getTime()) / 60000) // minutes

  const timeEntry = await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        endTime,
        duration,
        isRunning: false,
        updatedAt: new Date(),
      },
      select: timeEntryWithRelationsSelect,
    })

    // Update task actual hours (exclude deleted entries)
    const totalMinutes = await tx.timeEntry.aggregate({
      where: { taskId: existing.taskId, isDeleted: false },
      _sum: { duration: true },
    })

    await tx.task.update({
      where: { id: existing.taskId },
      data: {
        actualHours: Math.round(((totalMinutes._sum.duration || 0) / 60) * 100) / 100,
      },
    })

    await auditService.logUpdate(EntityType.TIME_ENTRY, entry.id, userId, { ...existing }, { ...entry }, tx)

    return entry
  })

  logger.info(`Timer stopped`, { timeEntryId, duration, userId })

  return timeEntry
}

/**
 * Stops all running timers for a user
 * @param userId - User ID
 */
async function stopAllRunningTimers(userId: string): Promise<void> {
  const runningTimers = await prisma.timeEntry.findMany({
    where: { userId, isRunning: true, isDeleted: false },
  })

  for (const timer of runningTimers) {
    await stopTimer(timer.id, userId)
  }
}

/**
 * Gets the currently running timer for a user
 * @param userId - User ID
 * @returns Running time entry or null
 */
export async function getRunningTimer(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, isRunning: true, isDeleted: false },
    select: timeEntryWithRelationsSelect,
  })
}

/**
 * Stops the current running timer for a user
 * @param userId - User ID
 * @returns Stopped time entry or null if no timer was running
 */
export async function stopCurrentTimer(userId: string) {
  const runningTimer = await prisma.timeEntry.findFirst({
    where: { userId, isRunning: true, isDeleted: false },
  })

  if (!runningTimer) {
    return null
  }

  return stopTimer(runningTimer.id, userId)
}

/**
 * Creates a manual time entry
 * @param data - Time entry data
 * @param userId - User creating the entry
 * @returns Created time entry
 */
export async function createTimeEntry(data: CreateTimeEntryInput, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: data.taskId, isDeleted: false },
    select: { id: true, taskType: true },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  // Milestones cannot have direct time entries
  if (task.taskType === 'milestone') {
    throw new Error('Cannot track time directly on a milestone. Track time on tasks within the milestone instead.')
  }

  // Calculate duration if start and end times provided
  let duration = data.duration
  if (!duration && data.startTime && data.endTime) {
    duration = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000)
  }

  const timeEntry = await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: duration || 0,
        isRunning: false,
      },
      select: timeEntryWithRelationsSelect,
    })

    // Update task actual hours (exclude deleted entries)
    const totalMinutes = await tx.timeEntry.aggregate({
      where: { taskId: data.taskId, isDeleted: false },
      _sum: { duration: true },
    })

    await tx.task.update({
      where: { id: data.taskId },
      data: {
        actualHours: Math.round(((totalMinutes._sum.duration || 0) / 60) * 100) / 100,
      },
    })

    await auditService.logCreate(EntityType.TIME_ENTRY, entry.id, userId, { ...entry }, tx)

    return entry
  })

  logger.info(`Manual time entry created`, { timeEntryId: timeEntry.id, taskId: data.taskId, userId })

  return timeEntry
}

/**
 * Updates a time entry
 * @param timeEntryId - Time entry ID
 * @param data - Update data
 * @param userId - User making update
 * @returns Updated time entry
 */
export async function updateTimeEntry(timeEntryId: string, data: UpdateTimeEntryInput, userId: string) {
  const existing = await prisma.timeEntry.findFirst({
    where: { id: timeEntryId, userId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  // Calculate duration if times changed
  let duration = data.duration
  const startTime = data.startTime || existing.startTime
  const endTime = data.endTime || existing.endTime
  if (!duration && startTime && endTime) {
    duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
  }

  const timeEntry = await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        updatedAt: new Date(),
      },
      select: timeEntryWithRelationsSelect,
    })

    // Update task actual hours (exclude deleted entries)
    const totalMinutes = await tx.timeEntry.aggregate({
      where: { taskId: existing.taskId, isDeleted: false },
      _sum: { duration: true },
    })

    await tx.task.update({
      where: { id: existing.taskId },
      data: {
        actualHours: Math.round(((totalMinutes._sum.duration || 0) / 60) * 100) / 100,
      },
    })

    await auditService.logUpdate(EntityType.TIME_ENTRY, entry.id, userId, { ...existing }, { ...entry }, tx)

    return entry
  })

  logger.info(`Time entry updated`, { timeEntryId, userId })

  return timeEntry
}

/**
 * Soft deletes a time entry
 * @param timeEntryId - Time entry ID
 * @param userId - User deleting
 * @returns True if deleted
 */
export async function deleteTimeEntry(timeEntryId: string, userId: string): Promise<boolean> {
  const existing = await prisma.timeEntry.findFirst({
    where: { id: timeEntryId, userId, isDeleted: false },
  })

  if (!existing) {
    return false
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete - mark as deleted instead of removing from DB
    await tx.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })

    // Update task actual hours (exclude deleted entries)
    const totalMinutes = await tx.timeEntry.aggregate({
      where: { taskId: existing.taskId, isDeleted: false },
      _sum: { duration: true },
    })

    await tx.task.update({
      where: { id: existing.taskId },
      data: {
        actualHours: Math.round(((totalMinutes._sum.duration || 0) / 60) * 100) / 100,
      },
    })

    await auditService.logDelete(EntityType.TIME_ENTRY, timeEntryId, userId, { ...existing }, tx)
  })

  logger.info(`Time entry soft deleted`, { timeEntryId, userId })

  return true
}

/**
 * Gets time entries with pagination and filters
 * @param params - Query parameters
 * @returns Paginated time entries
 */
export async function getTimeEntries(params: TimeEntryQueryParams): Promise<PaginatedResponse<unknown>> {
  const { page = 1, limit = 50, taskId, userId, projectId, startDate, endDate } = params

  const where: Prisma.TimeEntryWhereInput = {
    isDeleted: false,
  }

  if (taskId) where.taskId = taskId
  if (userId) where.userId = userId
  if (projectId) where.task = { projectId }
  if (startDate || endDate) {
    where.startTime = {}
    if (startDate) where.startTime.gte = startDate
    if (endDate) where.startTime.lte = endDate
  }

  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      select: timeEntryWithRelationsSelect,
      skip,
      take: limit,
      orderBy: { startTime: 'desc' },
    }),
    prisma.timeEntry.count({ where }),
  ])

  return {
    data: entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Gets time entries for a user in a date range
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Time entries with aggregations
 */
export async function getUserTimeReport(userId: string, startDate: Date, endDate: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      isDeleted: false,
      startTime: { gte: startDate, lte: endDate },
    },
    select: {
      ...timeEntrySelectFields,
      task: {
        select: {
          id: true,
          code: true,
          title: true,
          project: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
    orderBy: { startTime: 'desc' },
  })

  // Group by date
  const byDate = entries.reduce(
    (acc, entry) => {
      const date = entry.startTime.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { entries: [], totalMinutes: 0 }
      }
      acc[date].entries.push(entry)
      acc[date].totalMinutes += entry.duration || 0
      return acc
    },
    {} as Record<string, { entries: typeof entries; totalMinutes: number }>
  )

  // Group by project
  const byProject = entries.reduce(
    (acc, entry) => {
      const project = entry.task.project
      if (!project) return acc
      const projectId = project.id
      if (!acc[projectId]) {
        acc[projectId] = {
          project,
          totalMinutes: 0,
        }
      }
      acc[projectId].totalMinutes += entry.duration || 0
      return acc
    },
    {} as Record<string, { project: { id: string; code: string; name: string }; totalMinutes: number }>
  )

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0)

  return {
    entries,
    byDate,
    byProject: Object.values(byProject),
    summary: {
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entriesCount: entries.length,
    },
  }
}

/**
 * Gets daily time summary for a user
 * @param userId - User ID
 * @param date - Date to get summary for
 * @returns Daily summary
 */
export async function getDailySummary(userId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      isDeleted: false,
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    select: timeEntryWithRelationsSelect,
    orderBy: { startTime: 'asc' },
  })

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0)

  return {
    date: date.toISOString().split('T')[0],
    entries,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
  }
}

/**
 * Gets team-wide time report for admin/direzione
 * @param params - Query parameters
 * @returns Aggregated team time data
 */
export async function getTeamTimeReport(params: {
  startDate?: Date
  endDate?: Date
  projectId?: string
  userId?: string
}) {
  const { startDate, endDate, projectId, userId } = params

  const where: Prisma.TimeEntryWhereInput = {
    isRunning: false, // Only completed entries
    isDeleted: false,
  }

  if (startDate || endDate) {
    where.startTime = {}
    if (startDate) where.startTime.gte = startDate
    if (endDate) where.startTime.lte = endDate
  }
  if (projectId) {
    where.task = { projectId, isDeleted: false }
  }
  if (userId) {
    where.userId = userId
  }

  // Fetch all matching entries with relations
  const entries = await prisma.timeEntry.findMany({
    where,
    select: timeEntryWithRelationsSelect,
    orderBy: { startTime: 'desc' },
    take: 500, // Limit for performance
  })

  // Aggregate by user
  const userMap = new Map<string, { userId: string; firstName: string; lastName: string; totalMinutes: number; entryCount: number }>()
  for (const entry of entries) {
    const uid = entry.userId
    const existing = userMap.get(uid)
    if (existing) {
      existing.totalMinutes += entry.duration || 0
      existing.entryCount += 1
    } else {
      userMap.set(uid, {
        userId: uid,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        totalMinutes: entry.duration || 0,
        entryCount: 1,
      })
    }
  }

  // Aggregate by project
  const projectMap = new Map<string, { projectId: string; projectCode: string; projectName: string; totalMinutes: number }>()
  for (const entry of entries) {
    const project = entry.task?.project
    if (!project) continue
    const pid = project.id
    const existing = projectMap.get(pid)
    if (existing) {
      existing.totalMinutes += entry.duration || 0
    } else {
      projectMap.set(pid, {
        projectId: pid,
        projectCode: project.code,
        projectName: project.name,
        totalMinutes: entry.duration || 0,
      })
    }
  }

  const byUser = Array.from(userMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
  const byProject = Array.from(projectMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0)

  return {
    byUser,
    byProject,
    entries,
    summary: {
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entryCount: entries.length,
      userCount: byUser.length,
      projectCount: byProject.length,
    },
  }
}

/**
 * Gets time entries for CSV export (no pagination, max 10000)
 * @param params - Filter parameters (taskId, userId, projectId, startDate, endDate)
 * @returns All matching completed time entries with relations
 */
export async function getTimeEntriesForExport(params: {
  taskId?: string
  userId?: string
  projectId?: string
  startDate?: Date
  endDate?: Date
}) {
  const { taskId, userId, projectId, startDate, endDate } = params

  const where: Prisma.TimeEntryWhereInput = {
    isDeleted: false,
    isRunning: false,
  }

  if (taskId) where.taskId = taskId
  if (userId) where.userId = userId
  if (projectId) where.task = { projectId }
  if (startDate || endDate) {
    where.startTime = {}
    if (startDate) where.startTime.gte = startDate
    if (endDate) where.startTime.lte = endDate
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    select: timeEntryWithRelationsSelect,
    orderBy: { startTime: 'desc' },
    take: 10000,
  })

  logger.info(`Export query returned ${entries.length} time entries`)

  return entries
}

/**
 * Gets pending time entries for admin/direzione approval
 * @param params - Filter params
 * @returns Paginated pending entries
 */
export async function getPendingTimeEntries(params: {
  userId?: string
  projectId?: string
  page?: number
  limit?: number
}) {
  const { userId, projectId, page = 1, limit = 50 } = params

  const where: Prisma.TimeEntryWhereInput = {
    isDeleted: false,
    isRunning: false,
    approvalStatus: 'pending',
  }

  if (userId) where.userId = userId
  if (projectId) where.task = { projectId, isDeleted: false }

  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      select: timeEntryWithRelationsSelect,
      skip,
      take: limit,
      orderBy: { startTime: 'desc' },
    }),
    prisma.timeEntry.count({ where }),
  ])

  return {
    data: entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Bulk approve time entries (admin/direzione only)
 * @param ids - Array of time entry IDs to approve
 * @param approverId - User performing approval
 * @returns Count of approved entries
 */
export async function approveTimeEntries(ids: string[], approverId: string): Promise<{ count: number }> {
  // Verify entries exist, are not deleted and not already approved
  const entries = await prisma.timeEntry.findMany({
    where: {
      id: { in: ids },
      isDeleted: false,
      approvalStatus: { in: ['pending', 'rejected'] },
    },
    select: { id: true, approvalStatus: true },
  })

  if (entries.length === 0) {
    throw new Error('No eligible entries found')
  }

  const validIds = entries.map((e) => e.id)

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.updateMany({
      where: { id: { in: validIds } },
      data: {
        approvalStatus: 'approved',
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: null,
        updatedAt: new Date(),
      },
    })

    // Audit log for each entry (bulk)
    for (const entry of entries) {
      await auditService.logUpdate(
        EntityType.TIME_ENTRY,
        entry.id,
        approverId,
        { approvalStatus: entry.approvalStatus },
        { approvalStatus: 'approved' },
        tx
      )
    }
  })

  logger.info(`Bulk approved ${validIds.length} time entries`, { approverId })

  return { count: validIds.length }
}

/**
 * Bulk reject time entries (admin/direzione only)
 * @param ids - Array of time entry IDs to reject
 * @param approverId - User performing rejection
 * @param rejectionNote - Optional reason for rejection
 * @returns Count of rejected entries
 */
export async function rejectTimeEntries(
  ids: string[],
  approverId: string,
  rejectionNote?: string
): Promise<{ count: number }> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      id: { in: ids },
      isDeleted: false,
      approvalStatus: { in: ['pending', 'approved'] },
    },
    select: { id: true, approvalStatus: true },
  })

  if (entries.length === 0) {
    throw new Error('No eligible entries found')
  }

  const validIds = entries.map((e) => e.id)

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.updateMany({
      where: { id: { in: validIds } },
      data: {
        approvalStatus: 'rejected',
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: rejectionNote || null,
        updatedAt: new Date(),
      },
    })

    for (const entry of entries) {
      await auditService.logUpdate(
        EntityType.TIME_ENTRY,
        entry.id,
        approverId,
        { approvalStatus: entry.approvalStatus },
        { approvalStatus: 'rejected', rejectionNote },
        tx
      )
    }
  })

  logger.info(`Bulk rejected ${validIds.length} time entries`, { approverId })

  return { count: validIds.length }
}

export const timeEntryService = {
  startTimer,
  stopTimer,
  stopCurrentTimer,
  getRunningTimer,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getTimeEntriesForExport,
  getUserTimeReport,
  getDailySummary,
  getTeamTimeReport,
  approveTimeEntries,
  rejectTimeEntries,
  getPendingTimeEntries,
}
