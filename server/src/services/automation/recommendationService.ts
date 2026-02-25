/**
 * Recommendation Service - Pattern analyzers and recommendation management (Phase 5)
 * Analyzes project data to suggest automation rules that would benefit the team.
 * 8 pattern analyzers run daily via the scheduler, producing recommendations
 * that admins can apply (creating an automation rule) or dismiss.
 * @module services/automation/recommendationService
 */

import { prisma } from '../../models/prismaClient.js'
import { logger } from '../../utils/logger.js'
import * as automationService from '../automationService.js'
import type { TriggerConfig, ConditionConfig, ActionConfig } from './types.js'

// ============================================================
// TYPES
// ============================================================

interface PatternResult {
  pattern: string
  evidence: Record<string, unknown>
  suggestedRule: {
    name: string
    description: string
    domain: string
    trigger: TriggerConfig
    conditions: ConditionConfig[]
    actions: ActionConfig[]
    cooldownMinutes: number
  }
  impact: 'high' | 'medium' | 'low'
  projectId?: string
}

// ============================================================
// PATTERN ANALYZERS
// ============================================================

/**
 * 1. Tasks frequently late: >30% tasks with updatedAt > dueDate in a project
 * Uses raw SQL to compare updatedAt > dueDate for done tasks.
 */
async function analyzeLateTasks(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const projects = await prisma.project.findMany({
    where: { isDeleted: false, status: { notIn: ['cancelled', 'completed'] } },
    select: { id: true, name: true },
  })

  for (const project of projects) {
    const totalTasks = await prisma.task.count({
      where: {
        projectId: project.id,
        isDeleted: false,
        dueDate: { not: null },
        status: 'done',
      },
    })
    if (totalTasks < 5) continue // need minimum sample

    // Count tasks where they were completed late (updatedAt > dueDate as approximation)
    const lateCount = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
      `SELECT COUNT(*) as cnt FROM tasks WHERE project_id = @P1 AND is_deleted = 0 AND status = 'done' AND due_date IS NOT NULL AND updated_at > due_date`,
      project.id
    )
    const late = Number(lateCount[0]?.cnt ?? 0)
    const percentage = (late / totalTasks) * 100

    if (percentage > 30) {
      results.push({
        pattern: 'tasks_frequently_late',
        projectId: project.id,
        evidence: {
          totalTasks,
          lateTasks: late,
          percentage: Math.round(percentage),
          projectName: project.name,
        },
        suggestedRule: {
          name: `Escalation scadenza - ${project.name}`,
          description: `Il ${Math.round(percentage)}% dei task completati in ${project.name} ha sforato la scadenza`,
          domain: 'task',
          trigger: { type: 'task_deadline_approaching', params: { daysBeforeDeadline: 2 } },
          conditions: [{ type: 'task_has_assignee', params: {} }],
          actions: [
            {
              type: 'escalate',
              params: { message: 'Il task {task.code} scade tra 48 ore!' },
            },
          ],
          cooldownMinutes: 0,
        },
        impact: 'high',
      })
    }
  }
  return results
}

/**
 * 2. Tasks stuck in_progress too long (>14 days without update)
 */
async function analyzeStuckTasks(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const cutoff = new Date(Date.now() - 14 * 86400000)
  const stuckTasks = await prisma.task.count({
    where: {
      isDeleted: false,
      status: 'in_progress',
      updatedAt: { lt: cutoff },
    },
  })

  if (stuckTasks >= 3) {
    results.push({
      pattern: 'tasks_stuck_in_progress',
      evidence: { stuckCount: stuckTasks, daysThreshold: 14 },
      suggestedRule: {
        name: 'Alert task fermi',
        description: `${stuckTasks} task sono in "in_progress" da pi\u00f9 di 14 giorni`,
        domain: 'task',
        trigger: { type: 'task_idle', params: {} },
        conditions: [{ type: 'task_has_assignee', params: {} }],
        actions: [
          {
            type: 'notify_assignee',
            params: {
              message: 'Il task {task.code} \u00e8 fermo da oltre 14 giorni.',
            },
          },
        ],
        cooldownMinutes: 10080, // 7 days
      },
      impact: 'medium',
    })
  }
  return results
}

/**
 * 3. Orphaned parents: all subtasks done but parent not done
 */
async function analyzeOrphanedParents(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const parentTasks = await prisma.$queryRawUnsafe<
    Array<{ id: string; code: string; title: string; project_id: string | null }>
  >(
    `SELECT t.id, t.code, t.title, t.project_id
     FROM tasks t
     WHERE t.is_deleted = 0
       AND t.status NOT IN ('done', 'cancelled')
       AND EXISTS (SELECT 1 FROM tasks sub WHERE sub.parent_task_id = t.id AND sub.is_deleted = 0)
       AND NOT EXISTS (SELECT 1 FROM tasks sub WHERE sub.parent_task_id = t.id AND sub.is_deleted = 0 AND sub.status NOT IN ('done', 'cancelled'))`
  )

  if (parentTasks.length >= 1) {
    results.push({
      pattern: 'orphaned_parents',
      evidence: {
        count: parentTasks.length,
        examples: parentTasks.slice(0, 3).map((t) => t.code),
      },
      suggestedRule: {
        name: 'Completamento automatico parent',
        description: `${parentTasks.length} task hanno tutti i subtask completati ma restano aperti`,
        domain: 'task',
        trigger: { type: 'all_subtasks_completed', params: {} },
        conditions: [],
        actions: [
          {
            type: 'update_parent_status',
            params: { status: 'done' },
          },
        ],
        cooldownMinutes: 0,
      },
      impact: 'medium',
    })
  }
  return results
}

/**
 * 4. High risks without owner
 */
async function analyzeUnownedHighRisks(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const unownedRisks = await prisma.risk.count({
    where: {
      isDeleted: false,
      impact: 'high',
      ownerId: null,
      status: { notIn: ['closed', 'mitigated'] },
    },
  })

  if (unownedRisks >= 1) {
    results.push({
      pattern: 'unowned_high_risks',
      evidence: { count: unownedRisks },
      suggestedRule: {
        name: 'Notifica rischi critici senza owner',
        description: `${unownedRisks} rischi ad alto impatto non hanno un responsabile`,
        domain: 'risk',
        trigger: { type: 'risk_created', params: {} },
        conditions: [{ type: 'risk_impact_is', params: { value: 'high' } }],
        actions: [
          {
            type: 'notify_project_owner',
            params: {
              message: 'Nuovo rischio critico senza owner: {risk.title}',
            },
          },
        ],
        cooldownMinutes: 0,
      },
      impact: 'high',
    })
  }
  return results
}

/**
 * 5. Expired documents without review
 */
async function analyzeExpiredDocuments(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const now = new Date()
  // Cast needed: reviewDueDate exists in schema but Prisma client may not be regenerated yet
  const expiredDocs = await prisma.document.count({
    where: {
      isDeleted: false,
      reviewDueDate: { lt: now },
      status: { notIn: ['obsolete'] },
    } as Record<string, unknown>,
  })

  if (expiredDocs >= 1) {
    results.push({
      pattern: 'expired_documents',
      evidence: { count: expiredDocs },
      suggestedRule: {
        name: 'Reminder documenti scaduti',
        description: `${expiredDocs} documenti hanno superato la data di revisione`,
        domain: 'document',
        trigger: { type: 'document_review_due', params: { daysBeforeExpiry: 0 } },
        conditions: [],
        actions: [
          {
            type: 'notify_assignee',
            params: {
              message:
                'Il documento {document.title} ha superato la scadenza di revisione!',
            },
          },
        ],
        cooldownMinutes: 10080, // 7 days
      },
      impact: 'medium',
    })
  }
  return results
}

/**
 * 6. Milestones at risk: <7 days to deadline, <50% completion
 */
async function analyzeMilestonesAtRisk(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const soon = new Date(Date.now() + 7 * 86400000)
  const milestones = await prisma.task.findMany({
    where: {
      isDeleted: false,
      taskType: 'milestone',
      status: { notIn: ['done', 'cancelled'] },
      dueDate: { lte: soon, gt: new Date() },
    },
    select: {
      id: true,
      code: true,
      title: true,
      projectId: true,
    },
  })

  for (const ms of milestones) {
    const totalChildren = await prisma.task.count({
      where: { parentTaskId: ms.id, isDeleted: false },
    })
    const doneChildren = await prisma.task.count({
      where: { parentTaskId: ms.id, isDeleted: false, status: 'done' },
    })
    if (totalChildren > 0 && doneChildren / totalChildren < 0.5) {
      const completion = Math.round((doneChildren / totalChildren) * 100)
      results.push({
        pattern: 'milestones_at_risk',
        projectId: ms.projectId ?? undefined,
        evidence: {
          milestone: ms.code,
          total: totalChildren,
          done: doneChildren,
          completion,
        },
        suggestedRule: {
          name: 'Alert milestone a rischio',
          description: `La milestone ${ms.code} scade tra meno di 7 giorni ma \u00e8 completata solo al ${completion}%`,
          domain: 'task',
          trigger: {
            type: 'task_deadline_approaching',
            params: { daysBeforeDeadline: 7 },
          },
          conditions: [{ type: 'task_type_is', params: { value: 'milestone' } }],
          actions: [
            {
              type: 'escalate',
              params: {
                message:
                  'La milestone {task.code} scade tra pochi giorni ed \u00e8 completata al {task.progress}%!',
              },
            },
          ],
          cooldownMinutes: 1440, // 1 day
        },
        impact: 'high',
      })
    }
  }
  return results
}

/**
 * 7. Overloaded users: >1.5x average active tasks
 */
async function analyzeOverloadedUsers(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const userCounts = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: {
      isDeleted: false,
      status: { notIn: ['done', 'cancelled'] },
      assigneeId: { not: null },
    },
    _count: { id: true },
  })

  if (userCounts.length < 2) return results

  const avg =
    userCounts.reduce((sum, u) => sum + u._count.id, 0) / userCounts.length
  const threshold = avg * 1.5

  const overloaded = userCounts.filter((u) => u._count.id > threshold)
  if (overloaded.length > 0) {
    // Get user names
    const userIds = overloaded
      .map((u) => u.assigneeId)
      .filter(Boolean) as string[]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    })
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
    )

    for (const u of overloaded) {
      const name = userMap.get(u.assigneeId!) ?? 'Utente'
      results.push({
        pattern: 'overloaded_users',
        evidence: {
          userId: u.assigneeId,
          userName: name,
          activeTasks: u._count.id,
          teamAverage: Math.round(avg),
        },
        suggestedRule: {
          name: `Redistribuire carico: ${name}`,
          description: `${name} ha ${u._count.id} task attivi (media team: ${Math.round(avg)})`,
          domain: 'task',
          trigger: { type: 'task_assigned', params: {} },
          conditions: [
            {
              type: 'user_workload_above',
              params: { maxTasks: Math.ceil(threshold) },
            },
          ],
          actions: [
            {
              type: 'notify_project_owner',
              params: {
                message: `Attenzione: ${name} ha troppi task attivi. Considerare redistribuzione.`,
              },
            },
          ],
          cooldownMinutes: 10080, // 7 days
        },
        impact: 'medium',
      })
    }
  }
  return results
}

/**
 * 8. Projects without automation rules
 */
async function analyzeProjectsWithoutAutomation(): Promise<PatternResult[]> {
  const results: PatternResult[] = []
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      status: { notIn: ['cancelled', 'completed'] },
    },
    select: {
      id: true,
      name: true,
      _count: { select: { automationRules: { where: { isDeleted: false } } } },
    },
  })

  for (const p of projects) {
    if (p._count.automationRules === 0) {
      results.push({
        pattern: 'no_automation',
        projectId: p.id,
        evidence: { projectName: p.name },
        suggestedRule: {
          name: `Pacchetto base per ${p.name}`,
          description: `Il progetto ${p.name} non ha automazioni attive`,
          domain: 'task',
          trigger: { type: 'task_overdue', params: {} },
          conditions: [{ type: 'task_has_assignee', params: {} }],
          actions: [
            {
              type: 'notify_assignee',
              params: { message: 'Il task {task.code} \u00e8 scaduto!' },
            },
          ],
          cooldownMinutes: 60,
        },
        impact: 'low',
      })
    }
  }
  return results
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Runs all 8 pattern analyzers and creates new recommendations for discovered patterns.
 * Skips patterns that already have a pending recommendation for the same pattern+project.
 * Returns the number of newly created recommendations.
 */
export async function generateRecommendations(): Promise<number> {
  logger.info('Generating automation recommendations...')

  const allResults: PatternResult[] = []

  // Run all analyzers (catch each independently so one failure doesn't stop others)
  const analyzers = [
    analyzeLateTasks,
    analyzeStuckTasks,
    analyzeOrphanedParents,
    analyzeUnownedHighRisks,
    analyzeExpiredDocuments,
    analyzeMilestonesAtRisk,
    analyzeOverloadedUsers,
    analyzeProjectsWithoutAutomation,
  ]

  for (const analyzer of analyzers) {
    try {
      const results = await analyzer()
      allResults.push(...results)
    } catch (err) {
      logger.error(`Recommendation analyzer failed: ${analyzer.name}`, {
        error: err,
      })
    }
  }

  // Upsert results (skip if same pattern+projectId already pending)
  let created = 0
  for (const result of allResults) {
    const existing = await prisma.automationRecommendation.findFirst({
      where: {
        pattern: result.pattern,
        projectId: result.projectId ?? null,
        status: 'pending',
      },
    })
    if (existing) continue

    await prisma.automationRecommendation.create({
      data: {
        pattern: result.pattern,
        projectId: result.projectId ?? null,
        evidence: JSON.stringify(result.evidence),
        suggestedRule: JSON.stringify(result.suggestedRule),
        impact: result.impact,
        status: 'pending',
      },
    })
    created++
  }

  logger.info(
    `Generated ${created} new recommendations (${allResults.length} total patterns found)`
  )
  return created
}

/**
 * Returns all pending recommendations, optionally filtered by project.
 * Results are ordered by impact (high first) then by creation date (newest first).
 */
export async function getRecommendations(projectId?: string) {
  const where: Record<string, unknown> = { status: 'pending' }
  if (projectId) where['projectId'] = projectId

  const recs = await prisma.automationRecommendation.findMany({
    where,
    orderBy: [{ impact: 'asc' }, { createdAt: 'desc' }], // high < low < medium alphabetically
    include: { project: { select: { id: true, name: true } } },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return recs.map((r: any) => ({
    ...r,
    evidence: JSON.parse(r.evidence as string),
    suggestedRule: JSON.parse(r.suggestedRule as string),
  }))
}

/**
 * Applies a pending recommendation: creates the suggested automation rule and marks
 * the recommendation as applied.
 */
export async function applyRecommendation(id: string, userId: string) {
  const rec = await prisma.automationRecommendation.findUnique({
    where: { id },
  })
  if (!rec || rec.status !== 'pending') {
    throw new Error('Recommendation not found or already processed')
  }

  const suggestedRule = JSON.parse(rec.suggestedRule) as {
    name: string
    description: string
    domain: string
    trigger: TriggerConfig
    conditions: ConditionConfig[]
    actions: ActionConfig[]
    cooldownMinutes: number
  }

  // Create the automation rule from the suggested configuration
  const rule = await automationService.createAutomationRule(
    {
      name: suggestedRule.name,
      description: suggestedRule.description,
      projectId: rec.projectId ?? undefined,
      domain: suggestedRule.domain as 'task' | 'risk' | 'document' | 'project',
      trigger: suggestedRule.trigger,
      conditions: suggestedRule.conditions,
      actions: suggestedRule.actions,
      isActive: true,
      priority: 0,
      conditionLogic: 'AND',
      cooldownMinutes: suggestedRule.cooldownMinutes ?? 0,
    },
    userId
  )

  // Mark as applied
  await prisma.automationRecommendation.update({
    where: { id },
    data: { status: 'applied', appliedRuleId: rule.id },
  })

  logger.info('Recommendation applied', {
    recommendationId: id,
    ruleId: rule.id,
    pattern: rec.pattern,
    userId,
  })

  return rule
}

/**
 * Dismisses a pending recommendation so it no longer shows up.
 */
export async function dismissRecommendation(
  id: string,
  userId: string
): Promise<void> {
  const rec = await prisma.automationRecommendation.findUnique({
    where: { id },
  })
  if (!rec || rec.status !== 'pending') {
    throw new Error('Recommendation not found or already processed')
  }

  await prisma.automationRecommendation.update({
    where: { id },
    data: { status: 'dismissed', dismissedAt: new Date(), dismissedBy: userId },
  })

  logger.info('Recommendation dismissed', {
    recommendationId: id,
    pattern: rec.pattern,
    userId,
  })
}
