/**
 * Email Notification Scheduler - Periodic jobs for critical event emails
 * Runs every hour; sends emails for:
 *   - Tasks due within 48h (or overdue) assigned to the user
 *   - Critical/high-severity open risks (to project managers + direzione)
 *   - Tasks blocked for > 24h (to assignee + project manager)
 *
 * All emails are skipped if SMTP_HOST is not configured.
 * @module scheduler/emailNotificationScheduler
 */

import { prisma } from '../models/prismaClient.js'
import { logger } from '../utils/logger.js'
import {
  sendTaskDueSoonEmail,
  sendCriticalRiskEmail,
  sendBlockedTaskEmail,
} from '../services/emailService.js'

const INTERVAL_MS = 60 * 60 * 1000 // 1 hour
let schedulerHandle: NodeJS.Timeout | null = null

// Deduplication keys to avoid sending the same email twice in a short window
const sentKeys = new Set<string>()
const DEDUP_TTL_MS = 23 * 60 * 60 * 1000 // 23 hours

function dedupeKey(type: string, userId: string, date: string): string {
  return `${type}:${userId}:${date}`
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Job: Tasks due soon ──────────────────────────────────────────────────────

async function jobTasksDueSoon(): Promise<void> {
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find active tasks with dueDate ≤ 48h from now, grouped by assignee
  const tasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      dueDate: { lte: in48h },
      status: { notIn: ['done', 'cancelled'] },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      code: true,
      title: true,
      dueDate: true,
      updatedAt: true,
      assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
      project: { select: { name: true } },
    },
  })

  // Group by assignee
  const byUser = new Map<string, typeof tasks>()
  for (const t of tasks) {
    if (!t.assignee) continue
    const uid = t.assignee.id
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(t)
  }

  const today = todayKey()
  for (const [, userTasks] of byUser) {
    const user = userTasks[0].assignee!
    const key = dedupeKey('due_soon', user.id, today)
    if (sentKeys.has(key)) continue

    const payload = userTasks.map((t) => {
      const due = new Date(t.dueDate!)
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        code: t.code,
        title: t.title,
        projectName: t.project?.name ?? '',
        dueDate: due.toLocaleDateString('it-IT'),
        daysLeft,
      }
    })

    const sent = await sendTaskDueSoonEmail({
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      tasks: payload,
    })

    if (sent) {
      sentKeys.add(key)
      setTimeout(() => sentKeys.delete(key), DEDUP_TTL_MS)
      logger.info(`Email task-due-soon sent to ${user.email} (${userTasks.length} tasks)`)
    }
  }
}

// ─── Job: Critical risks ──────────────────────────────────────────────────────

async function jobCriticalRisks(): Promise<void> {
  const risks = await prisma.risk.findMany({
    where: {
      isDeleted: false,
      probability: { in: ['high', 'certain'] },
      impact: { in: ['high', 'critical'] },
      status: { notIn: ['closed', 'mitigated'] },
    },
    select: {
      id: true,
      code: true,
      title: true,
      probability: true,
      impact: true,
      project: {
        select: {
          name: true,
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
  })

  if (risks.length === 0) return

  // Collect unique recipients: project owners of affected projects
  const recipients = new Map<string, { email: string; firstName: string; lastName: string }>()
  for (const r of risks) {
    const owner = r.project?.owner
    if (owner && !recipients.has(owner.id)) {
      recipients.set(owner.id, { email: owner.email, firstName: owner.firstName, lastName: owner.lastName })
    }
  }

  // Also notify all direzione users
  const direzioneUsers = await prisma.user.findMany({
    where: { role: 'direzione', isActive: true, isDeleted: false },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  for (const u of direzioneUsers) {
    if (!recipients.has(u.id)) {
      recipients.set(u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName })
    }
  }

  const today = todayKey()
  for (const [userId, user] of recipients) {
    const key = dedupeKey('critical_risks', userId, today)
    if (sentKeys.has(key)) continue

    const sent = await sendCriticalRiskEmail({
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      risks: risks.map((r) => ({
        code: r.code,
        title: r.title,
        projectName: r.project?.name ?? '',
        severity: `${r.probability}/${r.impact}`,
      })),
    })

    if (sent) {
      sentKeys.add(key)
      setTimeout(() => sentKeys.delete(key), DEDUP_TTL_MS)
      logger.info(`Email critical-risk sent to ${user.email} (${risks.length} risks)`)
    }
  }
}

// ─── Job: Blocked tasks ───────────────────────────────────────────────────────

async function jobBlockedTasks(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const tasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      status: 'blocked',
      updatedAt: { lte: yesterday },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      code: true,
      title: true,
      updatedAt: true,
      assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
      project: { select: { name: true } },
    },
  })

  if (tasks.length === 0) return

  // Group by assignee
  const byUser = new Map<string, typeof tasks>()
  for (const t of tasks) {
    if (!t.assignee) continue
    const uid = t.assignee.id
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(t)
  }

  const today = todayKey()

  for (const [, userTasks] of byUser) {
    const user = userTasks[0].assignee!
    const key = dedupeKey('blocked_tasks', user.id, today)
    if (sentKeys.has(key)) continue

    const sent = await sendBlockedTaskEmail({
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      tasks: userTasks.map((t) => ({
        code: t.code,
        title: t.title,
        projectName: t.project?.name ?? '',
        blockedSinceDays: Math.ceil((Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    })

    if (sent) {
      sentKeys.add(key)
      setTimeout(() => sentKeys.delete(key), DEDUP_TTL_MS)
      logger.info(`Email blocked-tasks sent to ${user.email} (${userTasks.length} tasks)`)
    }
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function runAllJobs(): Promise<void> {
  try {
    await Promise.all([jobTasksDueSoon(), jobCriticalRisks(), jobBlockedTasks()])
  } catch (err) {
    logger.error('Email notification scheduler error', { err })
  }
}

export function initEmailNotificationScheduler(): void {
  logger.info('Email notification scheduler initialized (interval: 1h)')

  // Run once immediately (after 5s to let server settle)
  setTimeout(() => runAllJobs(), 5000)

  schedulerHandle = setInterval(() => runAllJobs(), INTERVAL_MS)
}

export function stopEmailNotificationScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
    logger.info('Email notification scheduler stopped')
  }
}
