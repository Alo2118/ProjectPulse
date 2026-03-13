/**
 * Import Service - Parses and imports CSV data for tasks
 * @module services/importService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { generateTaskCode } from '../utils/codeGenerator.js'

// ============================================================
// TYPES
// ============================================================

export interface ParsedCsvResult {
  headers: string[]
  rows: string[][]
  preview: Record<string, string>[]
}

export interface ImportTaskRow {
  title: string
  description?: string
  taskType?: string
  status?: string
  priority?: string
  projectCode?: string
  assigneeEmail?: string
  departmentName?: string
  startDate?: string
  dueDate?: string
  estimatedHours?: string
}

export interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

// ============================================================
// CSV PARSER
// ============================================================

/**
 * Parses a CSV content string into headers and rows.
 * Handles quoted fields with embedded commas and newlines.
 */
function parseCsvContent(csvContent: string): { headers: string[]; rows: string[][] } {
  // Remove BOM if present
  const content = csvContent.replace(/^\uFEFF/, '').trim()
  if (!content) return { headers: [], rows: [] }

  const lines = splitCsvLines(content)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvRow(lines[0])
  const rows: string[][] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    rows.push(parseCsvRow(line))
  }

  return { headers, rows }
}

/**
 * Splits CSV content into lines, respecting quoted newlines.
 */
function splitCsvLines(content: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip escaped quote
      } else {
        inQuotes = !inQuotes
        current += char
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \n after \r
      }
      if (current.trim() || lines.length > 0) {
        lines.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.trim()) {
    lines.push(current)
  }

  return lines
}

/**
 * Parses a single CSV row into an array of field values.
 * Handles quoted fields and escaped quotes.
 */
function parseCsvRow(row: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip escaped quote
      } else {
        inQuotes = !inQuotes
        // Do not add the quote character itself to the field
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current.trim())
  return fields
}

// ============================================================
// PUBLIC FUNCTIONS
// ============================================================

/**
 * Parses CSV content and returns headers plus first 5 rows as preview.
 */
export function parseTasksCsv(csvContent: string): ParsedCsvResult {
  const { headers, rows } = parseCsvContent(csvContent)

  const preview = rows.slice(0, 5).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? ''
    })
    return obj
  })

  return { headers, rows, preview }
}

/**
 * Parses a date string in DD/MM/YYYY or YYYY-MM-DD format.
 * Returns undefined if not parseable.
 */
function parseFlexibleDate(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined
  const trimmed = value.trim()

  // DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
  }

  // YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (yyyymmdd) {
    return `${trimmed}T00:00:00.000Z`
  }

  // Already ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed
  }

  return undefined
}

/**
 * Normalises a task type value to a valid TaskType string.
 */
function normaliseTaskType(value: string | undefined): string {
  if (!value) return 'task'
  const lower = value.toLowerCase().trim()
  if (lower === 'milestone' || lower === 'jalons') return 'milestone'
  if (lower === 'subtask' || lower === 'sottotask') return 'subtask'
  return 'task'
}

/**
 * Normalises a status value to a valid TaskStatus string.
 */
function normaliseStatus(value: string | undefined): string {
  if (!value) return 'todo'
  const lower = value.toLowerCase().trim()
  const map: Record<string, string> = {
    todo: 'todo',
    'da fare': 'todo',
    in_progress: 'in_progress',
    'in corso': 'in_progress',
    inprogress: 'in_progress',
    review: 'review',
    'in revisione': 'review',
    blocked: 'blocked',
    bloccato: 'blocked',
    done: 'done',
    completato: 'done',
    cancelled: 'cancelled',
    annullato: 'cancelled',
  }
  return map[lower] ?? 'todo'
}

/**
 * Normalises a priority value to a valid TaskPriority string.
 */
function normalisePriority(value: string | undefined): string {
  if (!value) return 'medium'
  const lower = value.toLowerCase().trim()
  const map: Record<string, string> = {
    low: 'low',
    bassa: 'low',
    medium: 'medium',
    media: 'medium',
    high: 'high',
    alta: 'high',
    critical: 'critical',
    critica: 'critical',
  }
  return map[lower] ?? 'medium'
}

/**
 * Imports tasks from an array of ImportTaskRow objects.
 * Looks up project by code, assignee by email, department by name.
 * Returns summary of imported count and row-level errors.
 */
export async function importTasks(
  rows: ImportTaskRow[],
  userId: string,
  defaultProjectId?: string
): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = []
  let imported = 0

  // Pre-load lookup maps to minimise DB calls
  const [allProjects, allUsers, allDepartments] = await Promise.all([
    prisma.project.findMany({
      where: { isDeleted: false },
      select: { id: true, code: true },
    }),
    prisma.user.findMany({
      where: { isDeleted: false, isActive: true },
      select: { id: true, email: true },
    }),
    prisma.department.findMany({
      where: { isDeleted: false, isActive: true },
      select: { id: true, name: true },
    }),
  ])

  const projectByCode = new Map(allProjects.map((p) => [p.code.toLowerCase(), p]))
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]))
  const deptByName = new Map(allDepartments.map((d) => [d.name.toLowerCase(), d]))

  await prisma.$transaction(async (tx) => {
    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2 // row 1 is header
      const row = rows[idx]

      // Title is required
      if (!row.title || !row.title.trim()) {
        errors.push({ row: rowNum, message: 'Il titolo è obbligatorio' })
        continue
      }

      try {
        // Resolve project
        let projectId: string | null = defaultProjectId ?? null
        let projectCode: string | null = null

        if (row.projectCode && row.projectCode.trim()) {
          const proj = projectByCode.get(row.projectCode.trim().toLowerCase())
          if (proj) {
            projectId = proj.id
            projectCode = row.projectCode.trim().toUpperCase()
          } else {
            errors.push({ row: rowNum, message: `Progetto non trovato: ${row.projectCode}` })
            continue
          }
        } else if (projectId) {
          const proj = allProjects.find((p) => p.id === projectId)
          projectCode = proj?.code ?? null
        }

        // Resolve assignee
        let assigneeId: string | null = null
        if (row.assigneeEmail && row.assigneeEmail.trim()) {
          const user = userByEmail.get(row.assigneeEmail.trim().toLowerCase())
          if (user) {
            assigneeId = user.id
          } else {
            errors.push({ row: rowNum, message: `Utente non trovato: ${row.assigneeEmail}` })
            continue
          }
        }

        // Resolve department
        let departmentId: string | null = null
        if (row.departmentName && row.departmentName.trim()) {
          const dept = deptByName.get(row.departmentName.trim().toLowerCase())
          if (dept) {
            departmentId = dept.id
          } else {
            errors.push({ row: rowNum, message: `Reparto non trovato: ${row.departmentName}` })
            continue
          }
        }

        const taskType = normaliseTaskType(row.taskType)
        const status = normaliseStatus(row.status)
        const priority = normalisePriority(row.priority)
        const startDate = parseFlexibleDate(row.startDate)
        const dueDate = parseFlexibleDate(row.dueDate)
        const estimatedHours = row.estimatedHours
          ? parseFloat(row.estimatedHours)
          : null

        // Generate unique code (inside transaction to prevent race conditions)
        const code = await generateTaskCode(projectCode, projectId, taskType, tx)

        await tx.task.create({
          data: {
            code,
            title: row.title.trim(),
            description: row.description?.trim() ?? null,
            taskType,
            status,
            priority,
            projectId: projectId ?? null,
            assigneeId: assigneeId ?? null,
            departmentId: departmentId ?? null,
            createdById: userId,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            estimatedHours: estimatedHours ?? null,
          },
        })

        imported++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore sconosciuto'
        errors.push({ row: rowNum, message })
        logger.warn(`Import task row ${rowNum} failed: ${message}`)
      }
    }
  })

  logger.info(`Import completed: ${imported} imported, ${errors.length} errors`)
  return { imported, errors }
}
