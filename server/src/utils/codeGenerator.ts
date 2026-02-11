/**
 * Code Generator Utilities - Functions for generating unique entity codes
 * @module utils/codeGenerator
 */

import { prisma } from '../models/prismaClient.js'

/**
 * Generates a unique code with format: PREFIX-YEAR-NNN
 * @param prefix - Code prefix (e.g., 'INPUT', 'PRJ')
 * @param model - Prisma model to query for last code
 * @param codeParts - Number of parts in code (for parsing existing codes)
 */
async function generateYearlyCode(
  prefix: string,
  findLast: () => Promise<{ code: string } | null>,
  codeParts: number
): Promise<string> {
  const year = new Date().getFullYear()
  const fullPrefix = `${prefix}-${year}-`

  const last = await findLast()

  let nextNumber = 1
  if (last?.code) {
    const parts = last.code.split('-')
    if (parts.length === codeParts) {
      nextNumber = parseInt(parts[codeParts - 1], 10) + 1
    }
  }

  return `${fullPrefix}${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique user input code
 * Format: INPUT-YEAR-NNN (e.g., INPUT-2026-001)
 */
export async function generateInputCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INPUT-${year}-`

  return generateYearlyCode('INPUT', async () => {
    return prisma.userInput.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    })
  }, 3)
}

/**
 * Generates unique task code for standalone tasks (without project)
 * Format: TASK-STANDALONE-YEAR-NNN (e.g., TASK-STANDALONE-2026-001)
 */
export async function generateStandaloneTaskCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TASK-STANDALONE-${year}-`

  const lastTask = await prisma.task.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastTask?.code) {
    const parts = lastTask.code.split('-')
    if (parts.length === 4) {
      nextNumber = parseInt(parts[3], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates task code based on project
 * Format: PROJECTCODE-TNNN (e.g., PRJ-2026-001-T001)
 */
export async function generateTaskCode(projectCode: string, projectId: string): Promise<string> {
  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastTask?.code) {
    const parts = lastTask.code.split('-')
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1]
      nextNumber = parseInt(lastPart, 10) + 1
    }
  }

  return `${projectCode}-T${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique project code
 * Format: PRJ-YEAR-NNN (e.g., PRJ-2026-001)
 */
export async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PRJ-${year}-`

  const lastProject = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastProject?.code) {
    const parts = lastProject.code.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique risk code based on project
 * Format: PROJECTCODE-RNNN (e.g., PRJ-2026-001-R001)
 */
export async function generateRiskCode(projectCode: string, projectId: string): Promise<string> {
  const lastRisk = await prisma.risk.findFirst({
    where: { projectId },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastRisk?.code) {
    const parts = lastRisk.code.split('-')
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1]
      // Extract number from R001 format
      const match = lastPart.match(/R(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
  }

  return `${projectCode}-R${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique document code based on project
 * Format: PROJECTCODE-DNNN (e.g., PRJ-2026-001-D001)
 */
export async function generateDocumentCode(projectCode: string, projectId: string): Promise<string> {
  const lastDoc = await prisma.document.findFirst({
    where: { projectId },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastDoc?.code) {
    const parts = lastDoc.code.split('-')
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1]
      // Extract number from D001 format
      const match = lastPart.match(/D(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
  }

  return `${projectCode}-D${String(nextNumber).padStart(3, '0')}`
}
