/**
 * Task Context Provider - Loads task entity + project + assignee for automation context
 * @module services/automation/contexts/taskContext
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ContextProvider, AutomationContext } from '../types.js'

export const taskContextProvider: ContextProvider = {
  domain: 'task',

  async load(entityId: string): Promise<AutomationContext | null> {
    try {
      const task = await prisma.task.findFirst({
        where: { id: entityId, isDeleted: false },
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
          departmentId: true,
          dueDate: true,
          estimatedHours: true,
          actualHours: true,
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              priority: true,
              ownerId: true,
              startDate: true,
              targetEndDate: true,
              budget: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      })

      if (!task) {
        logger.warn('Task context: task not found', { entityId })
        return null
      }

      const context: AutomationContext = {
        domain: 'task',
        entityId: task.id,
        projectId: task.projectId,
        task: {
          id: task.id,
          code: task.code,
          title: task.title,
          taskType: task.taskType,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          parentTaskId: task.parentTaskId,
          projectId: task.projectId,
          departmentId: task.departmentId,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
          actualHours: task.actualHours ? Number(task.actualHours) : null,
        },
      }

      if (task.assignee) {
        context.assignee = {
          id: task.assignee.id,
          firstName: task.assignee.firstName,
          lastName: task.assignee.lastName,
          email: task.assignee.email,
          role: task.assignee.role,
        }
      }

      if (task.project) {
        context.project = {
          id: task.project.id,
          code: task.project.code,
          name: task.project.name,
          status: task.project.status,
          priority: task.project.priority,
          ownerId: task.project.ownerId,
          startDate: task.project.startDate,
          targetEndDate: task.project.targetEndDate,
          budget: task.project.budget ? Number(task.project.budget) : null,
        }

        if (task.project.owner) {
          context.projectOwner = {
            id: task.project.owner.id,
            firstName: task.project.owner.firstName,
            lastName: task.project.owner.lastName,
            email: task.project.owner.email,
            role: task.project.owner.role,
          }
        }
      }

      return context
    } catch (err) {
      logger.error('Task context provider failed', { entityId, error: err })
      return null
    }
  },
}
