/**
 * User Input Controller - HTTP request handling for user inputs
 * @module controllers/userInputController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { userInputService } from '../services/userInputService.js'
import { AppError } from '../middleware/errorMiddleware.js'
import { InputCategory, TaskPriority } from '../types/index.js'
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelpers.js'
import { requireUserId, requireResource } from '../utils/controllerHelpers.js'

// ============================================================
// VALIDATION SCHEMAS (Rule 6: Input Validation)
// ============================================================

const createInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  category: z.enum(['bug', 'feature_request', 'improvement', 'question', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  attachments: z.array(z.string()).nullish(),
})

const updateInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  category: z.enum(['bug', 'feature_request', 'improvement', 'question', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  attachments: z.array(z.string()).nullish(),
})

const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'resolved']).optional(),
  category: z.enum(['bug', 'feature_request', 'improvement', 'question', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  createdById: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
})

const convertToTaskSchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  estimatedHours: z.number().positive().optional(),
})

const convertToProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  ownerId: z.string().uuid('Owner ID is required'),
  templateId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

const acknowledgeSchema = z.object({
  notes: z.string().optional(),
})

const rejectSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Gets paginated list of user inputs
 * @route GET /api/inputs
 */
export async function getUserInputs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = querySchema.parse(req.query)

    const result = await userInputService.getUserInputs({
      status: params.status,
      category: params.category,
      priority: params.priority,
      createdById: params.createdById,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets current user's inputs
 * @route GET /api/inputs/my
 */
export async function getMyUserInputs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const params = querySchema.parse(req.query)

    const result = await userInputService.getMyUserInputs(userId, {
      status: params.status,
      category: params.category,
      priority: params.priority,
      search: params.search,
      page: params.page,
      limit: params.limit,
    })

    sendPaginated(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gets a single user input by ID
 * @route GET /api/inputs/:id
 */
export async function getUserInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    const input = requireResource(await userInputService.getUserInputById(id), 'User input')

    sendSuccess(res, input)
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a new user input
 * @route POST /api/inputs
 */
export async function createUserInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createInputSchema.parse(req.body)
    const userId = requireUserId(req)

    const input = await userInputService.createUserInput(
      {
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as InputCategory,
        priority: data.priority as TaskPriority,
        attachments: data.attachments ?? undefined,
      },
      userId
    )

    sendCreated(res, input)
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a user input
 * @route PUT /api/inputs/:id
 */
export async function updateUserInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = updateInputSchema.parse(req.body)
    const userId = requireUserId(req)
    const userRole = req.user?.role

    if (!userRole) {
      throw new AppError('User not authenticated', 401)
    }

    const input = await userInputService.updateUserInput(
      id,
      {
        title: data.title,
        description: data.description ?? undefined,
        category: data.category as InputCategory | undefined,
        priority: data.priority as TaskPriority | undefined,
        attachments: data.attachments ?? undefined,
      },
      userId,
      userRole
    )

    requireResource(input, 'User input')

    sendSuccess(res, input)
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      next(new AppError('Permission denied', 403))
    } else {
      next(error)
    }
  }
}

/**
 * Starts processing a user input
 * @route POST /api/inputs/:id/process
 */
export async function startProcessing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)

    const input = requireResource(await userInputService.startProcessing(id, userId), 'User input')

    sendSuccess(res, input)
  } catch (error) {
    if (error instanceof Error && error.message === 'Input is not in pending status') {
      next(new AppError('Input is not in pending status', 400))
    } else {
      next(error)
    }
  }
}

/**
 * Converts user input to task
 * @route POST /api/inputs/:id/convert-to-task
 */
export async function convertToTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = convertToTaskSchema.parse(req.body)
    const userId = requireUserId(req)

    const result = await userInputService.convertToTask(
      id,
      {
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        priority: data.priority as TaskPriority | undefined,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
      },
      userId
    )

    requireResource(result, 'User input')

    sendSuccess(res, result)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Input is already resolved') {
        next(new AppError('Input is already resolved', 400))
      } else if (error.message === 'Project not found') {
        next(new AppError('Project not found', 404))
      } else {
        next(error)
      }
    } else {
      next(error)
    }
  }
}

/**
 * Converts user input to project
 * @route POST /api/inputs/:id/convert-to-project
 */
export async function convertToProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = convertToProjectSchema.parse(req.body)
    const userId = requireUserId(req)

    const result = await userInputService.convertToProject(
      id,
      {
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        templateId: data.templateId,
        priority: data.priority,
      },
      userId
    )

    requireResource(result, 'User input')

    sendSuccess(res, result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Input is already resolved') {
      next(new AppError('Input is already resolved', 400))
    } else {
      next(error)
    }
  }
}

/**
 * Acknowledges a user input
 * @route POST /api/inputs/:id/acknowledge
 */
export async function acknowledgeInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = acknowledgeSchema.parse(req.body)
    const userId = requireUserId(req)

    const input = requireResource(await userInputService.acknowledgeInput(id, data.notes, userId), 'User input')

    sendSuccess(res, input)
  } catch (error) {
    if (error instanceof Error && error.message === 'Input is already resolved') {
      next(new AppError('Input is already resolved', 400))
    } else {
      next(error)
    }
  }
}

/**
 * Rejects a user input
 * @route POST /api/inputs/:id/reject
 */
export async function rejectInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const data = rejectSchema.parse(req.body)
    const userId = requireUserId(req)

    const input = requireResource(await userInputService.rejectInput(id, data.reason, userId), 'User input')

    sendSuccess(res, input)
  } catch (error) {
    if (error instanceof Error && error.message === 'Input is already resolved') {
      next(new AppError('Input is already resolved', 400))
    } else {
      next(error)
    }
  }
}

/**
 * Soft deletes a user input
 * @route DELETE /api/inputs/:id
 */
export async function deleteUserInput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)
    const userRole = req.user?.role

    if (!userRole) {
      throw new AppError('User not authenticated', 401)
    }

    requireResource(await userInputService.deleteUserInput(id, userId, userRole), 'User input')

    sendSuccess(res, { message: 'User input deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      next(new AppError('Permission denied', 403))
    } else {
      next(error)
    }
  }
}

/**
 * Gets user input statistics
 * @route GET /api/inputs/stats
 */
export async function getUserInputStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await userInputService.getUserInputStats()

    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}
