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

  // Create projects (using ISO 13485 lifecycle phases)
  const project1 = await prisma.project.upsert({
    where: { code: 'PRJ-2026-001' },
    update: {},
    create: {
      code: 'PRJ-2026-001',
      name: 'Dispositivo Diagnostico Alpha',
      description: 'Sviluppo di un nuovo dispositivo diagnostico per analisi del sangue in conformita ISO 13485',
      status: 'design',
      priority: 'high',
      startDate: new Date('2026-01-15'),
      targetEndDate: new Date('2026-06-30'),
      budget: 150000,
      ownerId: direzione.id,
      createdById: admin.id,
      templateId: template.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { code: 'PRJ-2026-002' },
    update: {},
    create: {
      code: 'PRJ-2026-002',
      name: 'Software Gestionale Beta',
      description: 'Implementazione software gestionale per tracciabilita dispositivi medici',
      status: 'planning',
      priority: 'medium',
      startDate: new Date('2026-02-01'),
      targetEndDate: new Date('2026-05-15'),
      budget: 80000,
      ownerId: direzione.id,
      createdById: admin.id,
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
