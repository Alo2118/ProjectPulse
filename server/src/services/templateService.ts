/**
 * Template Service - Business logic for project templates
 * @module services/templateService
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorMiddleware.js'

const templateSelectFields = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  phases: true,
  structure: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { projects: true },
  },
}

export interface CreateTemplateInput {
  name: string
  description?: string | null
  phases?: string
  structure?: string
}

export interface UpdateTemplateInput {
  name?: string
  description?: string | null
  isActive?: boolean
  phases?: string
  structure?: string
}

export const templateService = {
  /**
   * Get all active templates (or all for admin)
   */
  async getTemplates(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true }

    const templates = await prisma.projectTemplate.findMany({
      where,
      select: templateSelectFields,
      orderBy: { name: 'asc' },
    })

    return templates.map((t) => ({
      ...t,
      phases: JSON.parse(t.phases) as string[],
      structure: JSON.parse(t.structure),
      projectCount: t._count.projects,
    }))
  },

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string) {
    const template = await prisma.projectTemplate.findUnique({
      where: { id },
      select: templateSelectFields,
    })

    if (!template) return null

    return {
      ...template,
      phases: JSON.parse(template.phases) as string[],
      structure: JSON.parse(template.structure),
      projectCount: template._count.projects,
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateInput) {
    const template = await prisma.projectTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        phases: data.phases ?? '[]',
        structure: data.structure ?? '{}',
      },
      select: templateSelectFields,
    })

    logger.info('Template created', { templateId: template.id, name: template.name })

    return {
      ...template,
      phases: JSON.parse(template.phases) as string[],
      structure: JSON.parse(template.structure),
      projectCount: template._count.projects,
    }
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateInput) {
    const existing = await prisma.projectTemplate.findUnique({ where: { id } })
    if (!existing) return null

    const template = await prisma.projectTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.phases !== undefined && { phases: data.phases }),
        ...(data.structure !== undefined && { structure: data.structure }),
      },
      select: templateSelectFields,
    })

    logger.info('Template updated', { templateId: id })

    return {
      ...template,
      phases: JSON.parse(template.phases) as string[],
      structure: JSON.parse(template.structure),
      projectCount: template._count.projects,
    }
  },

  /**
   * Delete a template (hard delete — only if no projects linked)
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const template = await prisma.projectTemplate.findUnique({
      where: { id },
      select: { id: true, _count: { select: { projects: true } } },
    })

    if (!template) return false

    if (template._count.projects > 0) {
      throw new AppError(`Template is used by ${template._count.projects} project(s) — cannot delete`, 400)
    }

    await prisma.projectTemplate.delete({ where: { id } })
    logger.info('Template deleted', { templateId: id })
    return true
  },
}
