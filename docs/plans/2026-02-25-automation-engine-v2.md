# Automation Engine V2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the automation engine with plugin registry architecture, multi-domain support (task/risk/document/project), document workflow automation, and a pattern-based recommendation engine.

**Architecture:** Registry-based engine where triggers, conditions, actions, and context providers are independent modules registered at startup. Each domain (task, risk, document, project) has its own context provider. A cooldown system prevents notification spam. A recommendation service analyzes historical data and suggests automations.

**Tech Stack:** Prisma 7 (SQL Server), Express, Zod, Socket.io, Zustand, React, TailwindCSS

**Design doc:** `docs/plans/2026-02-25-automation-engine-v2-design.md`

**Current code map:**
- Engine: `server/src/services/automationEngine.ts` (640 lines, monolithic switch statements)
- Service: `server/src/services/automationService.ts` (319 lines)
- Templates: `server/src/services/automationTemplates.ts` (178 lines)
- Scheduler: `server/src/scheduler/automationScheduler.ts` (216 lines)
- Controller: `server/src/controllers/automationController.ts` (415 lines)
- Routes: `server/src/routes/automationRoutes.ts` (97 lines)
- Store: `client/src/stores/automationStore.ts` (289 lines)
- Editor: `client/src/pages/admin/AutomationEditorPage.tsx` (~1300 lines)
- List: `client/src/pages/admin/AutomationListPage.tsx` (607 lines)

---

## Phase 1: Engine V2 Core (Tasks 1–8)

### Task 1: Database Migration — New Fields and Tables

**Files:**
- Modify: `server/prisma/schema.prisma` (AutomationRule model ~line 697, add AutomationCooldown model)

**Step 1: Add new fields to AutomationRule model**

In `schema.prisma`, add to the `AutomationRule` model after `priority`:

```prisma
  domain          String    @default("task")     // task | risk | document | project
  conditionLogic  String    @default("AND")      // AND | OR
  cooldownMinutes Int       @default(0)          @map("cooldown_minutes")
```

**Step 2: Add AutomationCooldown model**

```prisma
model AutomationCooldown {
  id          String   @id @default(uuid())
  ruleId      String   @map("rule_id")
  entityId    String   @map("entity_id")
  lastFiredAt DateTime @map("last_fired_at")
  createdAt   DateTime @default(now()) @map("created_at")

  rule AutomationRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@unique([ruleId, entityId])
  @@map("automation_cooldowns")
}
```

Add the relation `cooldowns AutomationCooldown[]` to the `AutomationRule` model.

**Step 3: Run migration**

```bash
cd server && npx prisma migrate dev --name add_automation_v2_fields
```

**Step 4: Commit**

```bash
git add server/prisma/
git commit -m "feat(db): add automation v2 fields — domain, conditionLogic, cooldown"
```

---

### Task 2: Registry Interfaces and Types

**Files:**
- Create: `server/src/services/automation/types.ts`

**Step 1: Create the types file with all V2 interfaces**

```typescript
// server/src/services/automation/types.ts
import { Prisma } from '@prisma/client'

// ── Domains ──
export type AutomationDomain = 'task' | 'risk' | 'document' | 'project'

// ── Trigger types per domain ──
export type TaskTriggerType =
  | 'task_status_changed' | 'task_created' | 'task_assigned'
  | 'all_subtasks_completed' | 'task_overdue' | 'task_deadline_approaching'
  | 'task_updated' | 'task_commented' | 'task_idle'

export type RiskTriggerType =
  | 'risk_created' | 'risk_status_changed' | 'risk_severity_changed' | 'risk_overdue'

export type DocumentTriggerType =
  | 'document_created' | 'document_status_changed'
  | 'document_expiring' | 'document_expired'

export type ProjectTriggerType =
  | 'project_status_changed' | 'project_budget_threshold'
  | 'milestone_deadline_approaching'

export type TriggerType = TaskTriggerType | RiskTriggerType | DocumentTriggerType | ProjectTriggerType

// ── Condition types ──
export type ConditionType =
  | 'task_priority_is' | 'task_type_is' | 'task_has_assignee'
  | 'task_in_project' | 'task_has_subtasks' | 'task_field_equals'
  | 'entity_in_project' | 'risk_severity_is' | 'document_type_is'
  | 'time_since_last_update' | 'user_workload_above'

// ── Action types ──
export type ActionType =
  | 'notify_user' | 'notify_assignee' | 'notify_project_owner'
  | 'update_parent_status' | 'set_task_field' | 'create_comment' | 'assign_to_user'
  | 'send_email' | 'set_due_date' | 'create_subtask'
  | 'set_risk_status' | 'set_document_status' | 'webhook' | 'escalate'

// ── Configs (stored as JSON in DB) ──
export interface TriggerConfig {
  type: TriggerType
  params: Record<string, unknown>
}

export interface ConditionConfig {
  type: ConditionType
  params: Record<string, unknown>
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, unknown>
}

// ── Event context (loaded by ContextProvider) ──
export interface AutomationContext {
  domain: AutomationDomain
  entityId: string
  projectId: string | null
  userId: string
  entity: Record<string, unknown>       // the full entity object (task/risk/document/project)
  project?: Record<string, unknown>     // loaded project if available
  assignee?: Record<string, unknown>    // loaded assignee/owner if available
  extra: Record<string, unknown>        // trigger-specific data (oldStatus, newStatus, etc.)
}

// ── Registry handler interfaces ──
export interface TriggerHandler {
  type: TriggerType
  domain: AutomationDomain
  label: string
  description: string
  paramsSchema: Record<string, { type: string; label: string; required?: boolean; options?: string[] }>
  matchesEvent(event: AutomationContext, config: TriggerConfig): boolean
}

export interface ConditionEvaluator {
  type: ConditionType
  label: string
  description: string
  applicableDomains: AutomationDomain[]
  paramsSchema: Record<string, { type: string; label: string; required?: boolean }>
  evaluate(context: AutomationContext, config: ConditionConfig): Promise<boolean>
}

export interface ActionExecutor {
  type: ActionType
  label: string
  description: string
  applicableDomains: AutomationDomain[]
  paramsSchema: Record<string, { type: string; label: string; required?: boolean }>
  execute(context: AutomationContext, config: ActionConfig, depth: number): Promise<void>
}

export interface ContextProvider {
  domain: AutomationDomain
  loadContext(entityId: string, userId: string, extra: Record<string, unknown>): Promise<AutomationContext>
}

// ── Trigger event (what callers build to fire the engine) ──
export interface TriggerEvent {
  type: TriggerType
  domain: AutomationDomain
  entityId: string
  projectId: string | null
  userId: string
  extra: Record<string, unknown>   // oldStatus, newStatus, field, fromValue, toValue, etc.
}
```

**Step 2: Commit**

```bash
git add server/src/services/automation/
git commit -m "feat(automation): add V2 registry types and interfaces"
```

---

### Task 3: Automation Registry

**Files:**
- Create: `server/src/services/automation/registry.ts`

**Step 1: Implement the registry**

```typescript
// server/src/services/automation/registry.ts
import {
  TriggerHandler, ConditionEvaluator, ActionExecutor, ContextProvider,
  TriggerType, ConditionType, ActionType, AutomationDomain
} from './types'

class AutomationRegistry {
  private triggers = new Map<TriggerType, TriggerHandler>()
  private conditions = new Map<ConditionType, ConditionEvaluator>()
  private actions = new Map<ActionType, ActionExecutor>()
  private contexts = new Map<AutomationDomain, ContextProvider>()

  registerTrigger(handler: TriggerHandler): void {
    this.triggers.set(handler.type, handler)
  }

  registerCondition(evaluator: ConditionEvaluator): void {
    this.conditions.set(evaluator.type, evaluator)
  }

  registerAction(executor: ActionExecutor): void {
    this.actions.set(executor.type, executor)
  }

  registerContext(provider: ContextProvider): void {
    this.contexts.set(provider.domain, provider)
  }

  getTrigger(type: TriggerType): TriggerHandler | undefined {
    return this.triggers.get(type)
  }

  getCondition(type: ConditionType): ConditionEvaluator | undefined {
    return this.conditions.get(type)
  }

  getAction(type: ActionType): ActionExecutor | undefined {
    return this.actions.get(type)
  }

  getContext(domain: AutomationDomain): ContextProvider | undefined {
    return this.contexts.get(domain)
  }

  getAllTriggers(): TriggerHandler[] {
    return Array.from(this.triggers.values())
  }

  getAllConditions(): ConditionEvaluator[] {
    return Array.from(this.conditions.values())
  }

  getAllActions(): ActionExecutor[] {
    return Array.from(this.actions.values())
  }

  getTriggersForDomain(domain: AutomationDomain): TriggerHandler[] {
    return this.getAllTriggers().filter(t => t.domain === domain)
  }

  getConditionsForDomain(domain: AutomationDomain): ConditionEvaluator[] {
    return this.getAllConditions().filter(c => c.applicableDomains.includes(domain))
  }

  getActionsForDomain(domain: AutomationDomain): ActionExecutor[] {
    return this.getAllActions().filter(a => a.applicableDomains.includes(domain))
  }
}

export const registry = new AutomationRegistry()
```

**Step 2: Commit**

```bash
git add server/src/services/automation/registry.ts
git commit -m "feat(automation): implement plugin registry for triggers, conditions, actions"
```

---

### Task 4: Context Providers

**Files:**
- Create: `server/src/services/automation/contexts/taskContext.ts`
- Create: `server/src/services/automation/contexts/riskContext.ts`
- Create: `server/src/services/automation/contexts/documentContext.ts`
- Create: `server/src/services/automation/contexts/projectContext.ts`
- Create: `server/src/services/automation/contexts/index.ts`

**Step 1: Implement task context provider**

```typescript
// server/src/services/automation/contexts/taskContext.ts
import { prisma } from '../../../models/prismaClient'
import { ContextProvider, AutomationContext } from '../types'

export const taskContextProvider: ContextProvider = {
  domain: 'task',
  async loadContext(entityId, userId, extra): Promise<AutomationContext> {
    const task = await prisma.task.findUnique({
      where: { id: entityId },
      select: {
        id: true, code: true, title: true, taskType: true, status: true,
        priority: true, assigneeId: true, parentTaskId: true, projectId: true,
        departmentId: true, dueDate: true, estimatedHours: true, actualHours: true,
        updatedAt: true,
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, ownerId: true, status: true } },
      }
    })
    if (!task) throw new Error(`Task ${entityId} not found`)

    return {
      domain: 'task',
      entityId,
      projectId: task.projectId,
      userId,
      entity: task as unknown as Record<string, unknown>,
      project: task.project as unknown as Record<string, unknown> ?? undefined,
      assignee: task.assignee as unknown as Record<string, unknown> ?? undefined,
      extra,
    }
  }
}
```

**Step 2: Implement risk context provider**

```typescript
// server/src/services/automation/contexts/riskContext.ts
import { prisma } from '../../../models/prismaClient'
import { ContextProvider, AutomationContext } from '../types'

export const riskContextProvider: ContextProvider = {
  domain: 'risk',
  async loadContext(entityId, userId, extra): Promise<AutomationContext> {
    const risk = await prisma.risk.findUnique({
      where: { id: entityId },
      select: {
        id: true, title: true, status: true, severity: true, probability: true,
        impact: true, ownerId: true, projectId: true, mitigationDueDate: true,
        updatedAt: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, ownerId: true } },
      }
    })
    if (!risk) throw new Error(`Risk ${entityId} not found`)

    return {
      domain: 'risk',
      entityId,
      projectId: risk.projectId,
      userId,
      entity: risk as unknown as Record<string, unknown>,
      project: risk.project as unknown as Record<string, unknown> ?? undefined,
      assignee: risk.owner as unknown as Record<string, unknown> ?? undefined,
      extra,
    }
  }
}
```

**Step 3: Implement document context provider**

```typescript
// server/src/services/automation/contexts/documentContext.ts
import { prisma } from '../../../models/prismaClient'
import { ContextProvider, AutomationContext } from '../types'

export const documentContextProvider: ContextProvider = {
  domain: 'document',
  async loadContext(entityId, userId, extra): Promise<AutomationContext> {
    const doc = await prisma.document.findUnique({
      where: { id: entityId },
      select: {
        id: true, title: true, type: true, status: true,
        projectId: true, createdById: true, approvedById: true,
        reviewDueDate: true, reviewFrequencyDays: true, updatedAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, ownerId: true } },
      }
    })
    if (!doc) throw new Error(`Document ${entityId} not found`)

    return {
      domain: 'document',
      entityId,
      projectId: doc.projectId,
      userId,
      entity: doc as unknown as Record<string, unknown>,
      project: doc.project as unknown as Record<string, unknown> ?? undefined,
      assignee: doc.createdBy as unknown as Record<string, unknown> ?? undefined,
      extra,
    }
  }
}
```

**Step 4: Implement project context provider**

```typescript
// server/src/services/automation/contexts/projectContext.ts
import { prisma } from '../../../models/prismaClient'
import { ContextProvider, AutomationContext } from '../types'

export const projectContextProvider: ContextProvider = {
  domain: 'project',
  async loadContext(entityId, userId, extra): Promise<AutomationContext> {
    const project = await prisma.project.findUnique({
      where: { id: entityId },
      select: {
        id: true, name: true, code: true, status: true,
        ownerId: true, budget: true, actualCost: true,
        startDate: true, endDate: true, updatedAt: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      }
    })
    if (!project) throw new Error(`Project ${entityId} not found`)

    return {
      domain: 'project',
      entityId,
      projectId: entityId,
      userId,
      entity: project as unknown as Record<string, unknown>,
      project: project as unknown as Record<string, unknown>,
      assignee: project.owner as unknown as Record<string, unknown> ?? undefined,
      extra,
    }
  }
}
```

**Step 5: Create index barrel**

```typescript
// server/src/services/automation/contexts/index.ts
export { taskContextProvider } from './taskContext'
export { riskContextProvider } from './riskContext'
export { documentContextProvider } from './documentContext'
export { projectContextProvider } from './projectContext'
```

**Step 6: Commit**

```bash
git add server/src/services/automation/contexts/
git commit -m "feat(automation): implement context providers for all 4 domains"
```

---

### Task 5: Message Interpolation Helper

**Files:**
- Create: `server/src/services/automation/interpolation.ts`

**Step 1: Implement interpolation**

```typescript
// server/src/services/automation/interpolation.ts
import { AutomationContext } from './types'

/**
 * Replaces {placeholder} tokens in a template string with values from the automation context.
 *
 * Supported placeholders:
 *   {task.code}, {task.title}, {task.status}, {task.priority}
 *   {risk.title}, {risk.severity}, {risk.status}
 *   {document.title}, {document.type}, {document.status}
 *   {project.name}, {project.code}, {project.status}
 *   {assignee.name}, {assignee.email}
 *   {dueDate}, {entity.title}
 */
export function interpolateMessage(template: string, context: AutomationContext): string {
  const entity = context.entity
  const project = context.project ?? {}
  const assignee = context.assignee ?? {}

  const assigneeName = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || 'N/A'

  const formatDate = (val: unknown): string => {
    if (!val) return 'N/A'
    const d = val instanceof Date ? val : new Date(val as string)
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('it-IT')
  }

  const replacements: Record<string, string> = {
    // Entity-agnostic
    'entity.title': String(entity.title ?? entity.name ?? ''),
    'dueDate': formatDate(entity.dueDate ?? entity.mitigationDueDate ?? entity.reviewDueDate ?? entity.endDate),

    // Task
    'task.code': String(entity.code ?? ''),
    'task.title': String(entity.title ?? ''),
    'task.status': String(entity.status ?? ''),
    'task.priority': String(entity.priority ?? ''),

    // Risk
    'risk.title': String(entity.title ?? ''),
    'risk.severity': String(entity.severity ?? ''),
    'risk.status': String(entity.status ?? ''),

    // Document
    'document.title': String(entity.title ?? ''),
    'document.type': String(entity.type ?? ''),
    'document.status': String(entity.status ?? ''),

    // Project
    'project.name': String(project.name ?? ''),
    'project.code': String(project.code ?? ''),
    'project.status': String(project.status ?? ''),

    // Assignee/Owner
    'assignee.name': assigneeName,
    'assignee.email': String(assignee.email ?? ''),
  }

  return template.replace(/\{([^}]+)\}/g, (match, key: string) => {
    return replacements[key] ?? match
  })
}
```

**Step 2: Commit**

```bash
git add server/src/services/automation/interpolation.ts
git commit -m "feat(automation): add message interpolation helper with multi-domain support"
```

---

### Task 6: Cooldown System

**Files:**
- Create: `server/src/services/automation/cooldown.ts`

**Step 1: Implement cooldown check and update**

```typescript
// server/src/services/automation/cooldown.ts
import { prisma } from '../../models/prismaClient'
import { logger } from '../../config/logger'

/**
 * Check if a rule can fire for a given entity based on cooldown settings.
 * Returns true if the rule should be skipped (still in cooldown).
 */
export async function isInCooldown(ruleId: string, entityId: string, cooldownMinutes: number): Promise<boolean> {
  if (cooldownMinutes <= 0) return false

  const existing = await prisma.automationCooldown.findUnique({
    where: { ruleId_entityId: { ruleId, entityId } }
  })

  if (!existing) return false

  const cooldownMs = cooldownMinutes * 60 * 1000
  const elapsed = Date.now() - existing.lastFiredAt.getTime()
  return elapsed < cooldownMs
}

/**
 * Record that a rule has fired for a given entity (upsert cooldown record).
 */
export async function recordCooldown(ruleId: string, entityId: string): Promise<void> {
  try {
    await prisma.automationCooldown.upsert({
      where: { ruleId_entityId: { ruleId, entityId } },
      update: { lastFiredAt: new Date() },
      create: { ruleId, entityId, lastFiredAt: new Date() },
    })
  } catch (error) {
    logger.error('Failed to record automation cooldown', { ruleId, entityId, error })
  }
}

/**
 * Clean up stale cooldown records older than 7 days.
 * Run periodically from the scheduler.
 */
export async function cleanupStaleCooldowns(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  try {
    const result = await prisma.automationCooldown.deleteMany({
      where: { lastFiredAt: { lt: cutoff } }
    })
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} stale automation cooldowns`)
    }
  } catch (error) {
    logger.error('Failed to cleanup stale cooldowns', { error })
  }
}
```

**Step 2: Commit**

```bash
git add server/src/services/automation/cooldown.ts
git commit -m "feat(automation): implement cooldown system with deduplication"
```

---

### Task 7: Engine V2 Core — evaluateRules

**Files:**
- Create: `server/src/services/automation/engine.ts`

**Step 1: Implement the V2 engine**

```typescript
// server/src/services/automation/engine.ts
import { prisma } from '../../models/prismaClient'
import { logger } from '../../config/logger'
import { registry } from './registry'
import { isInCooldown, recordCooldown } from './cooldown'
import { interpolateMessage } from './interpolation'
import {
  TriggerEvent, AutomationContext, TriggerConfig, ConditionConfig, ActionConfig,
  TriggerType, AutomationDomain
} from './types'

const MAX_DEPTH = 3

/**
 * Main entry point: evaluate all matching automation rules for a given event.
 */
export async function evaluateRules(event: TriggerEvent, depth: number = 0): Promise<void> {
  if (depth >= MAX_DEPTH) {
    logger.warn('Automation max depth reached', { depth, event: event.type, entityId: event.entityId })
    return
  }

  try {
    const rules = await getMatchingRules(event.projectId, event.type, event.domain)

    for (const rule of rules) {
      try {
        await evaluateSingleRule(rule, event, depth)
      } catch (error) {
        logger.error('Error evaluating automation rule', {
          ruleId: rule.id, ruleName: rule.name, error
        })
      }
    }
  } catch (error) {
    logger.error('Error in automation evaluateRules', { event: event.type, error })
  }
}

async function getMatchingRules(
  projectId: string | null,
  triggerType: TriggerType,
  domain: AutomationDomain
) {
  return prisma.automationRule.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      domain,
      trigger: { contains: triggerType },
      OR: [
        { projectId: null },
        ...(projectId ? [{ projectId }] : []),
      ],
    },
    orderBy: { priority: 'asc' },
    select: {
      id: true, name: true, trigger: true, conditions: true, actions: true,
      conditionLogic: true, cooldownMinutes: true,
    },
  })
}

async function evaluateSingleRule(
  rule: { id: string; name: string; trigger: string; conditions: string; actions: string; conditionLogic: string; cooldownMinutes: number },
  event: TriggerEvent,
  depth: number
): Promise<void> {
  const trigger = JSON.parse(rule.trigger) as TriggerConfig
  const conditions = JSON.parse(rule.conditions) as ConditionConfig[]
  const actions = JSON.parse(rule.actions) as ActionConfig[]

  // 1. Load context via domain provider
  const contextProvider = registry.getContext(event.domain)
  if (!contextProvider) {
    logger.warn(`No context provider for domain: ${event.domain}`)
    return
  }

  let context: AutomationContext
  try {
    context = await contextProvider.loadContext(event.entityId, event.userId, event.extra)
  } catch (error) {
    logger.warn('Failed to load automation context', { domain: event.domain, entityId: event.entityId, error })
    return
  }

  // 2. Check trigger match
  const triggerHandler = registry.getTrigger(trigger.type)
  if (!triggerHandler || !triggerHandler.matchesEvent(context, trigger)) {
    return
  }

  // 3. Check cooldown
  if (await isInCooldown(rule.id, event.entityId, rule.cooldownMinutes)) {
    await logExecution(rule.id, event.entityId, 'skipped', { reason: 'cooldown' })
    return
  }

  // 4. Check conditions (AND/OR)
  const conditionsPassed = await checkConditions(conditions, context, rule.conditionLogic)
  if (!conditionsPassed) {
    return
  }

  // 5. Execute actions
  for (const action of actions) {
    try {
      const executor = registry.getAction(action.type)
      if (!executor) {
        logger.warn(`Unknown action type: ${action.type}`)
        await logExecution(rule.id, event.entityId, 'error', { action: action.type, error: 'Unknown action type' })
        continue
      }

      // Interpolate message params before execution
      if (action.params.message && typeof action.params.message === 'string') {
        action.params.message = interpolateMessage(action.params.message, context)
      }
      if (action.params.subject && typeof action.params.subject === 'string') {
        action.params.subject = interpolateMessage(action.params.subject, context)
      }
      if (action.params.body && typeof action.params.body === 'string') {
        action.params.body = interpolateMessage(action.params.body, context)
      }

      await executor.execute(context, action, depth)
      await logExecution(rule.id, event.entityId, 'success', { action: action.type })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Action execution failed', { ruleId: rule.id, action: action.type, error: message })
      await logExecution(rule.id, event.entityId, 'error', { action: action.type, error: message })
    }
  }

  // 6. Record cooldown & update stats
  await recordCooldown(rule.id, event.entityId)
  await prisma.automationRule.update({
    where: { id: rule.id },
    data: { lastTriggeredAt: new Date(), triggerCount: { increment: 1 } },
  }).catch(err => logger.error('Failed to update rule stats', { ruleId: rule.id, error: err }))
}

async function checkConditions(
  conditions: ConditionConfig[],
  context: AutomationContext,
  logic: string
): Promise<boolean> {
  if (conditions.length === 0) return true

  const results: boolean[] = []
  for (const condition of conditions) {
    const evaluator = registry.getCondition(condition.type)
    if (!evaluator) {
      logger.warn(`Unknown condition type: ${condition.type}`)
      results.push(false) // conservative: unknown condition fails
      continue
    }
    const result = await evaluator.evaluate(context, condition)
    results.push(result)
  }

  return logic === 'OR'
    ? results.some(r => r)
    : results.every(r => r)
}

async function logExecution(
  ruleId: string, triggerId: string | null, status: string, details: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.automationLog.create({
      data: { ruleId, triggerId, status, details: JSON.stringify(details) }
    })
  } catch (error) {
    logger.error('Failed to log automation execution', { ruleId, error })
  }
}

// Re-export for external callers (taskService, riskService, etc.)
export { TriggerEvent } from './types'
```

**Step 2: Commit**

```bash
git add server/src/services/automation/engine.ts
git commit -m "feat(automation): implement V2 engine with registry, cooldown, AND/OR conditions"
```

---

### Task 8: Port Existing Triggers, Conditions, and Actions to Registry

**Files:**
- Create: `server/src/services/automation/triggers/taskTriggers.ts`
- Create: `server/src/services/automation/conditions/taskConditions.ts`
- Create: `server/src/services/automation/actions/notifyActions.ts`
- Create: `server/src/services/automation/actions/taskActions.ts`
- Create: `server/src/services/automation/index.ts` (barrel + init)

**Step 1: Port existing task triggers**

```typescript
// server/src/services/automation/triggers/taskTriggers.ts
import { TriggerHandler, AutomationContext, TriggerConfig } from '../types'

export const taskStatusChanged: TriggerHandler = {
  type: 'task_status_changed',
  domain: 'task',
  label: 'Cambio stato task',
  description: 'Quando lo stato di un task cambia',
  paramsSchema: {
    fromStatus: { type: 'select', label: 'Da stato', options: ['todo','in_progress','review','blocked','done','cancelled'] },
    toStatus: { type: 'select', label: 'A stato', options: ['todo','in_progress','review','blocked','done','cancelled'] },
    taskType: { type: 'select', label: 'Tipo task', options: ['milestone','task','subtask'] },
  },
  matchesEvent(ctx: AutomationContext, config: TriggerConfig): boolean {
    const { fromStatus, toStatus, taskType } = config.params
    if (fromStatus && ctx.extra.oldStatus !== fromStatus) return false
    if (toStatus && ctx.extra.newStatus !== toStatus) return false
    if (taskType && ctx.entity.taskType !== taskType) return false
    return true
  },
}

export const taskCreated: TriggerHandler = {
  type: 'task_created',
  domain: 'task',
  label: 'Task creato',
  description: 'Quando un nuovo task viene creato',
  paramsSchema: {
    taskType: { type: 'select', label: 'Tipo task', options: ['milestone','task','subtask'] },
  },
  matchesEvent(ctx: AutomationContext, config: TriggerConfig): boolean {
    const { taskType } = config.params
    if (taskType && ctx.entity.taskType !== taskType) return false
    return true
  },
}

export const taskAssigned: TriggerHandler = {
  type: 'task_assigned',
  domain: 'task',
  label: 'Task assegnato',
  description: 'Quando un task viene assegnato a un utente',
  paramsSchema: {},
  matchesEvent(): boolean { return true },
}

export const allSubtasksCompleted: TriggerHandler = {
  type: 'all_subtasks_completed',
  domain: 'task',
  label: 'Tutti i subtask completati',
  description: 'Quando tutti i subtask di un task padre sono completati',
  paramsSchema: {},
  matchesEvent(): boolean { return true },
}

export const taskOverdue: TriggerHandler = {
  type: 'task_overdue',
  domain: 'task',
  label: 'Task scaduto',
  description: 'Quando un task supera la data di scadenza',
  paramsSchema: {
    overdueHours: { type: 'number', label: 'Ore di ritardo minime' },
  },
  matchesEvent(): boolean { return true },
}

export const taskDeadlineApproaching: TriggerHandler = {
  type: 'task_deadline_approaching',
  domain: 'task',
  label: 'Scadenza imminente',
  description: 'Quando un task si avvicina alla scadenza',
  paramsSchema: {
    daysBeforeDeadline: { type: 'number', label: 'Giorni prima della scadenza', required: true },
  },
  matchesEvent(ctx: AutomationContext, config: TriggerConfig): boolean {
    const { daysBeforeDeadline } = config.params
    if (daysBeforeDeadline && ctx.extra.daysBeforeDeadline !== daysBeforeDeadline) return false
    return true
  },
}

export const allTaskTriggers = [
  taskStatusChanged, taskCreated, taskAssigned,
  allSubtasksCompleted, taskOverdue, taskDeadlineApproaching,
]
```

**Step 2: Port existing conditions**

```typescript
// server/src/services/automation/conditions/taskConditions.ts
import { prisma } from '../../../models/prismaClient'
import { ConditionEvaluator, AutomationContext, ConditionConfig } from '../types'

const FIELD_ALLOWLIST = new Set(['status', 'priority', 'taskType', 'assigneeId', 'projectId', 'departmentId'])

export const taskPriorityIs: ConditionEvaluator = {
  type: 'task_priority_is',
  label: 'Priorità uguale a',
  description: 'Il task ha una specifica priorità',
  applicableDomains: ['task'],
  paramsSchema: { value: { type: 'select', label: 'Priorità', required: true } },
  async evaluate(ctx, config) { return ctx.entity.priority === config.params.value },
}

export const taskTypeIs: ConditionEvaluator = {
  type: 'task_type_is',
  label: 'Tipo task uguale a',
  description: 'Il task è di un tipo specifico',
  applicableDomains: ['task'],
  paramsSchema: { value: { type: 'select', label: 'Tipo', required: true } },
  async evaluate(ctx, config) { return ctx.entity.taskType === config.params.value },
}

export const taskHasAssignee: ConditionEvaluator = {
  type: 'task_has_assignee',
  label: 'Task ha un assegnatario',
  description: 'Il task ha un utente assegnato',
  applicableDomains: ['task'],
  paramsSchema: {},
  async evaluate(ctx) { return ctx.entity.assigneeId != null },
}

export const taskInProject: ConditionEvaluator = {
  type: 'task_in_project',
  label: 'Task nel progetto',
  description: 'Il task appartiene a un progetto specifico',
  applicableDomains: ['task'],
  paramsSchema: { projectId: { type: 'string', label: 'Progetto', required: true } },
  async evaluate(ctx, config) { return ctx.projectId === config.params.projectId },
}

export const taskHasSubtasks: ConditionEvaluator = {
  type: 'task_has_subtasks',
  label: 'Task ha subtask',
  description: 'Il task ha almeno un subtask',
  applicableDomains: ['task'],
  paramsSchema: {},
  async evaluate(ctx) {
    const count = await prisma.task.count({
      where: { parentTaskId: ctx.entityId, isDeleted: false }
    })
    return count > 0
  },
}

export const taskFieldEquals: ConditionEvaluator = {
  type: 'task_field_equals',
  label: 'Campo uguale a',
  description: 'Un campo del task ha un valore specifico',
  applicableDomains: ['task'],
  paramsSchema: {
    field: { type: 'select', label: 'Campo', required: true },
    value: { type: 'string', label: 'Valore', required: true },
  },
  async evaluate(ctx, config) {
    const field = config.params.field as string
    if (!FIELD_ALLOWLIST.has(field)) return false
    return String(ctx.entity[field] ?? '') === String(config.params.value)
  },
}

export const allTaskConditions = [
  taskPriorityIs, taskTypeIs, taskHasAssignee,
  taskInProject, taskHasSubtasks, taskFieldEquals,
]
```

**Step 3: Port existing notification actions**

```typescript
// server/src/services/automation/actions/notifyActions.ts
import { prisma } from '../../../models/prismaClient'
import * as notificationService from '../../notificationService'
import { ActionExecutor, AutomationContext, ActionConfig } from '../types'

export const notifyUser: ActionExecutor = {
  type: 'notify_user',
  label: 'Notifica utente',
  description: 'Invia una notifica a un utente specifico',
  applicableDomains: ['task', 'risk', 'document', 'project'],
  paramsSchema: {
    userId: { type: 'string', label: 'Utente', required: true },
    message: { type: 'text', label: 'Messaggio' },
  },
  async execute(ctx, config) {
    const userId = config.params.userId as string
    if (!userId) return
    const title = String(ctx.entity.title ?? ctx.entity.name ?? 'Automazione')
    const message = (config.params.message as string) || `Automazione attivata su: ${title}`
    await notificationService.createNotification({
      userId, type: 'automation', title, message,
      data: { entityId: ctx.entityId, domain: ctx.domain },
    })
  },
}

export const notifyAssignee: ActionExecutor = {
  type: 'notify_assignee',
  label: 'Notifica assegnatario',
  description: 'Invia una notifica all\'assegnatario/owner dell\'entità',
  applicableDomains: ['task', 'risk', 'document', 'project'],
  paramsSchema: {
    message: { type: 'text', label: 'Messaggio' },
  },
  async execute(ctx, config) {
    const assigneeId = (ctx.assignee?.id ?? ctx.entity.assigneeId ?? ctx.entity.ownerId) as string | undefined
    if (!assigneeId) return
    const title = String(ctx.entity.title ?? ctx.entity.name ?? 'Automazione')
    const message = (config.params.message as string) || `Automazione attivata su: ${title}`
    await notificationService.createNotification({
      userId: assigneeId, type: 'automation', title, message,
      data: { entityId: ctx.entityId, domain: ctx.domain },
    })
  },
}

export const notifyProjectOwner: ActionExecutor = {
  type: 'notify_project_owner',
  label: 'Notifica owner progetto',
  description: 'Invia una notifica al proprietario del progetto',
  applicableDomains: ['task', 'risk', 'document', 'project'],
  paramsSchema: {
    message: { type: 'text', label: 'Messaggio' },
  },
  async execute(ctx, config) {
    const ownerId = ctx.project?.ownerId as string | undefined
    if (!ownerId) return
    const title = String(ctx.entity.title ?? ctx.entity.name ?? 'Automazione')
    const message = (config.params.message as string) || `Automazione attivata su: ${title}`
    await notificationService.createNotification({
      userId: ownerId, type: 'automation', title, message,
      data: { entityId: ctx.entityId, domain: ctx.domain },
    })
  },
}

export const allNotifyActions = [notifyUser, notifyAssignee, notifyProjectOwner]
```

**Step 4: Port existing task-specific actions**

```typescript
// server/src/services/automation/actions/taskActions.ts
import { prisma } from '../../../models/prismaClient'
import * as taskService from '../../taskService'
import { logger } from '../../../config/logger'
import { ActionExecutor, AutomationContext, ActionConfig } from '../types'
import { evaluateRules } from '../engine'

const ALLOWED_SET_FIELDS = new Set(['priority', 'title', 'description', 'blockedReason', 'estimatedHours', 'actualHours'])

export const updateParentStatus: ActionExecutor = {
  type: 'update_parent_status',
  label: 'Aggiorna stato parent',
  description: 'Cambia lo stato del task genitore',
  applicableDomains: ['task'],
  paramsSchema: { status: { type: 'select', label: 'Nuovo stato', required: true } },
  async execute(ctx, config, depth) {
    const parentId = ctx.entity.parentTaskId as string | null
    if (!parentId) return
    const newStatus = config.params.status as string
    // Use taskService to respect workflow validation
    await taskService.changeTaskStatus(parentId, newStatus, ctx.userId)
    // Chain: re-evaluate on parent
    evaluateRules({
      type: 'task_status_changed', domain: 'task',
      entityId: parentId, projectId: ctx.projectId, userId: ctx.userId,
      extra: { newStatus },
    }, depth + 1).catch(err => logger.error('Chained automation failed', { error: err }))
  },
}

export const setTaskField: ActionExecutor = {
  type: 'set_task_field',
  label: 'Imposta campo task',
  description: 'Imposta un campo del task a un valore specifico',
  applicableDomains: ['task'],
  paramsSchema: {
    field: { type: 'select', label: 'Campo', required: true },
    value: { type: 'string', label: 'Valore', required: true },
  },
  async execute(ctx, config) {
    const field = config.params.field as string
    const value = config.params.value
    // Status changes go through taskService for workflow enforcement
    if (field === 'status') {
      await taskService.changeTaskStatus(ctx.entityId, value as string, ctx.userId)
      return
    }
    if (!ALLOWED_SET_FIELDS.has(field)) {
      logger.warn(`set_task_field: field "${field}" not allowed`)
      return
    }
    await prisma.task.update({
      where: { id: ctx.entityId },
      data: { [field]: value },
    })
  },
}

export const createComment: ActionExecutor = {
  type: 'create_comment',
  label: 'Crea commento',
  description: 'Aggiunge un commento automatico al task',
  applicableDomains: ['task'],
  paramsSchema: { message: { type: 'text', label: 'Messaggio', required: true } },
  async execute(ctx, config) {
    const message = config.params.message as string
    if (!message) return
    // Use the triggering user, fallback to system
    let authorId = ctx.userId
    if (!authorId || authorId === 'system') {
      const admin = await prisma.user.findFirst({
        where: { role: 'admin', isDeleted: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      authorId = admin?.id ?? ctx.userId
    }
    await prisma.comment.create({
      data: { content: message, taskId: ctx.entityId, authorId },
    })
  },
}

export const assignToUser: ActionExecutor = {
  type: 'assign_to_user',
  label: 'Assegna a utente',
  description: 'Assegna il task a un utente specifico',
  applicableDomains: ['task'],
  paramsSchema: { userId: { type: 'string', label: 'Utente', required: true } },
  async execute(ctx, config, depth) {
    const userId = config.params.userId as string
    if (!userId) {
      logger.warn('assign_to_user: no userId provided')
      return
    }
    await prisma.task.update({
      where: { id: ctx.entityId },
      data: { assigneeId: userId },
    })
    evaluateRules({
      type: 'task_assigned', domain: 'task',
      entityId: ctx.entityId, projectId: ctx.projectId, userId: ctx.userId,
      extra: { oldAssigneeId: ctx.entity.assigneeId, newAssigneeId: userId },
    }, depth + 1).catch(err => logger.error('Chained automation failed', { error: err }))
  },
}

export const allTaskActions = [updateParentStatus, setTaskField, createComment, assignToUser]
```

**Step 5: Create barrel + initialization**

```typescript
// server/src/services/automation/index.ts
import { registry } from './registry'

// Context providers
import {
  taskContextProvider, riskContextProvider,
  documentContextProvider, projectContextProvider
} from './contexts'

// Triggers
import { allTaskTriggers } from './triggers/taskTriggers'

// Conditions
import { allTaskConditions } from './conditions/taskConditions'

// Actions
import { allNotifyActions } from './actions/notifyActions'
import { allTaskActions } from './actions/taskActions'

/**
 * Initialize the automation registry with all handlers.
 * Call this once at server startup.
 */
export function initializeAutomationRegistry(): void {
  // Register context providers
  registry.registerContext(taskContextProvider)
  registry.registerContext(riskContextProvider)
  registry.registerContext(documentContextProvider)
  registry.registerContext(projectContextProvider)

  // Register triggers
  allTaskTriggers.forEach(t => registry.registerTrigger(t))

  // Register conditions
  allTaskConditions.forEach(c => registry.registerCondition(c))

  // Register actions
  allNotifyActions.forEach(a => registry.registerAction(a))
  allTaskActions.forEach(a => registry.registerAction(a))
}

// Re-exports
export { evaluateRules } from './engine'
export { registry } from './registry'
export type { TriggerEvent, AutomationDomain, TriggerType, ConditionType, ActionType } from './types'
```

**Step 6: Commit**

```bash
git add server/src/services/automation/
git commit -m "feat(automation): port all existing triggers, conditions, actions to V2 registry"
```

---

## Phase 2: Integration — Wire V2 Into Existing Code (Tasks 9–12)

### Task 9: Initialize Registry at Server Startup

**Files:**
- Modify: `server/src/index.ts` or `server/src/app.ts` — add `initializeAutomationRegistry()` call

**Step 1: Add initialization**

In `server/src/app.ts` (or wherever the server boots), add near the top after imports:

```typescript
import { initializeAutomationRegistry } from './services/automation'
```

And call it before routes are registered:

```typescript
initializeAutomationRegistry()
```

**Step 2: Commit**

```bash
git add server/src/app.ts
git commit -m "feat(automation): initialize V2 registry at server startup"
```

---

### Task 10: Update taskService to Use V2 Engine

**Files:**
- Modify: `server/src/services/taskService.ts` — replace V1 `evaluateRules` import with V2

**Step 1: Change import**

Replace:
```typescript
import { evaluateRules } from './automationEngine'
```
With:
```typescript
import { evaluateRules } from './automation'
```

**Step 2: Update the 3 call sites to include `domain: 'task'`**

At line ~245 (createTask), add `domain: 'task'` and rename `data` → `extra`:
```typescript
evaluateRules({
  type: 'task_created',
  domain: 'task',
  entityId: task.id,
  projectId: task.projectId ?? null,
  userId,
  extra: { task: { ... } }  // keep existing data but as extra
})
```

Same pattern for the other 2 call sites (~line 538 `task_assigned` and ~line 721 `task_status_changed` + `all_subtasks_completed`).

**Step 3: Commit**

```bash
git add server/src/services/taskService.ts
git commit -m "refactor(automation): wire taskService to V2 engine"
```

---

### Task 11: Update Scheduler to Use V2 Engine

**Files:**
- Modify: `server/src/scheduler/automationScheduler.ts`

**Step 1: Change import to V2**

Replace import of `evaluateRules` from `../services/automationEngine` with `../services/automation`.

**Step 2: Add `domain: 'task'` to all scheduler events and use `extra` instead of `data`**

Update `runOverdueCheck()` and `runDeadlineApproachingCheck()` to include `domain: 'task'` and use `extra` key.

**Step 3: Add cooldown cleanup call**

Import `cleanupStaleCooldowns` from `../services/automation/cooldown` and call it once per scheduler cycle.

**Step 4: Commit**

```bash
git add server/src/scheduler/automationScheduler.ts
git commit -m "refactor(automation): wire scheduler to V2 engine with cooldown cleanup"
```

---

### Task 12: Update Controller, Service, and Schemas for V2 Fields

**Files:**
- Modify: `server/src/controllers/automationController.ts` — add `domain`, `conditionLogic`, `cooldownMinutes` to Zod schemas
- Modify: `server/src/services/automationService.ts` — add new fields to select, create, update
- Modify: `server/src/routes/automationRoutes.ts` — add endpoint for registry metadata

**Step 1: Update Zod schemas in controller**

Add to `createSchema`:
```typescript
domain: z.enum(['task', 'risk', 'document', 'project']).default('task'),
conditionLogic: z.enum(['AND', 'OR']).default('AND'),
cooldownMinutes: z.number().int().min(0).max(10080).default(0),
```

Expand `triggerConfigSchema.type` enum with all new trigger types.
Expand `conditionConfigSchema.type` enum with all new condition types.
Expand `actionConfigSchema.type` enum with all new action types.

**Step 2: Update service select fields**

Add `domain`, `conditionLogic`, `cooldownMinutes` to `ruleSelectFields` and `ruleWithRelationsSelect`.

**Step 3: Add registry metadata endpoint**

New handler `getRegistryMetadata` in controller:
```typescript
export async function getRegistryMetadata(req: Request, res: Response) {
  const { registry } = await import('../services/automation')
  res.json({
    success: true,
    data: {
      triggers: registry.getAllTriggers().map(t => ({
        type: t.type, domain: t.domain, label: t.label,
        description: t.description, paramsSchema: t.paramsSchema,
      })),
      conditions: registry.getAllConditions().map(c => ({
        type: c.type, label: c.label, description: c.description,
        applicableDomains: c.applicableDomains, paramsSchema: c.paramsSchema,
      })),
      actions: registry.getAllActions().map(a => ({
        type: a.type, label: a.label, description: a.description,
        applicableDomains: a.applicableDomains, paramsSchema: a.paramsSchema,
      })),
    }
  })
}
```

**Step 4: Add route**

```typescript
router.get('/registry', authMiddleware, authorize('admin', 'direzione'), getRegistryMetadata)
```

**Step 5: Commit**

```bash
git add server/src/controllers/automationController.ts server/src/services/automationService.ts server/src/routes/automationRoutes.ts
git commit -m "feat(automation): update controller/service/routes for V2 fields + registry endpoint"
```

---

## Phase 3: New Triggers for All Domains (Tasks 13–17)

### Task 13: New Task Triggers (task_updated, task_commented, task_idle)

**Files:**
- Modify: `server/src/services/automation/triggers/taskTriggers.ts` — add 3 new triggers
- Modify: `server/src/services/taskService.ts` — fire `task_updated` on field changes
- Modify: `server/src/services/commentService.ts` — fire `task_commented`
- Modify: `server/src/scheduler/automationScheduler.ts` — add `task_idle` check
- Modify: `server/src/services/automation/index.ts` — register new triggers

**Step 1: Add trigger handlers in `taskTriggers.ts`**

```typescript
export const taskUpdated: TriggerHandler = {
  type: 'task_updated',
  domain: 'task',
  label: 'Task aggiornato',
  description: 'Quando un campo del task viene modificato',
  paramsSchema: {
    field: { type: 'select', label: 'Campo', options: ['priority','dueDate','estimatedHours','title','description'] },
    fromValue: { type: 'string', label: 'Da valore' },
    toValue: { type: 'string', label: 'A valore' },
  },
  matchesEvent(ctx, config) {
    const { field, fromValue, toValue } = config.params
    if (field && ctx.extra.field !== field) return false
    if (fromValue && ctx.extra.fromValue !== fromValue) return false
    if (toValue && ctx.extra.toValue !== toValue) return false
    return true
  },
}

export const taskCommented: TriggerHandler = {
  type: 'task_commented',
  domain: 'task',
  label: 'Nuovo commento',
  description: 'Quando viene aggiunto un commento a un task',
  paramsSchema: {
    mentionsUser: { type: 'string', label: 'Menziona utente (ID)' },
  },
  matchesEvent(ctx, config) {
    if (config.params.mentionsUser && ctx.extra.mentionedUserIds) {
      const mentions = ctx.extra.mentionedUserIds as string[]
      return mentions.includes(config.params.mentionsUser as string)
    }
    return true
  },
}

export const taskIdle: TriggerHandler = {
  type: 'task_idle',
  domain: 'task',
  label: 'Task inattivo',
  description: 'Quando un task non viene aggiornato da N giorni',
  paramsSchema: {
    idleDays: { type: 'number', label: 'Giorni di inattività', required: true },
  },
  matchesEvent() { return true },
}
```

Add to `allTaskTriggers` array.

**Step 2: Fire `task_updated` from taskService.updateTask()**

In `taskService.ts`, inside `updateTask()`, after the Prisma update, compare changed fields and fire:

```typescript
const TRACKED_FIELDS = ['priority', 'dueDate', 'estimatedHours', 'title', 'description'] as const
for (const field of TRACKED_FIELDS) {
  if (data[field] !== undefined && String(data[field]) !== String(existing[field])) {
    evaluateRules({
      type: 'task_updated', domain: 'task',
      entityId: task.id, projectId: task.projectId ?? null, userId,
      extra: { field, fromValue: existing[field], toValue: data[field] },
    }).catch(err => logger.error('Automation task_updated failed', { error: err }))
  }
}
```

**Step 3: Fire `task_commented` from commentService**

In `commentService.ts`, after creating a comment, fire:

```typescript
import { evaluateRules } from './automation'

// After comment creation:
evaluateRules({
  type: 'task_commented', domain: 'task',
  entityId: comment.taskId, projectId: task.projectId ?? null, userId,
  extra: { commentId: comment.id, mentionedUserIds: extractedMentions ?? [] },
}).catch(err => logger.error('Automation task_commented failed', { error: err }))
```

**Step 4: Add `task_idle` scheduler check**

In `automationScheduler.ts`, add `runIdleCheck()`:

```typescript
async function runIdleCheck(): Promise<void> {
  const idleDays = 7 // default, rules can filter further
  const cutoff = new Date(Date.now() - idleDays * 24 * 60 * 60 * 1000)
  const idleTasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      status: { notIn: ['done', 'cancelled'] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, projectId: true, assigneeId: true }
  })
  for (const task of idleTasks) {
    evaluateRules({
      type: 'task_idle', domain: 'task',
      entityId: task.id, projectId: task.projectId, userId: 'system',
      extra: { idleDays },
    }).catch(err => logger.error('Automation task_idle failed', { error: err }))
  }
}
```

**Step 5: Commit**

```bash
git add server/src/services/automation/triggers/taskTriggers.ts server/src/services/taskService.ts server/src/services/commentService.ts server/src/scheduler/automationScheduler.ts server/src/services/automation/index.ts
git commit -m "feat(automation): add task_updated, task_commented, task_idle triggers"
```

---

### Task 14: Risk Domain Triggers

**Files:**
- Create: `server/src/services/automation/triggers/riskTriggers.ts`
- Modify: `server/src/services/riskService.ts` — fire events
- Modify: `server/src/scheduler/automationScheduler.ts` — add `risk_overdue` check
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: Create risk triggers**

```typescript
// server/src/services/automation/triggers/riskTriggers.ts
import { TriggerHandler } from '../types'

export const riskCreated: TriggerHandler = {
  type: 'risk_created', domain: 'risk',
  label: 'Rischio creato', description: 'Quando un nuovo rischio viene creato',
  paramsSchema: { severity: { type: 'select', label: 'Severità', options: ['low','medium','high'] } },
  matchesEvent(ctx, config) {
    if (config.params.severity && ctx.entity.severity !== config.params.severity) return false
    return true
  },
}

export const riskStatusChanged: TriggerHandler = {
  type: 'risk_status_changed', domain: 'risk',
  label: 'Cambio stato rischio', description: 'Quando lo stato di un rischio cambia',
  paramsSchema: {
    fromStatus: { type: 'select', label: 'Da stato', options: ['open','mitigated','accepted','closed'] },
    toStatus: { type: 'select', label: 'A stato', options: ['open','mitigated','accepted','closed'] },
  },
  matchesEvent(ctx, config) {
    if (config.params.fromStatus && ctx.extra.oldStatus !== config.params.fromStatus) return false
    if (config.params.toStatus && ctx.extra.newStatus !== config.params.toStatus) return false
    return true
  },
}

export const riskSeverityChanged: TriggerHandler = {
  type: 'risk_severity_changed', domain: 'risk',
  label: 'Cambio severità rischio', description: 'Quando la severità di un rischio cambia',
  paramsSchema: {
    fromSeverity: { type: 'select', label: 'Da severità', options: ['low','medium','high'] },
    toSeverity: { type: 'select', label: 'A severità', options: ['low','medium','high'] },
  },
  matchesEvent(ctx, config) {
    if (config.params.fromSeverity && ctx.extra.fromSeverity !== config.params.fromSeverity) return false
    if (config.params.toSeverity && ctx.extra.toSeverity !== config.params.toSeverity) return false
    return true
  },
}

export const riskOverdue: TriggerHandler = {
  type: 'risk_overdue', domain: 'risk',
  label: 'Rischio scaduto', description: 'Quando un rischio supera la data di mitigazione',
  paramsSchema: {},
  matchesEvent() { return true },
}

export const allRiskTriggers = [riskCreated, riskStatusChanged, riskSeverityChanged, riskOverdue]
```

**Step 2: Fire events from riskService**

In `riskService.ts`:
- `createRisk()` → fire `risk_created`
- `changeRiskStatus()` → fire `risk_status_changed`
- `updateRisk()` → fire `risk_severity_changed` when severity changes

**Step 3: Add `risk_overdue` to scheduler**

Query risks with `mitigationDueDate < now` and `status NOT IN ['closed','mitigated']`.

**Step 4: Register in `index.ts`**

**Step 5: Commit**

```bash
git add server/src/services/automation/triggers/riskTriggers.ts server/src/services/riskService.ts server/src/scheduler/automationScheduler.ts server/src/services/automation/index.ts
git commit -m "feat(automation): add risk domain triggers"
```

---

### Task 15: Document Domain Triggers

**Files:**
- Create: `server/src/services/automation/triggers/documentTriggers.ts`
- Modify: `server/prisma/schema.prisma` — add `reviewDueDate`, `reviewFrequencyDays` to Document
- Modify: `server/src/services/documentService.ts` — fire events
- Modify: `server/src/scheduler/automationScheduler.ts` — add document checks
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: DB migration for Document fields**

Add to Document model in `schema.prisma`:
```prisma
  reviewDueDate       DateTime? @map("review_due_date")
  reviewFrequencyDays Int?      @map("review_frequency_days")
```

Run: `cd server && npx prisma migrate dev --name add_document_review_fields`

**Step 2: Create document triggers**

Similar pattern to risk triggers: `document_created`, `document_status_changed`, `document_expiring`, `document_expired`.

**Step 3: Fire events from documentService**

- `createDocument()` → fire `document_created`
- `changeDocumentStatus()` → fire `document_status_changed`
- On status → `approved`: if `reviewFrequencyDays` set, compute and save `reviewDueDate`

**Step 4: Add scheduler checks for `document_expiring` and `document_expired`**

**Step 5: Commit**

```bash
git add server/prisma/ server/src/services/automation/triggers/documentTriggers.ts server/src/services/documentService.ts server/src/scheduler/automationScheduler.ts server/src/services/automation/index.ts
git commit -m "feat(automation): add document domain triggers + review scheduling"
```

---

### Task 16: Project Domain Triggers

**Files:**
- Create: `server/src/services/automation/triggers/projectTriggers.ts`
- Modify: `server/src/services/projectService.ts` — fire events
- Modify: `server/src/scheduler/automationScheduler.ts` — add budget/milestone checks
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: Create project triggers**

`project_status_changed`, `project_budget_threshold`, `milestone_deadline_approaching`.

**Step 2: Fire events from projectService**

- Status changes → `project_status_changed`
- Budget updates → check threshold and fire `project_budget_threshold`

**Step 3: Scheduler checks for milestone deadlines and budget thresholds**

**Step 4: Commit**

```bash
git add server/src/services/automation/triggers/projectTriggers.ts server/src/services/projectService.ts server/src/scheduler/automationScheduler.ts server/src/services/automation/index.ts
git commit -m "feat(automation): add project domain triggers"
```

---

## Phase 4: New Actions and Conditions (Tasks 17–20)

### Task 17: New Cross-Domain Conditions

**Files:**
- Create: `server/src/services/automation/conditions/crossDomainConditions.ts`
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: Implement new conditions**

`entity_in_project`, `risk_severity_is`, `document_type_is`, `time_since_last_update`, `user_workload_above`.

**Step 2: Register and commit**

```bash
git add server/src/services/automation/conditions/ server/src/services/automation/index.ts
git commit -m "feat(automation): add cross-domain conditions"
```

---

### Task 18: New Actions — Email, Due Date, Subtask

**Files:**
- Create: `server/src/services/automation/actions/emailAction.ts`
- Create: `server/src/services/automation/actions/entityActions.ts`
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: Implement `send_email` action**

Uses nodemailer (already a dependency or add it). Template-based HTML email with interpolated subject/body.

**Step 2: Implement `set_due_date` and `create_subtask` actions**

**Step 3: Register and commit**

```bash
git add server/src/services/automation/actions/ server/src/services/automation/index.ts
git commit -m "feat(automation): add email, set_due_date, create_subtask actions"
```

---

### Task 19: New Actions — Risk/Document Status, Webhook, Escalation

**Files:**
- Create: `server/src/services/automation/actions/riskDocActions.ts`
- Create: `server/src/services/automation/actions/webhookAction.ts`
- Create: `server/src/services/automation/actions/escalateAction.ts`
- Modify: `server/src/services/automation/index.ts` — register

**Step 1: Implement `set_risk_status` and `set_document_status`**

Both call the respective service method to enforce workflow validation.

**Step 2: Implement `webhook` action**

```typescript
export const webhookAction: ActionExecutor = {
  type: 'webhook', label: 'Webhook', description: 'Invia HTTP POST a URL esterno',
  applicableDomains: ['task', 'risk', 'document', 'project'],
  paramsSchema: {
    url: { type: 'string', label: 'URL', required: true },
    headers: { type: 'text', label: 'Headers (JSON)' },
    bodyTemplate: { type: 'text', label: 'Body template (JSON)' },
  },
  async execute(ctx, config) {
    const url = config.params.url as string
    const headers = config.params.headers ? JSON.parse(config.params.headers as string) : {}
    const body = { domain: ctx.domain, entityId: ctx.entityId, entity: ctx.entity, ...ctx.extra }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
  },
}
```

**Step 3: Implement `escalate` action**

Escalation creates a notification immediately, then schedules a follow-up escalation after `escalateAfterHours` via a DB record checked by the scheduler.

**Step 4: Register and commit**

```bash
git add server/src/services/automation/actions/ server/src/services/automation/index.ts
git commit -m "feat(automation): add webhook, escalate, risk/document status actions"
```

---

### Task 20: Update Templates for V2

**Files:**
- Modify: `server/src/services/automationTemplates.ts` — add `domain` to existing templates, add new document/risk templates

**Step 1: Add `domain: 'task'` to all existing templates**

**Step 2: Add new templates**

Add document workflow templates (5) and risk templates (2) as defined in the design doc. Add automation packages.

**Step 3: Commit**

```bash
git add server/src/services/automationTemplates.ts
git commit -m "feat(automation): add V2 templates for documents, risks, and packages"
```

---

## Phase 5: Recommendation Engine (Tasks 21–24)

### Task 21: Database Migration — AutomationRecommendation

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add AutomationRecommendation model**

```prisma
model AutomationRecommendation {
  id            String    @id @default(uuid())
  projectId     String?   @map("project_id")
  pattern       String    @db.VarChar(100)
  evidence      String    @db.NVarChar(Max)
  suggestedRule String    @db.NVarChar(Max) @map("suggested_rule")
  impact        String    @db.VarChar(20)    // high | medium | low
  status        String    @default("pending") @db.VarChar(20)  // pending | applied | dismissed
  appliedRuleId String?   @map("applied_rule_id")
  dismissedAt   DateTime? @map("dismissed_at")
  dismissedBy   String?   @map("dismissed_by")
  createdAt     DateTime  @default(now()) @map("created_at")

  project     Project?        @relation(fields: [projectId], references: [id])
  appliedRule AutomationRule? @relation(fields: [appliedRuleId], references: [id])
  dismisser   User?           @relation(fields: [dismissedBy], references: [id])

  @@map("automation_recommendations")
}
```

**Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_automation_recommendations
```

**Step 3: Commit**

```bash
git add server/prisma/
git commit -m "feat(db): add AutomationRecommendation table"
```

---

### Task 22: Recommendation Service — Pattern Analyzers

**Files:**
- Create: `server/src/services/automation/recommendationService.ts`

**Step 1: Implement pattern analyzers**

Each pattern is a function that queries historical data and returns recommendations:

```typescript
interface PatternResult {
  pattern: string
  evidence: Record<string, unknown>
  suggestedRule: { name: string; domain: string; trigger: TriggerConfig; conditions: ConditionConfig[]; actions: ActionConfig[] }
  impact: 'high' | 'medium' | 'low'
  projectId?: string
}

// 8 pattern analyzers as per design doc:
// 1. analyzeLateTasks() — >30% tasks with dueDate < completedAt
// 2. analyzeStuckTasks() — tasks in_progress > median*2 days
// 3. analyzeOrphanedParents() — all subtasks done, parent not
// 4. analyzeUnownedHighRisks() — high severity risks without owner
// 5. analyzeExpiredDocuments() — documents past reviewDueDate
// 6. analyzeMilestonesAtRisk() — milestones <7 days with <50% completion
// 7. analyzeOverloadedUsers() — users with >1.5x avg active tasks
// 8. analyzeProjectsWithoutAutomation() — active projects with 0 rules
```

Main export:
```typescript
export async function generateRecommendations(): Promise<void>
// Runs all 8 analyzers, upserts results to AutomationRecommendation table
// Skips creating recommendations that already exist (same pattern+projectId) and are pending

export async function getRecommendations(projectId?: string): Promise<AutomationRecommendation[]>
export async function applyRecommendation(id: string, userId: string): Promise<AutomationRule>
export async function dismissRecommendation(id: string, userId: string): Promise<void>
```

**Step 2: Commit**

```bash
git add server/src/services/automation/recommendationService.ts
git commit -m "feat(automation): implement recommendation service with 8 pattern analyzers"
```

---

### Task 23: Recommendation API Endpoints

**Files:**
- Modify: `server/src/controllers/automationController.ts` — add recommendation handlers
- Modify: `server/src/routes/automationRoutes.ts` — add routes

**Step 1: Add handlers**

```typescript
// GET /api/automations/recommendations?projectId=...
export async function getRecommendations(req, res) { ... }

// POST /api/automations/recommendations/:id/apply
export async function applyRecommendation(req, res) { ... }

// POST /api/automations/recommendations/:id/dismiss
export async function dismissRecommendation(req, res) { ... }

// POST /api/automations/recommendations/generate (manual trigger)
export async function generateRecommendations(req, res) { ... }
```

**Step 2: Add routes**

```typescript
router.get('/recommendations', authMiddleware, authorize('admin','direzione'), getRecommendationsHandler)
router.post('/recommendations/generate', authMiddleware, authorize('admin'), generateRecommendationsHandler)
router.post('/recommendations/:id/apply', authMiddleware, authorize('admin','direzione'), applyRecommendationHandler)
router.post('/recommendations/:id/dismiss', authMiddleware, authorize('admin','direzione'), dismissRecommendationHandler)
```

**Step 3: Add recommendation generation to scheduler (every 24h)**

**Step 4: Commit**

```bash
git add server/src/controllers/automationController.ts server/src/routes/automationRoutes.ts server/src/scheduler/automationScheduler.ts
git commit -m "feat(automation): add recommendation API endpoints + daily scheduler"
```

---

### Task 24: Automation Packages

**Files:**
- Modify: `server/src/services/automationTemplates.ts` — add packages

**Step 1: Add package definitions**

```typescript
export interface AutomationPackage {
  key: string
  name: string
  description: string
  templates: string[]  // array of template keys
}

export const AUTOMATION_PACKAGES: AutomationPackage[] = [
  { key: 'base', name: 'Pacchetto Base', description: 'Notifiche scadenze + completamento automatico parent', templates: ['notify_overdue', 'notify_deadline_1day', 'auto_complete_parent'] },
  { key: 'risk_management', name: 'Gestione Rischi', description: 'Alert rischi critici + escalation scaduti', templates: ['notify_risk_high', 'escalate_risk_overdue'] },
  { key: 'document_compliance', name: 'Compliance Documentale', description: 'Workflow approvativo + reminder + alert scaduti', templates: ['notify_reviewers', 'reminder_doc_expiring', 'alert_doc_expired'] },
  { key: 'strict_deadlines', name: 'Scadenze Rigorose', description: 'Escalation progressiva + alert inattività', templates: ['escalate_48h', 'escalate_24h', 'notify_owner_overdue', 'alert_idle_5d'] },
]
```

**Step 2: Add endpoint to activate a package**

```typescript
// POST /api/automations/packages/:key/activate?projectId=...
```

**Step 3: Commit**

```bash
git add server/src/services/automationTemplates.ts server/src/controllers/automationController.ts server/src/routes/automationRoutes.ts
git commit -m "feat(automation): add automation packages for bulk template activation"
```

---

## Phase 6: Frontend Updates (Tasks 25–28)

### Task 25: Update automationStore for V2

**Files:**
- Modify: `client/src/stores/automationStore.ts`

**Step 1: Update types to match V2**

Add `domain`, `conditionLogic`, `cooldownMinutes` to `AutomationRule` interface.
Add `AutomationRecommendation` interface.
Add new type unions for all trigger/condition/action types.
Add store actions: `fetchRecommendations`, `applyRecommendation`, `dismissRecommendation`, `fetchRegistryMetadata`, `activatePackage`.

**Step 2: Commit**

```bash
git add client/src/stores/automationStore.ts
git commit -m "feat(automation): update store for V2 types, recommendations, registry metadata"
```

---

### Task 26: Update AutomationEditorPage for V2

**Files:**
- Modify: `client/src/pages/admin/AutomationEditorPage.tsx`

**Step 1: Add domain selection as Step 0**

New first step: domain selector (task/risk/document/project) with icons and descriptions.

**Step 2: Dynamically filter triggers/conditions/actions by selected domain**

Use registry metadata from the API (or hardcoded initially) to show only relevant options per domain.

**Step 3: Add `conditionLogic` toggle (AND/OR) in Step 3**

**Step 4: Add `cooldownMinutes` field in Step 5 (settings)**

**Step 5: Update param forms for new trigger/condition/action types**

Add UI for new trigger params (field picker, severity picker, etc.), new condition params, and new action params (email fields, webhook URL, etc.).

**Step 6: Commit**

```bash
git add client/src/pages/admin/AutomationEditorPage.tsx
git commit -m "feat(automation): update editor for V2 — multi-domain, AND/OR, cooldown, new types"
```

---

### Task 27: Update AutomationListPage — Recommendations Section

**Files:**
- Modify: `client/src/pages/admin/AutomationListPage.tsx`

**Step 1: Add domain badge to RuleCard**

Show domain icon/badge (task/risk/document/project) on each rule card.

**Step 2: Add Recommendations section at top of page**

```tsx
{recommendations.length > 0 && (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
      <Lightbulb className="h-5 w-5 text-amber-500" />
      Suggerimenti
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} recommendation={rec}
          onApply={() => applyRecommendation(rec.id)}
          onDismiss={() => dismissRecommendation(rec.id)} />
      ))}
    </div>
  </section>
)}
```

**Step 3: Create RecommendationCard component**

Card with: pattern icon, title, evidence text, impact badge (high=red, medium=amber, low=green), "Attiva" and "Ignora" buttons.

**Step 4: Add Packages section**

Collapsible section showing available packages with "Attiva pacchetto" button.

**Step 5: Update TRIGGER_LABELS, ACTION_LABELS, TRIGGER_COLORS for all new types**

**Step 6: Commit**

```bash
git add client/src/pages/admin/AutomationListPage.tsx
git commit -m "feat(automation): add recommendations section, domain badges, packages to list page"
```

---

### Task 28: Update Document Pages for Review Fields

**Files:**
- Modify: `client/src/pages/documents/DocumentFormPage.tsx` — add `reviewDueDate`, `reviewFrequencyDays` fields
- Modify: `client/src/pages/documents/DocumentDetailPage.tsx` — show review info
- Modify: `client/src/stores/documentStore.ts` — add new fields to types

**Step 1: Add fields to document form**

Optional date picker for `reviewDueDate` and number input for `reviewFrequencyDays`.

**Step 2: Show review status on detail page**

Show upcoming review date, frequency, and overdue warning badge.

**Step 3: Commit**

```bash
git add client/src/pages/documents/ client/src/stores/documentStore.ts
git commit -m "feat(documents): add review scheduling fields to form and detail pages"
```

---

## Phase 7: Cleanup and Deprecation (Task 29)

### Task 29: Deprecate Old Engine, Final Integration

**Files:**
- Modify: `server/src/services/automationEngine.ts` — add deprecation notice, re-export from V2
- Verify: all imports across the codebase point to `./automation` not `./automationEngine`

**Step 1: Replace old engine with thin re-export**

```typescript
// server/src/services/automationEngine.ts
// DEPRECATED: Use ./automation instead
export { evaluateRules } from './automation'
export type { TriggerEvent } from './automation'
```

**Step 2: Verify no direct imports remain**

Search for `from './automationEngine'` and `from '../automationEngine'` across all files.

**Step 3: Final commit**

```bash
git add .
git commit -m "refactor(automation): deprecate V1 engine, all imports use V2"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Core V2 | 1–8 | Registry architecture, cooldown, interpolation, AND/OR, workflow enforcement |
| 2. Integration | 9–12 | V2 wired into existing services, controller, scheduler |
| 3. New Triggers | 13–16 | 18 triggers across 4 domains (task, risk, document, project) |
| 4. New Actions/Conditions | 17–20 | 7 new actions, 5 new conditions, updated templates |
| 5. Recommendations | 21–24 | Pattern analysis, 8 analyzers, packages, API endpoints |
| 6. Frontend | 25–28 | Multi-domain editor, recommendations UI, document review fields |
| 7. Cleanup | 29 | Deprecate V1, verify integration |

**Total: 29 tasks across 7 phases.**
**DB migrations: 3** (V2 fields, document review fields, recommendations table)
