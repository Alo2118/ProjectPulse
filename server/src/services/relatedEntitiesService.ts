/**
 * Related Entities Service - Polymorphic relations fetcher
 *
 * Given any entity type + ID, returns related entities (tasks, risks,
 * documents, team members, etc.) using a handler registry pattern.
 *
 * @module services/relatedEntitiesService
 */

import { prisma } from '../models/prismaClient.js'
import {
  userWithAvatarSelect,
  documentVersionSelect,
  riskTaskWithTaskSelect,
  riskTaskWithRiskSelect,
  projectRefSelect,
} from '../utils/selectFields.js'

// ============================================================
// TYPES
// ============================================================

type Fetcher = (entityId: string, limit: number) => Promise<unknown[]>

interface GetRelatedParams {
  entityType: string
  entityId: string
  include: string[]
  limit: number
}

// ============================================================
// HANDLER REGISTRY
// ============================================================

const HANDLERS: Record<string, Record<string, Fetcher>> = {
  project: {
    risks: async (projectId, limit) =>
      prisma.risk.findMany({
        where: { projectId, isDeleted: false },
        select: { id: true, code: true, title: true, status: true, probability: true, impact: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

    documents: async (projectId, limit) =>
      prisma.document.findMany({
        where: { projectId, isDeleted: false },
        select: { id: true, code: true, title: true, status: true, type: true, version: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

    team: async (projectId, limit) =>
      prisma.projectMember.findMany({
        where: { projectId },
        select: {
          id: true,
          projectRole: true,
          user: { select: userWithAvatarSelect },
        },
        take: limit,
      }),

    milestones: async (projectId, limit) =>
      prisma.task.findMany({
        where: { projectId, isDeleted: false, taskType: 'milestone' },
        select: { id: true, code: true, title: true, status: true, dueDate: true, phaseKey: true },
        orderBy: { dueDate: 'asc' },
        take: limit,
      }),

    tasks: async (projectId, limit) =>
      prisma.task.findMany({
        where: { projectId, isDeleted: false, taskType: { not: 'milestone' } },
        select: { id: true, code: true, title: true, status: true, priority: true, taskType: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
  },

  risk: {
    tasks: async (riskId, limit) =>
      prisma.riskTask.findMany({
        where: { riskId },
        select: riskTaskWithTaskSelect,
        take: limit,
      }),
  },

  task: {
    risks: async (taskId, limit) =>
      prisma.riskTask.findMany({
        where: { taskId },
        select: riskTaskWithRiskSelect,
        take: limit,
      }),
  },

  user: {
    projects: async (userId, limit) =>
      prisma.projectMember.findMany({
        where: { userId },
        select: {
          id: true,
          projectRole: true,
          project: { select: { ...projectRefSelect, status: true } },
        },
        take: limit,
      }),
  },

  document: {
    versions: async (documentId, limit) =>
      prisma.documentVersion.findMany({
        where: { documentId },
        select: documentVersionSelect,
        orderBy: { version: 'desc' },
        take: limit,
      }),
  },
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Fetches related entities for a given entity type and ID.
 * Only the relations listed in `include` are fetched (in parallel).
 *
 * Returns a record mapping relation names to arrays.
 * Unknown entity/relation combos are silently skipped.
 */
export async function getRelated({
  entityType,
  entityId,
  include,
  limit,
}: GetRelatedParams): Promise<Record<string, unknown[]>> {
  const entityHandlers = HANDLERS[entityType] ?? {}

  const entries = await Promise.all(
    include.map(async (relation) => {
      const fetcher = entityHandlers[relation]
      if (!fetcher) return [relation, []] as const
      const data = await fetcher(entityId, limit)
      return [relation, data] as const
    })
  )

  return Object.fromEntries(entries)
}
