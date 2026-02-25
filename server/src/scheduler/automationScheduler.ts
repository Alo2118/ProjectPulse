/**
 * Automation Scheduler - Periodic checks for time-based automation triggers (Feature 4.4)
 * Runs every 15 minutes and fires automation triggers for:
 *   - 'task_overdue': tasks past their due date
 *   - 'task_deadline_approaching': tasks due in exactly 1, 2, or 3 days
 * Uses setInterval (consistent with the rest of the scheduler layer - no node-cron dependency).
 * @module scheduler/automationScheduler
 */

import { prisma } from '../models/prismaClient.js'
import { evaluateRules } from '../services/automation/index.js'
import { cleanupStaleCooldowns } from '../services/automation/cooldown.js'
import { logger } from '../utils/logger.js'

const INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

// Number of upcoming days to check for approaching deadlines
const DEADLINE_DAYS_WINDOWS = [1, 2, 3] as const

let schedulerHandle: NodeJS.Timeout | null = null

/**
 * Runs the overdue-task check and fires automation rules for each matching task.
 * Called on startup (once) and then every 15 minutes via setInterval.
 */
async function runOverdueCheck(): Promise<void> {
  logger.info('Automation scheduler: checking overdue tasks')

  try {
    const overdueTasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        dueDate: { lt: new Date() },
        status: { notIn: ['done', 'cancelled'] },
      },
      select: {
        id: true,
        code: true,
        title: true,
        taskType: true,
        status: true,
        priority: true,
        assigneeId: true,
        parentTaskId: true,
        projectId: true,
      },
    })

    if (overdueTasks.length === 0) {
      logger.info('Automation scheduler: no overdue tasks found')
      return
    }

    logger.info(`Automation scheduler: processing ${overdueTasks.length} overdue task(s)`)

    for (const task of overdueTasks) {
      await evaluateRules({
        type: 'task_overdue',
        domain: 'task',
        entityId: task.id,
        projectId: task.projectId,
        userId: 'system',
        data: {},
      })
    }

    logger.info(`Automation scheduler: completed - ${overdueTasks.length} task(s) evaluated`)
  } catch (err) {
    logger.error('Automation scheduler overdue check failed', { error: err })
  }
}

/**
 * Returns the start and end of a future calendar day offset from today (UTC).
 * For daysOffset = 1, returns midnight-to-midnight boundaries for tomorrow.
 */
function getFutureDayBounds(daysOffset: number): { startOfDay: Date; endOfDay: Date } {
  const now = new Date()

  const startOfDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysOffset,
      0, 0, 0, 0
    )
  )

  const endOfDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysOffset,
      23, 59, 59, 999
    )
  )

  return { startOfDay, endOfDay }
}

/**
 * Runs the deadline-approaching check for tasks due in 1, 2, or 3 days.
 * Fires 'task_deadline_approaching' events with daysBeforeDeadline set to the matching window.
 * Called on startup (once) and then every 15 minutes via setInterval.
 */
async function runDeadlineApproachingCheck(): Promise<void> {
  logger.info('Automation scheduler: checking upcoming deadlines')

  try {
    for (const daysOffset of DEADLINE_DAYS_WINDOWS) {
      const { startOfDay, endOfDay } = getFutureDayBounds(daysOffset)

      const approachingTasks = await prisma.task.findMany({
        where: {
          isDeleted: false,
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { notIn: ['done', 'cancelled'] },
        },
        select: {
          id: true,
          code: true,
          title: true,
          taskType: true,
          status: true,
          priority: true,
          assigneeId: true,
          parentTaskId: true,
          projectId: true,
        },
      })

      if (approachingTasks.length === 0) {
        logger.debug(`Automation scheduler: no tasks approaching deadline in ${daysOffset} day(s)`)
        continue
      }

      logger.info(
        `Automation scheduler: ${approachingTasks.length} task(s) due in ${daysOffset} day(s)`
      )

      for (const task of approachingTasks) {
        await evaluateRules({
          type: 'task_deadline_approaching',
          domain: 'task',
          entityId: task.id,
          projectId: task.projectId,
          userId: 'system',
          data: {
            daysBeforeDeadline: daysOffset,
          },
        })
      }
    }

    logger.info('Automation scheduler: deadline approaching check completed')
  } catch (err) {
    logger.error('Automation scheduler deadline approaching check failed', { error: err })
  }
}

/**
 * Runs the idle-task check and fires automation rules for tasks
 * that have not been updated in the last 7 days.
 */
async function runIdleCheck(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const idleTasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        status: { notIn: ['done', 'cancelled'] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, projectId: true },
      take: 500, // batch limit
    })

    logger.info(`Automation scheduler: found ${idleTasks.length} idle tasks`)

    for (const task of idleTasks) {
      evaluateRules({
        type: 'task_idle',
        domain: 'task',
        entityId: task.id,
        projectId: task.projectId,
        userId: 'system',
        data: { idleDays: 7 },
      }).catch(err => logger.error('Automation task_idle failed', { error: err }))
    }
  } catch (err) {
    logger.error('Automation scheduler: idle check failed', { error: err })
  }
}

/**
 * Runs the document review due check and fires automation rules for documents
 * whose reviewDueDate is approaching (within 7, 14, or 30 days).
 */
async function runDocumentReviewCheck(): Promise<void> {
  try {
    const windows = [7, 14, 30]

    for (const daysBeforeExpiry of windows) {
      const { startOfDay, endOfDay } = getFutureDayBounds(daysBeforeExpiry)

      // Cast needed: reviewDueDate exists in schema but Prisma client may not be regenerated yet
      const documents = await prisma.document.findMany({
        where: {
          isDeleted: false,
          reviewDueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { not: 'obsolete' },
        } as Record<string, unknown>,
        select: { id: true, projectId: true },
        take: 500,
      })

      if (documents.length === 0) continue

      logger.info(`Automation scheduler: ${documents.length} document(s) review due in ${daysBeforeExpiry} day(s)`)

      for (const doc of documents) {
        evaluateRules({
          type: 'document_review_due',
          domain: 'document',
          entityId: doc.id,
          projectId: doc.projectId,
          userId: 'system',
          data: { daysBeforeExpiry },
        }).catch(err => logger.error('Automation document_review_due failed', { error: err }))
      }
    }

    logger.info('Automation scheduler: document review check completed')
  } catch (err) {
    logger.error('Automation scheduler: document review check failed', { error: err })
  }
}

/**
 * Runs the project deadline approaching check and fires automation rules
 * for projects whose targetEndDate is approaching (within 7, 14, or 30 days).
 */
async function runProjectDeadlineCheck(): Promise<void> {
  try {
    const deadlineWindows = [7, 14, 30]

    for (const daysOffset of deadlineWindows) {
      const { startOfDay, endOfDay } = getFutureDayBounds(daysOffset)

      const projects = await prisma.project.findMany({
        where: {
          isDeleted: false,
          targetEndDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { notIn: ['completed', 'cancelled'] },
        },
        select: { id: true },
        take: 500,
      })

      if (projects.length === 0) continue

      logger.info(`Automation scheduler: ${projects.length} project(s) deadline in ${daysOffset} day(s)`)

      for (const project of projects) {
        evaluateRules({
          type: 'project_deadline_approaching',
          domain: 'project',
          entityId: project.id,
          projectId: project.id,
          userId: 'system',
          data: { daysBeforeDeadline: daysOffset },
        }).catch(err => logger.error('Automation project_deadline_approaching failed', { error: err }))
      }
    }

    logger.info('Automation scheduler: project deadline check completed')
  } catch (err) {
    logger.error('Automation scheduler: project deadline check failed', { error: err })
  }
}

/**
 * Starts the automation scheduler.
 * Performs an initial run immediately on startup, then repeats every 15 minutes.
 * Safe to call multiple times - will clear any existing interval first.
 */
export function startAutomationScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }

  logger.info('Automation scheduler started (interval: 15 minutes)')

  // Run immediately on startup so checks are handled without waiting 15 min
  void runOverdueCheck()
  void runDeadlineApproachingCheck()
  void runIdleCheck()
  void runDocumentReviewCheck()
  void runProjectDeadlineCheck()

  schedulerHandle = setInterval(() => {
    void cleanupStaleCooldowns()
    void runOverdueCheck()
    void runDeadlineApproachingCheck()
    void runIdleCheck()
    void runDocumentReviewCheck()
    void runProjectDeadlineCheck()
  }, INTERVAL_MS)
}

/**
 * Stops the automation scheduler (useful for graceful shutdown / testing).
 */
export function stopAutomationScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
    logger.info('Automation scheduler stopped')
  }
}
