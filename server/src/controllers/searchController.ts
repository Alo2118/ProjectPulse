/**
 * Search Controller - HTTP request handling for global search
 * @module controllers/searchController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { globalSearch } from '../services/searchService.js'
import { sendSuccess } from '../utils/responseHelpers.js'

const searchDomainEnum = z.enum(['all', 'tasks', 'projects', 'users', 'risks', 'documents'])

const searchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100, 'Query must be at most 100 characters'),
  limit: z.preprocess(
    (val) => (val !== undefined ? Number(val) : undefined),
    z.number().int().min(1).max(20).default(5)
  ),
  domain: searchDomainEnum.default('all'),
})

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, limit, domain } = searchQuerySchema.parse({
      q: req.query['q'],
      limit: req.query['limit'],
      domain: req.query['domain'],
    })

    const results = await globalSearch(q, limit, domain)
    sendSuccess(res, results)
  } catch (error) {
    next(error)
  }
}
