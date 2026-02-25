/**
 * Document Context Provider - Loads document entity + project + creator for automation context
 * @module services/automation/contexts/documentContext
 */

import { prisma } from '../../../models/prismaClient.js'
import { logger } from '../../../utils/logger.js'
import type { ContextProvider, AutomationContext } from '../types.js'

export const documentContextProvider: ContextProvider = {
  domain: 'document',

  async load(entityId: string): Promise<AutomationContext | null> {
    try {
      const doc = await prisma.document.findFirst({
        where: { id: entityId, isDeleted: false },
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          status: true,
          version: true,
          createdById: true,
          projectId: true,
          reviewDueDate: true,
          reviewFrequencyDays: true,
          createdBy: {
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

      if (!doc) {
        logger.warn('Document context: document not found', { entityId })
        return null
      }

      const context: AutomationContext = {
        domain: 'document',
        entityId: doc.id,
        projectId: doc.projectId,
        document: {
          id: doc.id,
          code: doc.code,
          title: doc.title,
          type: doc.type,
          status: doc.status,
          version: doc.version,
          createdById: doc.createdById,
          projectId: doc.projectId,
          reviewDueDate: doc.reviewDueDate,
          reviewFrequencyDays: doc.reviewFrequencyDays,
        },
      }

      // Document uses "createdBy" as the primary person
      if (doc.createdBy) {
        context.assignee = {
          id: doc.createdBy.id,
          firstName: doc.createdBy.firstName,
          lastName: doc.createdBy.lastName,
          email: doc.createdBy.email,
          role: doc.createdBy.role,
        }
      }

      if (doc.project) {
        context.project = {
          id: doc.project.id,
          code: doc.project.code,
          name: doc.project.name,
          status: doc.project.status,
          priority: doc.project.priority,
          ownerId: doc.project.ownerId,
          startDate: doc.project.startDate,
          targetEndDate: doc.project.targetEndDate,
          budget: doc.project.budget ? Number(doc.project.budget) : null,
        }

        if (doc.project.owner) {
          context.projectOwner = {
            id: doc.project.owner.id,
            firstName: doc.project.owner.firstName,
            lastName: doc.project.owner.lastName,
            email: doc.project.owner.email,
            role: doc.project.owner.role,
          }
        }
      }

      return context
    } catch (err) {
      logger.error('Document context provider failed', { entityId, error: err })
      return null
    }
  },
}
