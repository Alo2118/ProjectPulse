/**
 * Risk Context Provider - Loads risk entity + project + owner for automation context
 * @module services/automation/contexts/riskContext
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ContextProvider, AutomationContext } from '../types.js'

export const riskContextProvider: ContextProvider = {
  domain: 'risk',

  async load(entityId: string): Promise<AutomationContext | null> {
    try {
      const risk = await prisma.risk.findFirst({
        where: { id: entityId, isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          probability: true,
          impact: true,
          status: true,
          ownerId: true,
          projectId: true,
          owner: {
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

      if (!risk) {
        logger.warn('Risk context: risk not found', { entityId })
        return null
      }

      const context: AutomationContext = {
        domain: 'risk',
        entityId: risk.id,
        projectId: risk.projectId,
        risk: {
          id: risk.id,
          code: risk.code,
          title: risk.title,
          category: risk.category,
          probability: risk.probability,
          impact: risk.impact,
          status: risk.status,
          ownerId: risk.ownerId,
          projectId: risk.projectId,
        },
      }

      // Risk uses "owner" instead of "assignee"
      if (risk.owner) {
        context.assignee = {
          id: risk.owner.id,
          firstName: risk.owner.firstName,
          lastName: risk.owner.lastName,
          email: risk.owner.email,
          role: risk.owner.role,
        }
      }

      if (risk.project) {
        context.project = {
          id: risk.project.id,
          code: risk.project.code,
          name: risk.project.name,
          status: risk.project.status,
          priority: risk.project.priority,
          ownerId: risk.project.ownerId,
          startDate: risk.project.startDate,
          targetEndDate: risk.project.targetEndDate,
          budget: risk.project.budget ? Number(risk.project.budget) : null,
        }

        if (risk.project.owner) {
          context.projectOwner = {
            id: risk.project.owner.id,
            firstName: risk.project.owner.firstName,
            lastName: risk.project.owner.lastName,
            email: risk.project.owner.email,
            role: risk.project.owner.role,
          }
        }
      }

      return context
    } catch (err) {
      logger.error('Risk context provider failed', { entityId, error: err })
      return null
    }
  },
}
