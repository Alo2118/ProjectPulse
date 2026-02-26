/**
 * Search Controller - HTTP request handling for global search
 * @module controllers/searchController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { globalSearch } from '../services/searchService.js'
import { logger } from '../utils/logger.js'

const searchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100, 'Query must be at most 100 characters'),
  limit: z.preprocess(
    (val) => (val !== undefined ? Number(val) : undefined),
    z.number().int().min(1).max(20).default(5)
  ),
})

export async function search(req: Request, res: Response): Promise<void> {
  try {
    const parsed = searchQuerySchema.safeParse({
      q: req.query['q'],
      limit: req.query['limit'],
    })

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Invalid query parameters',
      })
      return
    }

    const { q, limit } = parsed.data
    const results = await globalSearch(q, limit)

    res.json({ success: true, data: results })
  } catch (error) {
    logger.error('Search error', { error })
    res.status(500).json({ success: false, error: 'Server error during search' })
  }
}
