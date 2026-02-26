/**
 * Checklist Service - Business logic for task checklist items
 * @module services/checklistService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { auditService } from './auditService.js'
import { EntityType } from '../types/index.js'

const checklistItemSelect = {
  id: true,
  taskId: true,
  title: true,
  isChecked: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Retrieves all checklist items for a task, ordered by position
 * @param taskId - ID of the task
 * @returns Array of checklist items
 */
export async function getChecklistItems(taskId: string) {
  return prisma.checklistItem.findMany({
    where: { taskId },
    select: checklistItemSelect,
    orderBy: { position: 'asc' },
  })
}

/**
 * Creates a new checklist item on a task
 * Position is automatically set to max(existing positions) + 1
 * @param taskId - ID of the task
 * @param title - Item title
 * @param userId - ID of the user creating the item
 * @returns Created checklist item
 */
export async function createChecklistItem(taskId: string, title: string, userId: string) {
  // Verify task exists and is not deleted
  const task = await prisma.task.findFirst({ where: { id: taskId, isDeleted: false } })
  if (!task) {
    throw new Error('Task not found')
  }

  // Compute next position
  const last = await prisma.checklistItem.findFirst({
    where: { taskId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const nextPosition = last ? last.position + 1 : 0

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.checklistItem.create({
      data: { taskId, title, position: nextPosition },
      select: checklistItemSelect,
    })

    await auditService.logCreate(
      EntityType.CHECKLIST_ITEM,
      created.id,
      userId,
      { taskId, title, position: nextPosition },
      tx
    )

    return created
  })

  logger.info('ChecklistItem created', { itemId: item.id, taskId, userId })
  return item
}

/**
 * Updates a checklist item's title, isChecked, or position
 * @param id - Checklist item ID
 * @param data - Fields to update
 * @param userId - ID of the user making the update
 * @returns Updated item, or null if not found
 */
export async function updateChecklistItem(
  id: string,
  data: { title?: string; isChecked?: boolean; position?: number },
  userId: string
) {
  const existing = await prisma.checklistItem.findUnique({
    where: { id },
    select: checklistItemSelect,
  })
  if (!existing) return null

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.checklistItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.isChecked !== undefined ? { isChecked: data.isChecked } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
      select: checklistItemSelect,
    })

    await auditService.logUpdate(
      EntityType.CHECKLIST_ITEM,
      id,
      userId,
      { title: existing.title, isChecked: existing.isChecked, position: existing.position },
      { title: updated.title, isChecked: updated.isChecked, position: updated.position },
      tx
    )

    return updated
  })

  logger.info('ChecklistItem updated', { itemId: id, userId })
  return item
}

/**
 * Permanently deletes a checklist item
 * @param id - Checklist item ID
 * @param userId - ID of the user deleting
 * @returns True if deleted, false if not found
 */
export async function deleteChecklistItem(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.checklistItem.findUnique({
    where: { id },
    select: checklistItemSelect,
  })
  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.delete({ where: { id } })

    await auditService.logDelete(
      EntityType.CHECKLIST_ITEM,
      id,
      userId,
      { taskId: existing.taskId, title: existing.title },
      tx
    )
  })

  logger.info('ChecklistItem deleted', { itemId: id, userId })
  return true
}

/**
 * Toggles the isChecked state of a checklist item
 * @param id - Checklist item ID
 * @param userId - ID of the user toggling
 * @returns Updated item, or null if not found
 */
export async function toggleChecklistItem(id: string, userId: string) {
  const existing = await prisma.checklistItem.findUnique({
    where: { id },
    select: checklistItemSelect,
  })
  if (!existing) return null

  const newChecked = !existing.isChecked

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.checklistItem.update({
      where: { id },
      data: { isChecked: newChecked },
      select: checklistItemSelect,
    })

    await auditService.logUpdate(
      EntityType.CHECKLIST_ITEM,
      id,
      userId,
      { isChecked: existing.isChecked },
      { isChecked: newChecked },
      tx
    )

    return updated
  })

  logger.info('ChecklistItem toggled', { itemId: id, isChecked: newChecked, userId })
  return item
}

/**
 * Reorders checklist items by setting explicit positions in a transaction
 * @param taskId - ID of the task owning the items
 * @param itemPositions - Array of { id, position } pairs
 * @param userId - ID of the user reordering
 * @returns Updated items in position order
 */
export async function reorderChecklistItems(
  taskId: string,
  itemPositions: Array<{ id: string; position: number }>,
  userId: string
) {
  const items = await prisma.$transaction(async (tx) => {
    for (const { id, position } of itemPositions) {
      await tx.checklistItem.updateMany({
        where: { id, taskId },
        data: { position },
      })
    }

    await auditService.logUpdate(
      EntityType.CHECKLIST_ITEM,
      taskId,
      userId,
      { reorder: 'before' },
      { itemPositions },
      tx
    )

    return tx.checklistItem.findMany({
      where: { taskId },
      select: checklistItemSelect,
      orderBy: { position: 'asc' },
    })
  })

  logger.info('ChecklistItems reordered', { taskId, userId })
  return items
}

export const checklistService = {
  getChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  reorderChecklistItems,
}
