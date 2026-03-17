/**
 * Data migration: Project Phase System
 *
 * Migrates existing projects from old 9-value status to:
 * - status: 'active' | 'on_hold' | 'cancelled' | 'completed' (project condition)
 * - currentPhaseKey: phase key from the biomedical template
 * - phases: JSON copy of the biomedical phase template
 * - phaseTemplateId: linked to the biomedical system template
 *
 * Run: npx tsx server/prisma/migrations/manual/migrate-project-phases.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BIOMEDICAL_PHASES = [
  { key: 'planning', label: 'Pianificazione', description: 'Definizione obiettivi e pianificazione', order: 0, color: 'gray', isInitial: true, isFinal: false },
  { key: 'design', label: 'Design', description: 'Progettazione e strutturazione del lavoro', order: 1, color: 'blue', isInitial: false, isFinal: false },
  { key: 'verification', label: 'Verifica', description: 'Verifica avanzamento e completamento attivita', order: 2, color: 'yellow', isInitial: false, isFinal: false },
  { key: 'validation', label: 'Validazione', description: 'Validazione finale e approvazione deliverable', order: 3, color: 'purple', isInitial: false, isFinal: false },
  { key: 'transfer', label: 'Trasferimento', description: 'Consegna finale e chiusura progetto', order: 4, color: 'green', isInitial: false, isFinal: true },
]

const BIOMEDICAL_TRANSITIONS: Record<string, string[]> = {
  planning: ['design'],
  design: ['planning', 'verification'],
  verification: ['design', 'validation'],
  validation: ['verification', 'transfer'],
  transfer: ['validation'],
}

const PHASE_STATUSES = new Set(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance'])

async function migrate() {
  console.log('Starting project phase migration...\n')

  // Find the biomedical phase template
  const bioTemplate = await prisma.workflowTemplate.findFirst({
    where: { name: 'Biomedico IEC 62304', domain: 'project', isActive: true },
  })

  if (!bioTemplate) {
    console.error('Biomedical phase template not found. Run seed first: npx prisma db seed')
    process.exit(1)
  }

  const phasesJson = JSON.stringify({
    phases: BIOMEDICAL_PHASES,
    transitions: BIOMEDICAL_TRANSITIONS,
  })

  const projects = await prisma.project.findMany({
    where: { isDeleted: false },
  })

  console.log(`Found ${projects.length} active projects to migrate\n`)

  let migrated = 0
  let skipped = 0

  for (const project of projects) {
    const oldStatus = project.status

    // Skip if already migrated (has phases set)
    if (project.phases) {
      console.log(`  ${project.code} -- already has phases, skipping`)
      skipped++
      continue
    }

    let newStatus: string
    let currentPhaseKey: string | null

    if (PHASE_STATUSES.has(oldStatus)) {
      newStatus = 'active'
      // 'maintenance' maps to 'transfer' (closest phase)
      currentPhaseKey = oldStatus === 'maintenance' ? 'transfer' : oldStatus
    } else if (oldStatus === 'on_hold') {
      newStatus = 'on_hold'
      currentPhaseKey = 'planning' // default to first phase
    } else if (oldStatus === 'cancelled') {
      newStatus = 'cancelled'
      currentPhaseKey = null
    } else if (oldStatus === 'completed') {
      newStatus = 'completed'
      currentPhaseKey = 'transfer' // last phase
    } else {
      // Unknown status -- default to active + planning
      newStatus = 'active'
      currentPhaseKey = 'planning'
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: newStatus,
        currentPhaseKey,
        phases: phasesJson,
        phaseTemplateId: bioTemplate.id,
      },
    })

    console.log(`  ${project.code}: ${oldStatus} -> ${newStatus} (phase: ${currentPhaseKey})`)
    migrated++
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`)
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
