/**
 * Import Controller - HTTP handlers for CSV import endpoints
 * @module controllers/importController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { parseTasksCsv, importTasks, type ImportTaskRow } from '../services/importService.js'
import { logger } from '../utils/logger.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const previewBodySchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
})

const importBodySchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
  mappings: z.record(z.string(), z.string()).optional(),
  defaultProjectId: z.string().uuid().optional(),
})

// ============================================================
// FIELD MAPPING HELPER
// ============================================================

/**
 * Applies column mappings to a raw CSV row, producing an ImportTaskRow.
 * mappings = { "csv column header": "task field name" }
 */
function applyMappings(
  row: string[],
  headers: string[],
  mappings: Record<string, string>
): ImportTaskRow {
  const result: Record<string, string> = {}

  headers.forEach((header, idx) => {
    const fieldName = mappings[header]
    if (fieldName && fieldName !== 'ignore' && row[idx] !== undefined) {
      result[fieldName] = row[idx]
    }
  })

  return result as unknown as ImportTaskRow
}

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/import/tasks/preview
 * Parses CSV content and returns detected headers + first 5 rows for preview.
 */
export async function previewTasksImport(req: Request, res: Response): Promise<void> {
  try {
    const parsed = previewBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const result = parseTasksCsv(parsed.data.csvContent)

    res.json({
      success: true,
      data: {
        headers: result.headers,
        preview: result.preview,
        totalRows: result.rows.length,
      },
    })
  } catch (error) {
    logger.error('Error parsing CSV for preview', { error })
    res.status(500).json({ success: false, error: 'Errore durante l\'analisi del file CSV' })
  }
}

/**
 * POST /api/import/tasks
 * Imports tasks from CSV content, applying optional column mappings.
 */
export async function importTasksHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = importBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const { csvContent, mappings = {}, defaultProjectId } = parsed.data
    const userId = req.user!.userId

    const { headers, rows } = parseTasksCsv(csvContent)

    // Build ImportTaskRow array using mappings
    const taskRows: ImportTaskRow[] = rows.map((row) =>
      applyMappings(row, headers, mappings)
    )

    const result = await importTasks(taskRows, userId, defaultProjectId)

    res.json({ success: true, data: result })
  } catch (error) {
    logger.error('Error importing tasks', { error })
    res.status(500).json({ success: false, error: 'Errore durante l\'importazione dei task' })
  }
}
