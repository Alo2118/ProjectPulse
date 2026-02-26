/**
 * Export Controller - HTTP handlers for CSV export endpoints
 * @module controllers/exportController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { exportTasks, exportProjects, exportTimeEntries } from '../services/exportService.js'
import { logger } from '../utils/logger.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const exportTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z
    .enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'])
    .optional(),
  assigneeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
})

const exportProjectsQuerySchema = z.object({
  status: z
    .enum([
      'planning',
      'design',
      'verification',
      'validation',
      'transfer',
      'maintenance',
      'completed',
      'on_hold',
      'cancelled',
    ])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

const exportTimeEntriesQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
})

// ============================================================
// HELPER
// ============================================================

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function setCsvHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-cache')
}

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * GET /api/export/tasks
 * Exports tasks filtered by optional query params.
 */
export async function exportTasksHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = exportTasksQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const csv = await exportTasks(parsed.data)
    setCsvHeaders(res, `tasks-export-${todayString()}.csv`)
    res.send(csv)
  } catch (error) {
    logger.error('Error exporting tasks', { error })
    res.status(500).json({ success: false, error: 'Errore durante l\'esportazione dei task' })
  }
}

/**
 * GET /api/export/projects
 * Exports projects filtered by optional query params.
 */
export async function exportProjectsHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = exportProjectsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const csv = await exportProjects(parsed.data)
    setCsvHeaders(res, `projects-export-${todayString()}.csv`)
    res.send(csv)
  } catch (error) {
    logger.error('Error exporting projects', { error })
    res.status(500).json({ success: false, error: 'Errore durante l\'esportazione dei progetti' })
  }
}

/**
 * GET /api/export/time-entries
 * Exports time entries filtered by optional query params.
 */
export async function exportTimeEntriesHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = exportTimeEntriesQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const csv = await exportTimeEntries(parsed.data)
    setCsvHeaders(res, `time-entries-export-${todayString()}.csv`)
    res.send(csv)
  } catch (error) {
    logger.error('Error exporting time entries', { error })
    res.status(500).json({ success: false, error: 'Errore durante l\'esportazione delle ore' })
  }
}
