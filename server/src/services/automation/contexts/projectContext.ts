/**
 * Project Context Provider - Loads project entity + owner for automation context
 * @module services/automation/contexts/projectContext
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ContextProvider, AutomationContext } from '../types.js'

export const projectContextProvider: ContextProvider = {
  domain: 'project',

  async load(entityId: string): Promise<AutomationContext | null> {
    try {
      const project = await prisma.project.findFirst({
        where: { id: entityId, isDeleted: false },
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
      })

      if (!project) {
        logger.warn('Project context: project not found', { entityId })
        return null
      }

      const context: AutomationContext = {
        domain: 'project',
        entityId: project.id,
        projectId: project.id,
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          status: project.status,
          priority: project.priority,
          ownerId: project.ownerId,
          startDate: project.startDate,
          targetEndDate: project.targetEndDate,
          budget: project.budget ? Number(project.budget) : null,
        },
      }

      if (project.owner) {
        context.projectOwner = {
          id: project.owner.id,
          firstName: project.owner.firstName,
          lastName: project.owner.lastName,
          email: project.owner.email,
          role: project.owner.role,
        }
        // For project domain, the "assignee" is the project owner
        context.assignee = context.projectOwner
      }

      return context
    } catch (err) {
      logger.error('Project context provider failed', { entityId, error: err })
      return null
    }
  },
}
