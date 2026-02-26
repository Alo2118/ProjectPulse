/**
 * Planning Controller - HTTP request handling for planning assistant
 * @module controllers/planningController
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { planningService } from '../services/planningService.js'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const estimationMetricsQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  taskType: z.enum(['milestone', 'task', 'subtask']).optional(),
})

const teamCapacityQuerySchema = z.object({
  weekStart: z
    .string()
    .datetime({ message: 'weekStart must be a valid ISO date string' })
    .optional(),
})

const planTaskSchema = z.object({
  tempId: z.string().min(1, 'tempId is required'),
  title: z.string().min(1, 'title is required'),
  taskType: z.string().min(1, 'taskType is required'),
  estimatedHours: z.number({ invalid_type_error: 'estimatedHours must be a number' }).positive('estimatedHours must be greater than 0'),
})

const suggestTimelineBodySchema = z.object({
  tasks: z.array(planTaskSchema).min(1, 'At least one task is required'),
  projectStartDate: z.string().datetime({ message: 'projectStartDate must be a valid ISO date string' }).optional(),
})

// ============================================================
// CONTROLLER FUNCTIONS
// ============================================================

/**
 * Returns historical estimation accuracy metrics
 * @route GET /api/planning/estimation-metrics
 */
export async function getEstimationMetrics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = estimationMetricsQuerySchema.parse(req.query)

    const data = await planningService.getEstimationMetrics({
      projectId: params.projectId,
      userId: params.userId,
      taskType: params.taskType,
    })

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

/**
 * Returns team capacity for the given week
 * @route GET /api/planning/team-capacity
 */
export async function getTeamCapacity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = teamCapacityQuerySchema.parse(req.query)

    let weekStart: Date

    if (params.weekStart) {
      weekStart = new Date(params.weekStart)
    } else {
      // Default to current week's Monday
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart = new Date(now)
      weekStart.setDate(now.getDate() - diff)
      weekStart.setHours(0, 0, 0, 0)
    }

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const data = await planningService.getTeamCapacity(weekStart, weekEnd)

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

/**
 * Suggests a timeline for a proposed set of tasks
 * @route POST /api/planning/suggest-timeline
 */
export async function suggestTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = suggestTimelineBodySchema.parse(req.body)

    const projectStartDate =
      body.projectStartDate !== undefined ? new Date(body.projectStartDate) : undefined

    const data = await planningService.suggestTimeline(body.tasks, projectStartDate)

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

/**
 * Returns bottleneck analysis for a project
 * @route GET /api/planning/bottlenecks/:projectId
 */
export async function getBottlenecks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params

    // Validate projectId is present (guaranteed by route param, but make explicit)
    const parsed = z.string().uuid('Invalid project ID').safeParse(projectId)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid project ID' })
      return
    }

    const data = await planningService.getBottlenecks(parsed.data)

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// GENERATE PLAN + COMMIT PLAN
// ============================================================

const generatePlanBodySchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
})

const commitPlanTaskSchema = z.object({
  tempId: z.string().min(1, 'tempId is required'),
  title: z.string().min(1, 'title is required'),
  taskType: z.enum(['milestone', 'task', 'subtask']),
  estimatedHours: z.number({ invalid_type_error: 'estimatedHours must be a number' }).min(0),
  priority: z.string().min(1, 'priority is required'),
  assigneeId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  parentTempId: z.string().optional(),
})

const commitPlanBodySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  tasks: z.array(commitPlanTaskSchema).min(1, 'At least one task is required'),
})

/**
 * Converts a project template into a suggested flat task list for the wizard.
 * @route POST /api/planning/generate-plan
 */
export async function generatePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = generatePlanBodySchema.parse(req.body)
    const data = await planningService.generatePlanFromTemplate(body.templateId)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

/**
 * Persists the wizard task list to the database as real project tasks.
 * @route POST /api/planning/commit-plan
 */
export async function commitPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = commitPlanBodySchema.parse(req.body)
    const data = await planningService.commitPlan(
      body.projectId,
      body.tasks,
      req.user!.userId
    )
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// PHASE 3: SCHEDULING ENGINE
// ============================================================

/**
 * Auto-schedules all tasks in a project using dependency-based
 * topological sort and forward-pass scheduling.
 * @route POST /api/planning/auto-schedule/:projectId
 */
export async function autoSchedule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = z.object({ projectId: z.string().uuid() }).safeParse(req.params)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid project ID' })
      return
    }
    const data = await planningService.autoSchedule(parsed.data.projectId)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

/**
 * Suggests task reassignments to balance workload.
 * @route GET /api/planning/suggest-reassignments/:projectId
 */
export async function suggestReassignments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = z.object({ projectId: z.string().uuid() }).safeParse(req.params)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid project ID' })
      return
    }
    const data = await planningService.suggestReassignments(parsed.data.projectId)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const whatIfBodySchema = z.object({
  changes: z.array(z.object({
    type: z.enum(['add_task', 'remove_task', 'change_assignee', 'change_hours']),
    taskId: z.string().uuid().optional(),
    newAssigneeId: z.string().uuid().optional(),
    newEstimatedHours: z.number().min(0).optional(),
    newTask: z.object({
      title: z.string().min(1),
      estimatedHours: z.number().min(0),
      assigneeId: z.string().uuid().optional(),
    }).optional(),
  })).min(1),
})

/**
 * Simulates the impact of hypothetical changes on a project.
 * @route POST /api/planning/what-if/:projectId
 */
export async function whatIfAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramParsed = z.object({ projectId: z.string().uuid() }).safeParse(req.params)
    if (!paramParsed.success) {
      res.status(400).json({ success: false, error: 'Invalid project ID' })
      return
    }
    const body = whatIfBodySchema.parse(req.body)
    const data = await planningService.whatIfAnalysis(paramParsed.data.projectId, body.changes)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}
