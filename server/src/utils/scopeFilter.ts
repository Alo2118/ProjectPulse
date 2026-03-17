/**
 * Scope Filter Utility — Builds Prisma `where` clauses for scope=mine filtering.
 *
 * Direzione sees everything (privileged, bypass filter).
 * Admin/dipendente see only records they created, are assigned to, or have tagged.
 *
 * TagAssignment is a polymorphic model (entityType + entityId strings) with NO Prisma
 * relations on domain models, so tag filtering uses a two-step approach:
 * 1. Query tagged entity IDs
 * 2. Include them via `{ id: { in: taggedIds } }`
 *
 * @module utils/scopeFilter
 */

import { prisma } from '../models/prismaClient.js'

const PRIVILEGED_ROLES = ['direzione']

/**
 * Returns entity IDs that the user has tagged.
 */
async function getTaggedEntityIds(userId: string, entityType: string): Promise<string[]> {
  const tagged = await prisma.tagAssignment.findMany({
    where: { entityType, createdById: userId },
    select: { entityId: true },
    distinct: ['entityId'],
  })
  return tagged.map(t => t.entityId)
}

/**
 * Builds a Prisma `where` clause for scope=mine filtering.
 * Direzione sees everything (returns null — no filter applied).
 * Admin/dipendente see: created OR assigned OR tagged by them.
 *
 * @param userId - Authenticated user's ID
 * @param role - Authenticated user's role
 * @param entityType - Entity type for tag lookup ('project' | 'task' | 'risk' | 'document' | 'userInput')
 * @returns A Prisma where clause fragment to merge, or null if no filtering needed
 */
export async function buildPrismaScopeWhere(
  userId: string,
  role: string,
  entityType: string,
): Promise<Record<string, unknown> | null> {
  if (PRIVILEGED_ROLES.includes(role)) return null

  const taggedIds = await getTaggedEntityIds(userId, entityType)

  const orConditions: Record<string, unknown>[] = [
    { createdById: userId },
  ]

  // Entity-specific assignment field (verified against schema.prisma)
  if (entityType === 'project') {
    orConditions.push({ members: { some: { userId } } })
  } else if (entityType === 'task') {
    orConditions.push({ assigneeId: userId })
  } else if (entityType === 'risk') {
    orConditions.push({ ownerId: userId })
  } else if (entityType === 'userInput') {
    orConditions.push({ processedById: userId })
  }
  // document: only createdById (no assignee field)

  // Tag match: include entities this user has tagged
  if (taggedIds.length > 0) {
    orConditions.push({ id: { in: taggedIds } })
  }

  return { OR: orConditions }
}
