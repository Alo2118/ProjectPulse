/**
 * Export Service - Generates CSV exports for tasks, projects, and time entries
 * @module services/exportService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'

// ============================================================
// CSV HELPERS
// ============================================================

/**
 * Escapes and formats a single CSV field value.
 * Wraps in quotes if the value contains comma, newline, or quote.
 * Internal quotes are doubled.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of values to a CSV row string.
 */
export function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsvField).join(',')
}

/**
 * Formats a Date or null to a readable string.
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

// ============================================================
// EXPORT PARAMS TYPES
// ============================================================

export interface ExportTasksParams {
  projectId?: string
  status?: string
  assigneeId?: string
  departmentId?: string
}

export interface ExportProjectsParams {
  status?: string
  priority?: string
}

export interface ExportTimeEntriesParams {
  startDate?: string
  endDate?: string
  userId?: string
  projectId?: string
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

/**
 * Exports tasks as a CSV string with BOM for Excel compatibility.
 */
export async function exportTasks(params: ExportTasksParams): Promise<string> {
  logger.info('Exporting tasks', params)

  const where: Record<string, unknown> = { isDeleted: false }
  if (params.projectId) where.projectId = params.projectId
  if (params.status) where.status = params.status
  if (params.assigneeId) where.assigneeId = params.assigneeId
  if (params.departmentId) where.departmentId = params.departmentId

  const tasks = await prisma.task.findMany({
    where,
    select: {
      code: true,
      title: true,
      taskType: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      actualHours: true,
      createdAt: true,
      project: { select: { code: true, name: true } },
      assignee: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const header = toCsvRow([
    'Codice',
    'Titolo',
    'Tipo',
    'Stato',
    'Priorità',
    'Progetto',
    'Assegnatario',
    'Reparto',
    'Data Inizio',
    'Scadenza',
    'Ore Stimate',
    'Ore Effettive',
    'Creato Il',
  ])

  const rows = tasks.map((t) =>
    toCsvRow([
      t.code,
      t.title,
      t.taskType,
      t.status,
      t.priority,
      t.project ? `${t.project.code} - ${t.project.name}` : '',
      t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '',
      t.department?.name ?? '',
      formatDate(t.startDate),
      formatDate(t.dueDate),
      t.estimatedHours !== null && t.estimatedHours !== undefined
        ? Number(t.estimatedHours)
        : '',
      t.actualHours !== null && t.actualHours !== undefined
        ? Number(t.actualHours)
        : '',
      formatDate(t.createdAt),
    ])
  )

  logger.info(`Exported ${tasks.length} tasks`)
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

/**
 * Exports projects as a CSV string with BOM for Excel compatibility.
 */
export async function exportProjects(params: ExportProjectsParams): Promise<string> {
  logger.info('Exporting projects', params)

  const where: Record<string, unknown> = { isDeleted: false }
  if (params.status) where.status = params.status
  if (params.priority) where.priority = params.priority

  const projects = await prisma.project.findMany({
    where,
    select: {
      code: true,
      name: true,
      status: true,
      priority: true,
      startDate: true,
      targetEndDate: true,
      budget: true,
      createdAt: true,
      owner: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const header = toCsvRow([
    'Codice',
    'Nome',
    'Stato',
    'Priorità',
    'Responsabile',
    'Data Inizio',
    'Data Fine Prevista',
    'Budget',
    'Creato Il',
  ])

  const rows = projects.map((p) =>
    toCsvRow([
      p.code,
      p.name,
      p.status,
      p.priority,
      `${p.owner.firstName} ${p.owner.lastName}`,
      formatDate(p.startDate),
      formatDate(p.targetEndDate),
      p.budget !== null && p.budget !== undefined ? Number(p.budget) : '',
      formatDate(p.createdAt),
    ])
  )

  logger.info(`Exported ${projects.length} projects`)
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

/**
 * Exports time entries as a CSV string with BOM for Excel compatibility.
 */
export async function exportTimeEntries(params: ExportTimeEntriesParams): Promise<string> {
  logger.info('Exporting time entries', params)

  const where: Record<string, unknown> = { isDeleted: false }
  if (params.userId) where.userId = params.userId
  if (params.projectId) {
    where.task = { projectId: params.projectId }
  }
  if (params.startDate || params.endDate) {
    const dateFilter: Record<string, Date> = {}
    if (params.startDate) dateFilter.gte = new Date(params.startDate)
    if (params.endDate) dateFilter.lte = new Date(params.endDate)
    where.startTime = dateFilter
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    select: {
      startTime: true,
      duration: true,
      description: true,
      approvalStatus: true,
      user: { select: { firstName: true, lastName: true } },
      task: {
        select: {
          title: true,
          project: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: [{ startTime: 'desc' }],
  })

  const header = toCsvRow([
    'Data',
    'Utente',
    'Task',
    'Progetto',
    'Descrizione',
    'Durata (min)',
    'Stato Approvazione',
  ])

  const rows = entries.map((e) =>
    toCsvRow([
      formatDate(e.startTime),
      `${e.user.firstName} ${e.user.lastName}`,
      e.task.title,
      e.task.project ? `${e.task.project.code} - ${e.task.project.name}` : '',
      e.description ?? '',
      e.duration ?? '',
      e.approvalStatus,
    ])
  )

  logger.info(`Exported ${entries.length} time entries`)
  return '\uFEFF' + [header, ...rows].join('\r\n')
}
