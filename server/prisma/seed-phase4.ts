/**
 * Phase 4 Seed Script - One-off seeding for governance data
 * Run with: npx tsx prisma/seed-phase4.ts
 *
 * Creates:
 * 1. Default WorkflowTemplate (isSystem: true)
 * 2. ProjectMember entries for existing projects (owner from Project.ownerId)
 * 3. Template automation rules (inactive)
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
config({ path: path.join(__dirname, '..', '.env') })

import { PrismaClient } from '@prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'

const adapter = new PrismaMssql(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Phase 4 Seed: starting...')

  // ──────────────────────────────────────────────
  // 1. Default Workflow Template
  // ──────────────────────────────────────────────
  const statuses = JSON.stringify([
    { key: 'todo',        label: 'Da fare',       color: 'gray',   isInitial: true,  isFinal: false, requiresComment: false },
    { key: 'in_progress', label: 'In corso',      color: 'blue',   isInitial: false, isFinal: false, requiresComment: false },
    { key: 'review',      label: 'In revisione',  color: 'yellow', isInitial: false, isFinal: false, requiresComment: false },
    { key: 'blocked',     label: 'Bloccato',      color: 'red',    isInitial: false, isFinal: false, requiresComment: true  },
    { key: 'done',        label: 'Completato',    color: 'green',  isInitial: false, isFinal: true,  requiresComment: false },
    { key: 'cancelled',   label: 'Annullato',     color: 'gray',   isInitial: false, isFinal: true,  requiresComment: false },
  ])

  const transitions = JSON.stringify({
    todo:        ['in_progress', 'blocked', 'cancelled'],
    in_progress: ['todo', 'review', 'blocked', 'done'],
    review:      ['in_progress', 'done', 'blocked'],
    blocked:     ['todo', 'in_progress'],
    done:        ['in_progress'],
    cancelled:   ['todo'],
  })

  // Find an admin user to use as createdBy
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin', isDeleted: false },
    select: { id: true },
  })

  if (!adminUser) {
    console.error('No admin user found. Please seed users first.')
    process.exit(1)
  }

  // Check if system workflow already exists
  const existingWorkflow = await prisma.workflowTemplate.findFirst({
    where: { isSystem: true },
  })

  let workflowId: string
  if (existingWorkflow) {
    console.log('Default workflow template already exists, skipping.')
    workflowId = existingWorkflow.id
  } else {
    const workflow = await prisma.workflowTemplate.create({
      data: {
        name: 'Standard ProjectPulse',
        description: 'Workflow standard con 6 stati: Da fare, In corso, In revisione, Bloccato, Completato, Annullato',
        statuses,
        transitions,
        isDefault: true,
        isSystem: true,
        isActive: true,
        createdById: adminUser.id,
      },
    })
    workflowId = workflow.id
    console.log(`Created default workflow template: ${workflowId}`)
  }

  // ──────────────────────────────────────────────
  // 2. ProjectMember entries for existing projects
  // ──────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: { isDeleted: false },
    select: { id: true, ownerId: true },
  })

  let membersCreated = 0
  for (const project of projects) {
    // Create owner membership if not exists
    const existingOwner = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: project.ownerId,
        },
      },
    })

    if (!existingOwner) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: project.ownerId,
          projectRole: 'owner',
          addedById: adminUser.id,
        },
      })
      membersCreated++
    }

    // Find users with tasks assigned in this project and add as members
    const assignedUsers = await prisma.task.findMany({
      where: {
        projectId: project.id,
        isDeleted: false,
        assigneeId: { not: null },
      },
      select: { assigneeId: true },
      distinct: ['assigneeId'],
    })

    for (const task of assignedUsers) {
      if (!task.assigneeId || task.assigneeId === project.ownerId) continue

      // Check if user is admin/direzione (they bypass membership)
      const user = await prisma.user.findUnique({
        where: { id: task.assigneeId },
        select: { role: true },
      })
      if (!user || user.role === 'admin' || user.role === 'direzione') continue

      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: task.assigneeId,
          },
        },
      })

      if (!existingMember) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: task.assigneeId,
            projectRole: 'member',
            addedById: adminUser.id,
          },
        })
        membersCreated++
      }
    }
  }

  console.log(`Created ${membersCreated} project member entries across ${projects.length} projects`)

  // ──────────────────────────────────────────────
  // 3. Template automation rules (inactive)
  // ──────────────────────────────────────────────
  const existingRules = await prisma.automationRule.count()
  if (existingRules === 0) {
    await prisma.automationRule.createMany({
      data: [
        {
          name: 'Auto-completa parent',
          description: 'Quando tutti i subtask sono completati, il task parent diventa completato automaticamente',
          trigger: JSON.stringify({ type: 'all_subtasks_completed' }),
          conditions: JSON.stringify([]),
          actions: JSON.stringify([{ type: 'update_parent_status', config: { status: 'done' } }]),
          isActive: false,
          priority: 10,
          createdById: adminUser.id,
        },
        {
          name: 'Notifica scadenza',
          description: 'Notifica l\'assegnatario quando un task supera la data di scadenza',
          trigger: JSON.stringify({ type: 'task_overdue' }),
          conditions: JSON.stringify([]),
          actions: JSON.stringify([
            { type: 'notify_assignee', config: { message: 'Il task "{task.title}" ha superato la data di scadenza' } },
          ]),
          isActive: false,
          priority: 20,
          createdById: adminUser.id,
        },
        {
          name: 'Escalation blocco',
          description: 'Notifica il project owner quando un task viene bloccato',
          trigger: JSON.stringify({ type: 'task_status_changed', config: { to: 'blocked' } }),
          conditions: JSON.stringify([]),
          actions: JSON.stringify([
            { type: 'notify_project_owner', config: { message: 'Il task "{task.title}" e\' stato bloccato' } },
          ]),
          isActive: false,
          priority: 30,
          createdById: adminUser.id,
        },
      ],
    })
    console.log('Created 3 template automation rules (inactive)')
  } else {
    console.log(`${existingRules} automation rules already exist, skipping templates`)
  }

  console.log('Phase 4 Seed: complete!')
}

main()
  .catch((e) => {
    console.error('Phase 4 Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
