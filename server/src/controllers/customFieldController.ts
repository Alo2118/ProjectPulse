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

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const VALID_FIELD_TYPES = ['text', 'number', 'dropdown', 'date', 'checkbox'] as const

const createDefinitionSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100),
  fieldType: z.enum(VALID_FIELD_TYPES, {
    errorMap: () => ({ message: 'Tipo campo non valido' }),
  }),
  options: z.array(z.string().min(1)).optional(),
  projectId: z.string().uuid('ID progetto non valido').optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

const updateDefinitionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldType: z.enum(VALID_FIELD_TYPES).optional(),
  options: z.array(z.string().min(1)).optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const definitionQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  includeGlobal: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

const setValueSchema = z.object({
  definitionId: z.string().uuid('ID definizione non valido'),
  value: z.string().nullable().optional(),
})

// ============================================================
// DEFINITION HANDLERS
// ============================================================

export async function getDefinitions(req: Request, res: Response): Promise<void> {
  try {
    const query = definitionQuerySchema.parse(req.query)
    const definitions = await customFieldService.getDefinitions(query)
    res.json({ success: true, data: definitions })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message })
      return
    }
    logger.error('Error fetching custom field definitions', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero dei campi personalizzati' })
  }
}

export async function getDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const definition = await customFieldService.getDefinitionById(id)
    if (!definition) {
      res.status(404).json({ success: false, error: 'Campo personalizzato non trovato' })
      return
    }
    res.json({ success: true, data: definition })
  } catch (error) {
    logger.error('Error fetching custom field definition', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero del campo personalizzato' })
  }
}

export async function createDefinition(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createDefinitionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const definition = await customFieldService.createDefinition(parsed.data, req.user!.userId)
    res.status(201).json({ success: true, data: definition })
  } catch (error) {
    logger.error('Error creating custom field definition', { error })
    res.status(500).json({ success: false, error: 'Errore nella creazione del campo personalizzato' })
  }
}

export async function updateDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const parsed = updateDefinitionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const definition = await customFieldService.updateDefinition(id, parsed.data, req.user!.userId)
    if (!definition) {
      res.status(404).json({ success: false, error: 'Campo personalizzato non trovato' })
      return
    }
    res.json({ success: true, data: definition })
  } catch (error) {
    logger.error('Error updating custom field definition', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento del campo personalizzato' })
  }
}

export async function deleteDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const deleted = await customFieldService.deleteDefinition(id, req.user!.userId)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Campo personalizzato non trovato' })
      return
    }
    res.json({ success: true, message: 'Campo personalizzato eliminato' })
  } catch (error) {
    logger.error('Error deleting custom field definition', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione del campo personalizzato' })
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
    res.json({ success: true, data: values })
  } catch (error) {
    logger.error('Error fetching task custom field values', { error })
    res.status(500).json({ success: false, error: 'Errore nel recupero dei valori dei campi personalizzati' })
  }
}

export async function setTaskFieldValue(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params
    const parsed = setValueSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors[0].message })
      return
    }

    const value = await customFieldService.setFieldValue(
      {
        definitionId: parsed.data.definitionId,
        taskId,
        value: parsed.data.value ?? null,
      },
      req.user!.userId
    )
    res.json({ success: true, data: value })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obbligatorio')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    if (error instanceof Error && error.message.includes('non trovata')) {
      res.status(404).json({ success: false, error: error.message })
      return
    }
    logger.error('Error setting task custom field value', { error })
    res.status(500).json({ success: false, error: 'Errore nel salvataggio del valore del campo personalizzato' })
  }
}

export async function deleteTaskFieldValue(req: Request, res: Response): Promise<void> {
  try {
    const { taskId, defId } = req.params
    const deleted = await customFieldService.deleteFieldValue(defId, taskId, req.user!.userId)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Valore non trovato' })
      return
    }
    res.json({ success: true, message: 'Valore eliminato' })
  } catch (error) {
    logger.error('Error deleting task custom field value', { error })
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione del valore' })
  }
}
