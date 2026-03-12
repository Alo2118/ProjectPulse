/**
 * Enrichment Service - Batch enrichment for list views
 *
 * Efficiently adds computed fields (progress, team count, subtask counts,
 * hours logged) to arrays of projects or tasks using batched queries.
 * Avoids N+1 by grouping all lookups per entity type.
 *
 * @module services/enrichmentService
 */

import { prisma } from '../models/prismaClient.js'
import { userWithAvatarSelect } from '../utils/selectFields.js'

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface EnrichedProject {
  progress: number
  teamCount: number
  milestoneCount: number
  openTaskCount: number
  budgetUsedPercent: number | null
  memberAvatars: Array<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }>
}

export interface EnrichedTask {
  subtasksDone: number
  subtasksTotal: number
  hoursLogged: number
  hoursEstimated: number
  completion: number
}

// ============================================================
// PROJECT ENRICHMENT
// ============================================================

/**
 * Batch-enriches an array of projects with computed fields:
 * progress, teamCount, milestoneCount, openTaskCount, budgetUsedPercent, memberAvatars.
 *
 * Uses groupBy queries and Maps for O(1) lookups — no N+1.
 */
export async function enrichProjects<T extends { id: string }>(
  projects: T[]
): Promise<(T & EnrichedProject)[]> {
  if (projects.length === 0) return []

  const ids = projects.map(p => p.id)

  // Batch: task counts by project and status (excluding milestones)
  const taskCountRows = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: {
      projectId: { in: ids },
      isDeleted: false,
      taskType: { not: 'milestone' },
    },
    _count: { id: true },
  })

  // Build per-project task stats
  const taskStatsMap = new Map<string, { total: number; done: number; open: number }>()
  for (const row of taskCountRows) {
    if (!row.projectId) continue
    const stats = taskStatsMap.get(row.projectId) ?? { total: 0, done: 0, open: 0 }
    stats.total += row._count.id
    if (row.status === 'done') stats.done += row._count.id
    if (row.status !== 'done' && row.status !== 'cancelled') stats.open += row._count.id
    taskStatsMap.set(row.projectId, stats)
  }

  // Batch: milestone counts
  const milestoneRows = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: ids },
      isDeleted: false,
      taskType: 'milestone',
    },
    _count: { id: true },
  })
  const milestoneMap = new Map(milestoneRows.map(r => [r.projectId!, r._count.id]))

  // Batch: team member counts
  const memberCountRows = await prisma.projectMember.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids } },
    _count: { id: true },
  })
  const teamCountMap = new Map(memberCountRows.map(r => [r.projectId, r._count.id]))

  // Batch: member avatars (top 5 per project)
  const members = await prisma.projectMember.findMany({
    where: { projectId: { in: ids } },
    select: {
      projectId: true,
      user: { select: userWithAvatarSelect },
    },
    orderBy: { createdAt: 'asc' },
  })
  const avatarMap = new Map<string, EnrichedProject['memberAvatars']>()
  for (const m of members) {
    const list = avatarMap.get(m.projectId) ?? []
    if (list.length < 5) {
      list.push({
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
      })
    }
    avatarMap.set(m.projectId, list)
  }

  // Batch: hours logged per project (via time entries on tasks)
  const timeEntryRows = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: {
      task: { projectId: { in: ids } },
      isDeleted: false,
    },
    _sum: { duration: true },
  })

  // Need to map taskId -> projectId
  const taskProjectRows = await prisma.task.findMany({
    where: {
      id: { in: timeEntryRows.map(r => r.taskId) },
      isDeleted: false,
    },
    select: { id: true, projectId: true },
  })
  const taskToProject = new Map(taskProjectRows.map(t => [t.id, t.projectId]))
  const hoursLoggedMap = new Map<string, number>()
  for (const row of timeEntryRows) {
    const projId = taskToProject.get(row.taskId)
    if (!projId) continue
    hoursLoggedMap.set(projId, (hoursLoggedMap.get(projId) ?? 0) + (row._sum?.duration ?? 0))
  }

  // Batch: estimated hours per project
  const estimatedRows = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: ids },
      isDeleted: false,
      taskType: { not: 'milestone' },
      estimatedHours: { not: null },
    },
    _sum: { estimatedHours: true },
  })
  const estimatedMap = new Map(estimatedRows.map(r => [r.projectId!, r._sum?.estimatedHours ?? 0]))

  return projects.map(p => {
    const stats = taskStatsMap.get(p.id) ?? { total: 0, done: 0, open: 0 }
    const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
    const hoursLoggedMinutes = hoursLoggedMap.get(p.id) ?? 0
    const hoursLogged = hoursLoggedMinutes / 60
    const hoursEstimated = estimatedMap.get(p.id) ?? 0
    const budgetUsedPercent = hoursEstimated > 0
      ? Math.round((hoursLogged / hoursEstimated) * 100)
      : null

    return {
      ...p,
      progress,
      teamCount: teamCountMap.get(p.id) ?? 0,
      milestoneCount: milestoneMap.get(p.id) ?? 0,
      openTaskCount: stats.open,
      budgetUsedPercent,
      memberAvatars: avatarMap.get(p.id) ?? [],
    }
  })
}

// ============================================================
// TASK ENRICHMENT
// ============================================================

/**
 * Batch-enriches tasks with subtask counts, hours logged, and completion %.
 */
export async function enrichTasks<T extends { id: string; estimatedHours?: number | null }>(
  tasks: T[]
): Promise<(T & EnrichedTask)[]> {
  if (tasks.length === 0) return []

  const ids = tasks.map(t => t.id)

  // Batch: subtask counts by parentTaskId
  const subtaskRows = await prisma.task.groupBy({
    by: ['parentTaskId', 'status'],
    where: {
      parentTaskId: { in: ids },
      isDeleted: false,
    },
    _count: { id: true },
  })

  const subtaskMap = new Map<string, { total: number; done: number }>()
  for (const row of subtaskRows) {
    if (!row.parentTaskId) continue
    const stats = subtaskMap.get(row.parentTaskId) ?? { total: 0, done: 0 }
    stats.total += row._count.id
    if (row.status === 'done') stats.done += row._count.id
    subtaskMap.set(row.parentTaskId, stats)
  }

  // Batch: hours logged per task
  const timeEntryRows = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: {
      taskId: { in: ids },
      isDeleted: false,
    },
    _sum: { duration: true },
  })
  const hoursMap = new Map(timeEntryRows.map(r => [r.taskId, (r._sum?.duration ?? 0) / 60]))

  return tasks.map(t => {
    const sub = subtaskMap.get(t.id) ?? { total: 0, done: 0 }
    const hoursLogged = hoursMap.get(t.id) ?? 0
    const hoursEstimated = t.estimatedHours ?? 0
    const completion = sub.total > 0
      ? Math.round((sub.done / sub.total) * 100)
      : 0

    return {
      ...t,
      subtasksDone: sub.done,
      subtasksTotal: sub.total,
      hoursLogged,
      hoursEstimated,
      completion,
    }
  })
}

// ============================================================
// KANBAN CARD ENRICHMENT (lightweight)
// ============================================================

/**
 * Lighter enrichment: only subtask counts for kanban cards.
 */
export async function enrichKanbanCards<T extends { id: string }>(
  tasks: T[]
): Promise<(T & { subtasksDone: number; subtasksTotal: number })[]> {
  if (tasks.length === 0) return []

  const ids = tasks.map(t => t.id)

  const subtaskRows = await prisma.task.groupBy({
    by: ['parentTaskId', 'status'],
    where: {
      parentTaskId: { in: ids },
      isDeleted: false,
    },
    _count: { id: true },
  })

  const subtaskMap = new Map<string, { total: number; done: number }>()
  for (const row of subtaskRows) {
    if (!row.parentTaskId) continue
    const stats = subtaskMap.get(row.parentTaskId) ?? { total: 0, done: 0 }
    stats.total += row._count.id
    if (row.status === 'done') stats.done += row._count.id
    subtaskMap.set(row.parentTaskId, stats)
  }

  return tasks.map(t => {
    const sub = subtaskMap.get(t.id) ?? { total: 0, done: 0 }
    return {
      ...t,
      subtasksDone: sub.done,
      subtasksTotal: sub.total,
    }
  })
}
