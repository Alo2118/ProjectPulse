/**
 * Code Generator Utilities - Single source of truth for entity code generation
 * @module utils/codeGenerator
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../models/prismaClient.js'
import { AppError } from '../middleware/errorMiddleware.js'

type PrismaClient = Prisma.TransactionClient | typeof prisma

/**
 * Generates unique project code
 * Format: PRJ-YYYY-NNN (e.g., PRJ-2026-001)
 */
export async function generateProjectCode(client: PrismaClient = prisma): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PRJ-${year}`

  const lastProject = await client.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastProject?.code) {
    const lastNumber = parseInt(lastProject.code.split('-')[2], 10)
    nextNumber = lastNumber + 1
  }

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique task code based on project, task type, and standalone prefix
 * Milestone: PRJ-M001, Task/Subtask: PRJ-T001, Standalone: STD-T001
 */
export async function generateTaskCode(
  projectCode: string | null,
  projectId: string | null,
  taskType: string = 'task',
  client: PrismaClient = prisma
): Promise<string> {
  const prefix = projectCode ?? 'STD'
  const typePrefix = taskType === 'milestone' ? 'M' : 'T'

  const whereClause = projectId
    ? { projectId, code: { startsWith: `${prefix}-${typePrefix}` } }
    : { projectId: null, code: { startsWith: `STD-${typePrefix}` } }

  const lastTask = await client.task.findFirst({
    where: whereClause,
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastTask?.code) {
    const parts = lastTask.code.split(`-${typePrefix}`)
    if (parts.length > 1) {
      nextNumber = parseInt(parts[1], 10) + 1
    }
  }

  // Verify code is unique and increment if necessary
  let generatedCode = `${prefix}-${typePrefix}${String(nextNumber).padStart(3, '0')}`
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const existing = await client.task.findUnique({
      where: { code: generatedCode },
      select: { id: true },
    })

    if (!existing) break

    nextNumber++
    generatedCode = `${prefix}-${typePrefix}${String(nextNumber).padStart(3, '0')}`
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new AppError('Could not generate unique entity code after max attempts', 500)
  }

  return generatedCode
}

/**
 * Generates unique risk code based on project
 * Format: PROJECTCODE-RNNN (e.g., PRJ-2026-001-R001)
 */
export async function generateRiskCode(
  projectCode: string,
  projectId: string,
  client: PrismaClient = prisma
): Promise<string> {
  const lastRisk = await client.risk.findFirst({
    where: { projectId },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastRisk?.code) {
    const parts = lastRisk.code.split('-R')
    if (parts.length > 1) {
      nextNumber = parseInt(parts[1], 10) + 1
    }
  }

  return `${projectCode}-R${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique document code (yearly, project-independent)
 * Format: DOC-YYYY-NNN (e.g., DOC-2026-001)
 */
export async function generateDocumentCode(client: PrismaClient = prisma): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DOC-${year}-`

  const lastDoc = await client.document.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (lastDoc?.code) {
    const parts = lastDoc.code.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generates unique task code for standalone tasks (legacy convert-to-task)
 * Format: TASK-STANDALONE-YYYY-NNN (e.g., TASK-STANDALONE-2026-001)
 */
export async function generateStandaloneTaskCode(client: PrismaClient = prisma): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TASK-STANDALONE-${year}-`

  const lastTask = await client.task.findFirst({
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
 * Generates unique user input code
 * Format: INPUT-YYYY-NNN (e.g., INPUT-2026-001)
 */
export async function generateInputCode(client: PrismaClient = prisma): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INPUT-${year}-`

  const last = await client.userInput.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNumber = 1
  if (last?.code) {
    const parts = last.code.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}
