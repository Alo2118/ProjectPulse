/**
 * Custom Field Controller - HTTP handlers for custom field management
 * Definitions: admin/direzione only for write operations
 * Values: any authenticated user can read/write
 * @module controllers/customFieldController
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { customFieldService } from '../services/customFieldService.js'
import { logger } from '../utils/logger.js'
import {
  createDefinitionSchema,
  updateDefinitionSchema,
  definitionQuerySchema,
  setValueSchema,
} from '../schemas/customFieldSchemas.js'
import { sendSuccess, sendCreated, sendError } from '../utils/responseHelpers.js'
import { requireUserId } from '../utils/controllerHelpers.js'

// ============================================================
// DEFINITION HANDLERS
// ============================================================

export async function getDefinitions(req: Request, res: Response): Promise<void> {
  try {
    const query = definitionQuerySchema.parse(req.query)
    const definitions = await customFieldService.getDefinitions(query)
    sendSuccess(res, definitions)
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendError(res, error.errors[0].message, 400)
      return
    }
    logger.error('Error fetching custom field definitions', { error })
    sendError(res, 'Errore nel recupero dei campi personalizzati', 500)
  }
}

export async function getDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const definition = await customFieldService.getDefinitionById(id)
    if (!definition) {
      sendError(res, 'Campo personalizzato non trovato', 404)
      return
    }
    sendSuccess(res, definition)
  } catch (error) {
    logger.error('Error fetching custom field definition', { error })
    sendError(res, 'Errore nel recupero del campo personalizzato', 500)
  }
}

export async function createDefinition(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createDefinitionSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const userId = requireUserId(req)
    const definition = await customFieldService.createDefinition(parsed.data, userId)
    sendCreated(res, definition)
  } catch (error) {
    logger.error('Error creating custom field definition', { error })
    sendError(res, 'Errore nella creazione del campo personalizzato', 500)
  }
}

export async function updateDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const parsed = updateDefinitionSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const userId = requireUserId(req)
    const definition = await customFieldService.updateDefinition(id, parsed.data, userId)
    if (!definition) {
      sendError(res, 'Campo personalizzato non trovato', 404)
      return
    }
    sendSuccess(res, definition)
  } catch (error) {
    logger.error('Error updating custom field definition', { error })
    sendError(res, "Errore nell'aggiornamento del campo personalizzato", 500)
  }
}

export async function deleteDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = requireUserId(req)
    const deleted = await customFieldService.deleteDefinition(id, userId)
    if (!deleted) {
      sendError(res, 'Campo personalizzato non trovato', 404)
      return
    }
    sendSuccess(res, { message: 'Campo personalizzato eliminato' })
  } catch (error) {
    logger.error('Error deleting custom field definition', { error })
    sendError(res, "Errore nell'eliminazione del campo personalizzato", 500)
  }
}

// ============================================================
// VALUE HANDLERS
// ============================================================

export async function getTaskFieldValues(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined
    const values = await customFieldService.getValuesForTask(taskId, projectId)
    sendSuccess(res, values)
  } catch (error) {
    logger.error('Error fetching task custom field values', { error })
    sendError(res, 'Errore nel recupero dei valori dei campi personalizzati', 500)
  }
}

export async function setTaskFieldValue(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const parsed = setValueSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 400)
      return
    }

    const userId = requireUserId(req)
    const value = await customFieldService.setFieldValue(
      {
        definitionId: parsed.data.definitionId,
        taskId,
        value: parsed.data.value ?? null,
      },
      userId
    )
    sendSuccess(res, value)
  } catch (error) {
    if (error instanceof Error && error.message.includes('obbligatorio')) {
      sendError(res, error.message, 400)
      return
    }
    if (error instanceof Error && error.message.includes('non trovata')) {
      sendError(res, error.message, 404)
      return
    }
    logger.error('Error setting task custom field value', { error })
    sendError(res, 'Errore nel salvataggio del valore del campo personalizzato', 500)
  }
}

export async function deleteTaskFieldValue(req: Request, res: Response): Promise<void> {
  try {
    const { taskId, defId } = req.params
    const userId = requireUserId(req)
    const deleted = await customFieldService.deleteFieldValue(defId, taskId, userId)
    if (!deleted) {
      sendError(res, 'Valore non trovato', 404)
      return
    }
    sendSuccess(res, { message: 'Valore eliminato' })
  } catch (error) {
    logger.error('Error deleting task custom field value', { error })
    sendError(res, "Errore nell'eliminazione del valore", 500)
  }
}
