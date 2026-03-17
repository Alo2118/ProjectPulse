/**
 * SavedView Service - Business logic for saved filter views
 * Users can save filter combinations, share them with the team, and set defaults.
 * @module services/savedViewService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { savedViewSelectFields } from '../utils/selectFields.js'
import {
  CreateSavedViewInput,
  UpdateSavedViewInput,
  SavedViewQueryParams,
  EntityType,
} from '../types/index.js'


/**
 * Parses the stored JSON strings back to their typed values
 */
function parseViewFields(view: {
  filters: string
  columns: string | null
  [key: string]: unknown
}) {
  return {
    ...view,
    filters: JSON.parse(view.filters) as Record<string, unknown>,
    columns: view.columns ? (JSON.parse(view.columns) as string[]) : null,
  }
}

/**
 * Retrieves saved views for a user, optionally including shared views from other users.
 * Results are ordered by name ascending.
 */
async function getViews(userId: string, params: SavedViewQueryParams = {}) {
  const { entity, includeShared = true } = params

  const where = {
    OR: [
      { userId },
      ...(includeShared ? [{ isShared: true }] : []),
    ],
    ...(entity ? { entity } : {}),
  }

  const views = await prisma.savedView.findMany({
    where,
    select: savedViewSelectFields,
    orderBy: { name: 'asc' },
  })

  return views.map(parseViewFields)
}

/**
 * Retrieves a single saved view by ID.
 * Access is granted if the requester is the owner OR the view is shared.
 */
async function getViewById(id: string, userId: string) {
  const view = await prisma.savedView.findFirst({
    where: {
      id,
      OR: [{ userId }, { isShared: true }],
    },
    select: savedViewSelectFields,
  })

  if (!view) return null
  return parseViewFields(view)
}

/**
 * Creates a new saved view.
 * If isDefault is true, clears any existing default for the same entity+user combination.
 */
async function createView(input: CreateSavedViewInput, userId: string) {
  const view = await prisma.$transaction(async (tx) => {
    // Unset existing defaults for this entity+user if new view is default
    if (input.isDefault) {
      await tx.savedView.updateMany({
        where: { userId, entity: input.entity, isDefault: true },
        data: { isDefault: false },
      })
    }

    const created = await tx.savedView.create({
      data: {
        name: input.name,
        entity: input.entity,
        filters: JSON.stringify(input.filters),
        columns: input.columns ? JSON.stringify(input.columns) : null,
        sortBy: input.sortBy ?? null,
        sortOrder: input.sortOrder ?? null,
        isShared: input.isShared ?? false,
        isDefault: input.isDefault ?? false,
        userId,
      },
      select: savedViewSelectFields,
    })

    await auditService.logCreate(
      EntityType.SAVED_VIEW,
      created.id,
      userId,
      { name: input.name, entity: input.entity },
      tx
    )

    return created
  })

  logger.info('SavedView created', { viewId: view.id, name: view.name, entity: view.entity, userId })
  return parseViewFields(view)
}

/**
 * Updates an existing saved view.
 * Only the owner can update their view.
 * If isDefault is set to true, clears other defaults for the same entity+user.
 */
async function updateView(id: string, input: UpdateSavedViewInput, userId: string) {
  const existing = await prisma.savedView.findFirst({
    where: { id, userId },
    select: { id: true, name: true, entity: true, filters: true, columns: true, isDefault: true },
  })

  if (!existing) return null

  const view = await prisma.$transaction(async (tx) => {
    // Unset other defaults for this entity+user when setting a new default
    if (input.isDefault && !existing.isDefault) {
      await tx.savedView.updateMany({
        where: { userId, entity: existing.entity, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await tx.savedView.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.filters !== undefined && { filters: JSON.stringify(input.filters) }),
        ...(input.columns !== undefined && { columns: input.columns ? JSON.stringify(input.columns) : null }),
        ...(input.sortBy !== undefined && { sortBy: input.sortBy ?? null }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder ?? null }),
        ...(input.isShared !== undefined && { isShared: input.isShared }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
      select: savedViewSelectFields,
    })

    await auditService.logUpdate(
      EntityType.SAVED_VIEW,
      id,
      userId,
      { name: existing.name },
      { name: updated.name },
      tx
    )

    return updated
  })

  logger.info('SavedView updated', { viewId: id, userId })
  return parseViewFields(view)
}

/**
 * Hard-deletes a saved view.
 * Only the owner can delete their view.
 */
async function deleteView(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.savedView.findFirst({
    where: { id, userId },
    select: { id: true, name: true, entity: true },
  })

  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    await tx.savedView.delete({ where: { id } })

    await auditService.logDelete(
      EntityType.SAVED_VIEW,
      id,
      userId,
      { name: existing.name, entity: existing.entity },
      tx
    )
  })

  logger.info('SavedView deleted', { viewId: id, name: existing.name, userId })
  return true
}

export const savedViewService = {
  getViews,
  getViewById,
  createView,
  updateView,
  deleteView,
}
