/**
 * Seed script for development database
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Load .env from parent directory (server root)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
config({ path: path.join(__dirname, '..', '.env') })

import { PrismaClient } from '@prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'
import bcrypt from 'bcrypt'

const adapter = new PrismaMssql(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Create users
  const adminPassword = await bcrypt.hash('Admin123!', 12)
  const direzionePassword = await bcrypt.hash('Direzione123!', 12)
  const dipendentePassword = await bcrypt.hash('Dipendente123!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@projectpulse.local' },
    update: {},
    create: {
      email: 'admin@projectpulse.local',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  })

  const direzione = await prisma.user.upsert({
    where: { email: 'direzione@projectpulse.local' },
    update: {},
    create: {
      email: 'direzione@projectpulse.local',
      passwordHash: direzionePassword,
      firstName: 'Mario',
      lastName: 'Rossi',
      role: 'direzione',
    },
  })

  const dipendente = await prisma.user.upsert({
    where: { email: 'dipendente@projectpulse.local' },
    update: {},
    create: {
      email: 'dipendente@projectpulse.local',
      passwordHash: dipendentePassword,
      firstName: 'Luca',
      lastName: 'Bianchi',
      role: 'dipendente',
    },
  })

  console.log('✅ Created 3 users')

  // Create project template
  const template = await prisma.projectTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ISO 13485 Medical Device',
      description: 'Standard template for medical device development projects',
      structure: JSON.stringify({
        phases: [
          'Design Input',
          'Design Output',
          'Design Review',
          'Design Verification',
          'Design Validation',
          'Design Transfer',
        ],
      }),
    },
  })

  console.log('✅ Created project template')

  // Create system phase templates
  const biomedicalPhaseTemplate = await prisma.workflowTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Biomedico IEC 62304',
      description: 'Fasi standard per progetti dispositivi medici secondo IEC 62304',
      domain: 'project',
      statuses: JSON.stringify([
        { key: 'planning', label: 'Pianificazione', description: 'Definizione obiettivi e pianificazione', order: 0, color: 'gray', isInitial: true, isFinal: false },
        { key: 'design', label: 'Design', description: 'Progettazione e strutturazione del lavoro', order: 1, color: 'blue', isInitial: false, isFinal: false },
        { key: 'verification', label: 'Verifica', description: 'Verifica avanzamento e completamento attivita', order: 2, color: 'yellow', isInitial: false, isFinal: false },
        { key: 'validation', label: 'Validazione', description: 'Validazione finale e approvazione deliverable', order: 3, color: 'purple', isInitial: false, isFinal: false },
        { key: 'transfer', label: 'Trasferimento', description: 'Consegna finale e chiusura progetto', order: 4, color: 'green', isInitial: false, isFinal: true },
      ]),
      transitions: JSON.stringify({
        planning: ['design'],
        design: ['planning', 'verification'],
        verification: ['design', 'validation'],
        validation: ['verification', 'transfer'],
        transfer: ['validation'],
      }),
      isDefault: true,
      isSystem: true,
      isActive: true,
      createdById: admin.id,
    },
  })

  const genericPhaseTemplate = await prisma.workflowTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      name: 'Generico',
      description: 'Template fasi generico per progetti non regolamentati',
      domain: 'project',
      statuses: JSON.stringify([
        { key: 'initiation', label: 'Avvio', description: 'Avvio e definizione del progetto', order: 0, color: 'gray', isInitial: true, isFinal: false },
        { key: 'execution', label: 'Esecuzione', description: 'Esecuzione delle attivita pianificate', order: 1, color: 'blue', isInitial: false, isFinal: false },
        { key: 'closing', label: 'Chiusura', description: 'Completamento e consegna', order: 2, color: 'green', isInitial: false, isFinal: true },
      ]),
      transitions: JSON.stringify({
        initiation: ['execution'],
        execution: ['initiation', 'closing'],
        closing: ['execution'],
      }),
      isDefault: false,
      isSystem: true,
      isActive: true,
      createdById: admin.id,
    },
  })

  console.log(`✅ Created 2 phase templates: ${biomedicalPhaseTemplate.name}, ${genericPhaseTemplate.name}`)

  // Prepare phase JSON for projects
  const bioPhases = JSON.stringify({
    phases: JSON.parse(biomedicalPhaseTemplate.statuses),
    transitions: JSON.parse(biomedicalPhaseTemplate.transitions),
  })

  // Create projects (using ISO 13485 lifecycle phases)
  const project1 = await prisma.project.upsert({
    where: { code: 'PRJ-2026-001' },
    update: {},
    create: {
      code: 'PRJ-2026-001',
      name: 'Dispositivo Diagnostico Alpha',
      description: 'Sviluppo di un nuovo dispositivo diagnostico per analisi del sangue in conformita ISO 13485',
      status: 'active',
      priority: 'high',
      startDate: new Date('2026-01-15'),
      targetEndDate: new Date('2026-06-30'),
      budget: 150000,
      ownerId: direzione.id,
      createdById: admin.id,
      templateId: template.id,
      phaseTemplateId: biomedicalPhaseTemplate.id,
      phases: bioPhases,
      currentPhaseKey: 'design',
    },
  })

  const project2 = await prisma.project.upsert({
    where: { code: 'PRJ-2026-002' },
    update: {},
    create: {
      code: 'PRJ-2026-002',
      name: 'Software Gestionale Beta',
      description: 'Implementazione software gestionale per tracciabilita dispositivi medici',
      status: 'active',
      priority: 'medium',
      startDate: new Date('2026-02-01'),
      targetEndDate: new Date('2026-05-15'),
      budget: 80000,
      ownerId: direzione.id,
      createdById: admin.id,
      phaseTemplateId: biomedicalPhaseTemplate.id,
      phases: bioPhases,
      currentPhaseKey: 'planning',
    },
  })

  console.log('✅ Created 2 projects')

  // Create tasks
  const tasks = [
    {
      code: 'PRJ-2026-001-T001',
      title: 'Analisi requisiti utente',
      description: 'Raccolta e documentazione dei requisiti utente per il dispositivo diagnostico',
      status: 'done' as const,
      priority: 'high' as const,
      projectId: project1.id,
      assigneeId: dipendente.id,
      createdById: direzione.id,
      estimatedHours: 40,
    },
    {
      code: 'PRJ-2026-001-T002',
      title: 'Progettazione architettura',
      description: 'Definizione architettura hardware e software del dispositivo',
      status: 'in_progress' as const,
      priority: 'high' as const,
      projectId: project1.id,
      assigneeId: dipendente.id,
      createdById: direzione.id,
      estimatedHours: 80,
    },
    {
      code: 'PRJ-2026-001-T003',
      title: 'Sviluppo firmware',
      description: 'Implementazione firmware per controllo sensori',
      status: 'todo' as const,
      priority: 'medium' as const,
      projectId: project1.id,
      assigneeId: dipendente.id,
      createdById: direzione.id,
      estimatedHours: 120,
    },
    {
      code: 'PRJ-2026-002-T001',
      title: 'Setup ambiente sviluppo',
      description: 'Configurazione ambiente di sviluppo e CI/CD',
      status: 'in_progress' as const,
      priority: 'high' as const,
      projectId: project2.id,
      assigneeId: dipendente.id,
      createdById: direzione.id,
      estimatedHours: 16,
    },
    {
      code: 'PRJ-2026-002-T002',
      title: 'Design database',
      description: 'Progettazione schema database per tracciabilita',
      status: 'todo' as const,
      priority: 'medium' as const,
      projectId: project2.id,
      assigneeId: dipendente.id,
      createdById: direzione.id,
      estimatedHours: 24,
    },
  ]

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { code: task.code },
      update: {},
      create: task,
    })
  }

  console.log('✅ Created 5 tasks')

  // Create a sample risk
  await prisma.risk.upsert({
    where: { code: 'RSK-2026-001-001' },
    update: {},
    create: {
      code: 'RSK-2026-001-001',
      title: 'Ritardo fornitura componenti',
      description: 'Possibile ritardo nella consegna dei sensori da parte del fornitore',
      projectId: project1.id,
      probability: 'medium',
      impact: 'medium',
      status: 'open',
      mitigationPlan: 'Identificare fornitori alternativi e ordinare campioni di prova',
      ownerId: direzione.id,
      createdById: admin.id,
    },
  })

  console.log('✅ Created 1 risk')

  // Create tags
  const tagData = [
    { name: 'Urgente', color: '#EF4444' },
    { name: 'Bug', color: '#F97316' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Documentazione', color: '#8B5CF6' },
    { name: 'Design', color: '#EC4899' },
    { name: 'Backend', color: '#22C55E' },
    { name: 'Frontend', color: '#14B8A6' },
    { name: 'Revisione', color: '#EAB308' },
    { name: 'Test', color: '#6B7280' },
    { name: 'Infrastruttura', color: '#78716C' },
  ]

  for (const tag of tagData) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: {
        name: tag.name,
        color: tag.color,
        createdById: admin.id,
      },
    })
  }

  console.log(`✅ Created ${tagData.length} tags`)

  // Seed permission policies (default matrix for 4 roles × 8 domains × 12 actions)
  const PERM_ROLES = ['admin', 'direzione', 'dipendente', 'guest'] as const
  const PERM_DOMAINS = ['project', 'task', 'risk', 'document', 'input', 'time_entry', 'user', 'analytics'] as const
  const PERM_ACTIONS = ['view', 'create', 'edit', 'delete', 'advance_phase', 'block', 'assign', 'export', 'manage_team', 'approve', 'evaluate', 'convert'] as const

  type PermAction = typeof PERM_ACTIONS[number]
  type PermDomain = typeof PERM_DOMAINS[number]

  const policyDefaults: Array<{ role: string; domain: string; action: string; allowed: boolean }> = []

  // admin — everything allowed
  for (const domain of PERM_DOMAINS) {
    for (const action of PERM_ACTIONS) {
      policyDefaults.push({ role: 'admin', domain, action, allowed: true })
    }
  }

  // direzione — broad access
  const direzioneDomainActions: Record<string, PermAction[]> = {
    project: ['view', 'create', 'edit', 'advance_phase', 'assign', 'export', 'manage_team', 'convert'],
    task: ['view', 'create', 'edit', 'advance_phase', 'assign', 'export', 'block', 'evaluate', 'convert'],
    risk: ['view', 'create', 'edit', 'assign', 'export', 'evaluate'],
    document: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'convert'],
    input: ['view', 'create', 'edit', 'assign', 'export', 'convert'],
    time_entry: ['view', 'create', 'edit', 'export', 'approve'],
    user: ['view', 'export'],
    analytics: ['view', 'export'],
  }
  for (const domain of PERM_DOMAINS) {
    const allowed = (direzioneDomainActions[domain] ?? []) as PermAction[]
    for (const action of PERM_ACTIONS) {
      policyDefaults.push({ role: 'direzione', domain, action, allowed: allowed.includes(action) })
    }
  }

  // dipendente — view broadly, limited create/edit
  const dipendenteDomainActions: Record<string, PermAction[]> = {
    project: ['view'],
    task: ['view', 'advance_phase'],
    risk: ['view'],
    document: ['view', 'create'],
    input: ['view', 'create'],
    time_entry: ['view', 'create', 'edit'],
    user: ['view'],
    analytics: ['view', 'export'],
  }
  for (const domain of PERM_DOMAINS) {
    const allowed = (dipendenteDomainActions[domain] ?? []) as PermAction[]
    for (const action of PERM_ACTIONS) {
      policyDefaults.push({ role: 'dipendente', domain, action, allowed: allowed.includes(action) })
    }
  }

  // guest — view only on project, task, analytics
  const guestAllowedDomains: PermDomain[] = ['project', 'task', 'analytics']
  for (const domain of PERM_DOMAINS) {
    for (const action of PERM_ACTIONS) {
      policyDefaults.push({ role: 'guest', domain, action, allowed: guestAllowedDomains.includes(domain) && action === 'view' })
    }
  }

  for (const policy of policyDefaults) {
    await prisma.permissionPolicy.upsert({
      where: { role_domain_action: { role: policy.role, domain: policy.domain, action: policy.action } },
      create: { role: policy.role, domain: policy.domain, action: policy.action, allowed: policy.allowed },
      update: { allowed: policy.allowed },
    })
  }

  console.log(`✅ Created ${policyDefaults.length} permission policies`)

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
