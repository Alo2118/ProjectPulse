# Project Phases from Milestones — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive project phases from configurable templates, link milestones to phases, separate project condition (active/on_hold/cancelled/completed) from phase progression.

**Architecture:** Extend `WorkflowTemplate` with a `domain` discriminator (`task` | `project`). Projects get `phaseTemplateId`, `phases` (JSON local copy), and `currentPhaseKey`. Milestones get `phaseKey`. Phase advancement is semi-automatic (system suggests, user confirms). Existing workflow CRUD is reused with domain filtering.

**Tech Stack:** Prisma 7 + SQL Server, Express, Zod, TanStack Query 5, React 18, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-10-project-phases-from-milestones-design.md`

---

## Chunk 1: Backend Schema & Types

### Task 1: Prisma schema migration

**Files:**
- Modify: `server/prisma/schema.prisma:684-702` (WorkflowTemplate), `server/prisma/schema.prisma:80-120` (Project), `server/prisma/schema.prisma:153-204` (Task)

- [ ] **Step 1: Add `domain` field to WorkflowTemplate model**

In `server/prisma/schema.prisma`, inside `model WorkflowTemplate` (line ~684), add after `isActive`:

```prisma
  domain      String   @default("task") @map("domain")
```

- [ ] **Step 2: Add phase fields to Project model**

In `server/prisma/schema.prisma`, inside `model Project` (line ~80), add after `workflowTemplateId`:

```prisma
  phaseTemplateId String?  @map("phase_template_id")
  phases          String?  @db.NVarChar(Max) @map("phases")
  currentPhaseKey String?  @map("current_phase_key")
```

Add the relation (after the existing `workflowTemplate` relation):

```prisma
  phaseTemplate WorkflowTemplate? @relation("ProjectPhaseTemplate", fields: [phaseTemplateId], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

In `model WorkflowTemplate`, add a second relation for phase templates:

```prisma
  phaseProjects Project[] @relation("ProjectPhaseTemplate")
```

- [ ] **Step 3: Add `phaseKey` to Task model**

In `server/prisma/schema.prisma`, inside `model Task` (line ~153), add after `position`:

```prisma
  phaseKey    String?  @map("phase_key")
```

- [ ] **Step 4: Run migration**

```bash
cd server && npx prisma migrate dev --name add_project_phase_system
```

Expected: Migration succeeds, new columns created with NULL defaults.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add project phase system schema — domain on WorkflowTemplate, phases/currentPhaseKey on Project, phaseKey on Task"
```

---

### Task 2: Update backend types and enums

**Files:**
- Modify: `server/src/types/index.ts:38` (ProjectStatus type)
- Modify: `server/src/constants/enums.ts:40-54` (PROJECT_STATUSES, projectStatusSchema)

- [ ] **Step 1: Change ProjectStatus to 4 condition values in enums.ts**

In `server/src/constants/enums.ts`, replace lines 40-54:

```typescript
export const PROJECT_STATUSES = [
  'active',
  'on_hold',
  'cancelled',
  'completed',
] as const

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

export const projectStatusSchema = z.enum(PROJECT_STATUSES)
export const projectPrioritySchema = z.enum(PROJECT_PRIORITIES)
```

- [ ] **Step 2: Add workflow domain enum**

In `server/src/constants/enums.ts`, add after the PROJECT section:

```typescript
// ============================================================
// WORKFLOW
// ============================================================

export const WORKFLOW_DOMAINS = ['task', 'project'] as const
export const workflowDomainSchema = z.enum(WORKFLOW_DOMAINS)
```

- [ ] **Step 3: Update ProjectStatus type in types/index.ts**

In `server/src/types/index.ts`, change line 38:

```typescript
export type ProjectStatus = 'active' | 'on_hold' | 'cancelled' | 'completed'
```

- [ ] **Step 4: Add ProjectPhase interface in types/index.ts**

Add after the ProjectStatus type:

```typescript
export interface ProjectPhase {
  key: string
  label: string
  description: string
  order: number
  color: string
  isFinal: boolean
  isInitial: boolean
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: Compilation errors in files that reference old PROJECT_STATUSES values — these will be fixed in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add server/src/types/index.ts server/src/constants/enums.ts
git commit -m "feat(types): update ProjectStatus to 4 conditions, add ProjectPhase interface and workflow domain enum"
```

---

### Task 3: Update selectFields and project schemas

**Files:**
- Modify: `server/src/utils/selectFields.ts:58-97` (add new fields to project selects)
- Modify: `server/src/schemas/projectSchemas.ts` (update schemas)

- [ ] **Step 1: Add new fields to projectSelectFields**

In `server/src/utils/selectFields.ts`, add inside `projectSelectFields` (after `createdById`):

```typescript
  phaseTemplateId: true,
  phases: true,
  currentPhaseKey: true,
```

- [ ] **Step 2: Update createProjectSchema**

In `server/src/schemas/projectSchemas.ts`, add to `createProjectSchema` (after `priority`):

```typescript
  phaseTemplateId: z.string().uuid('Invalid phase template ID').nullish(),
```

- [ ] **Step 3: Update updateProjectSchema — remove status, add phase fields**

In `server/src/schemas/projectSchemas.ts`, replace `updateProjectSchema`:

```typescript
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  ownerId: z.string().uuid().optional(),
  startDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  targetEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  actualEndDate: z.preprocess(datePreprocess, z.string().datetime().nullish()),
  budget: z.preprocess(numberPreprocess, z.number().positive().nullish()),
  priority: projectPrioritySchema.optional(),
})
```

Note: `status` removed from updateProjectSchema — status changes go through dedicated endpoints.

- [ ] **Step 4: Update projectStatusChangeSchema**

Replace `projectStatusChangeSchema`:

```typescript
export const projectStatusChangeSchema = z.object({
  status: z.enum(['active', 'on_hold', 'cancelled']),
})
```

Note: `completed` is not manually settable — it's set automatically when advancing through the final phase.

- [ ] **Step 5: Add phase-specific schemas**

Add at the end of `server/src/schemas/projectSchemas.ts`:

```typescript
// ============================================================
// PHASE SCHEMAS
// ============================================================

export const projectPhaseSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z_]+$/, 'Phase key must be lowercase with underscores'),
  label: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  order: z.number().int().min(0),
  color: z.string().min(1).max(20),
  isFinal: z.boolean(),
  isInitial: z.boolean(),
})

export const updateProjectPhasesSchema = z.object({
  phases: z.array(projectPhaseSchema).min(1, 'At least one phase is required'),
  transitions: z.record(z.string(), z.array(z.string())),
})

export const advancePhaseSchema = z.object({
  targetPhaseKey: z.string().min(1).max(50),
})

export const savePhasesAsTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(1000).optional(),
})
```

- [ ] **Step 6: Update projectQuerySchema for new status values**

The `projectQuerySchema` uses `optionalQueryEnum(projectStatusSchema)` which will automatically use the new 4-value enum. No change needed.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add server/src/utils/selectFields.ts server/src/schemas/projectSchemas.ts
git commit -m "feat(schemas): update project select fields and schemas for phase system"
```

---

### Task 4: Update task schema for phaseKey

**Files:**
- Modify: `server/src/schemas/taskSchemas.ts:31-47` (createTaskSchema)
- Modify: `server/src/schemas/taskSchemas.ts:49+` (updateTaskSchema)

- [ ] **Step 1: Add phaseKey to createTaskSchema**

In `server/src/schemas/taskSchemas.ts`, add to `createTaskSchema` (after `position`):

```typescript
  phaseKey: z.string().min(1).max(50).regex(/^[a-z_]+$/).nullish(),
```

- [ ] **Step 2: Add phaseKey to updateTaskSchema**

In `server/src/schemas/taskSchemas.ts`, add to `updateTaskSchema` (after the existing fields):

```typescript
  phaseKey: z.string().min(1).max(50).regex(/^[a-z_]+$/).nullish(),
```

- [ ] **Step 3: Commit**

```bash
git add server/src/schemas/taskSchemas.ts
git commit -m "feat(schemas): add phaseKey to task create/update schemas"
```

---

## Chunk 2: Backend Services & Controllers

### Task 5: Update workflowService for domain filtering

**Files:**
- Modify: `server/src/services/workflowService.ts:164-172` (getWorkflowTemplates)
- Modify: `server/src/services/workflowService.ts:194-238` (createWorkflowTemplate)
- Modify: `server/src/controllers/workflowController.ts:70-82` (getWorkflows)

- [ ] **Step 1: Add domain to getWorkflowTemplates**

In `server/src/services/workflowService.ts`, update `getWorkflowTemplates` to accept domain filter:

```typescript
export async function getWorkflowTemplates(domain?: string): Promise<ParsedWorkflow[]> {
  const records = await prisma.workflowTemplate.findMany({
    where: {
      isActive: true,
      ...(domain ? { domain } : {}),
    },
    select: workflowSelectFields,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  return records.map((r) => parseWorkflowTemplate(r as WorkflowRecord))
}
```

- [ ] **Step 2: Add domain to workflowSelectFields**

In `server/src/services/workflowService.ts`, add to `workflowSelectFields`:

```typescript
  domain: true,
```

- [ ] **Step 3: Add domain to WorkflowRecord type and ParsedWorkflow**

Update `WorkflowRecord` type:

```typescript
type WorkflowRecord = {
  // ... existing fields ...
  domain: string
}
```

Update `ParsedWorkflow` interface:

```typescript
export interface ParsedWorkflow {
  id: string
  name: string
  domain: string
  statuses: WorkflowStatus[]
  transitions: Record<string, string[]>
  isSystem: boolean
}
```

Update `parseWorkflowTemplate`:

```typescript
function parseWorkflowTemplate(record: WorkflowRecord): ParsedWorkflow {
  return {
    id: record.id,
    name: record.name,
    domain: record.domain,
    statuses: JSON.parse(record.statuses) as WorkflowStatus[],
    transitions: JSON.parse(record.transitions) as Record<string, string[]>,
    isSystem: record.isSystem,
  }
}
```

- [ ] **Step 4: Add domain to createWorkflowTemplate**

Update `createWorkflowTemplate` to accept domain:

```typescript
export async function createWorkflowTemplate(
  data: {
    name: string
    description?: string
    domain?: string
    statuses: WorkflowStatus[]
    transitions: Record<string, string[]>
  },
  userId: string
): Promise<ParsedWorkflow> {
  // ... existing validation ...
  const record = await prisma.workflowTemplate.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      domain: data.domain ?? 'task',
      statuses: JSON.stringify(data.statuses),
      transitions: JSON.stringify(data.transitions),
      // ... rest unchanged ...
    },
    select: workflowSelectFields,
  })
  // ... rest unchanged ...
}
```

- [ ] **Step 5: Update controller to pass domain query param**

In `server/src/controllers/workflowController.ts`, update `getWorkflows`:

```typescript
export async function getWorkflows(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const domain = req.query.domain as string | undefined
    const workflows = await workflowService.getWorkflowTemplates(domain)
    sendSuccess(res, workflows)
  } catch (error) {
    logger.error('Error fetching workflow templates', { error })
    next(error)
  }
}
```

- [ ] **Step 6: Update createWorkflow controller to accept domain**

In `server/src/controllers/workflowController.ts`, update the `createSchema` to include domain:

```typescript
const createSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(200),
  description: z.string().max(1000).optional(),
  domain: z.enum(['task', 'project']).default('task'),
  statuses: z
    .array(workflowStatusSchema)
    .min(2, 'Il workflow deve avere almeno 2 stati')
    .max(20, 'Il workflow non può avere più di 20 stati'),
  transitions: z.record(z.string(), z.array(z.string())),
})
```

- [ ] **Step 7: Commit**

```bash
git add server/src/services/workflowService.ts server/src/controllers/workflowController.ts
git commit -m "feat(workflow): add domain discriminator to workflow templates (task|project)"
```

---

### Task 6: Update projectService — create with phases, new status logic

**Files:**
- Modify: `server/src/services/projectService.ts` (create, changeProjectStatus, new phase methods)

- [ ] **Step 1: Update project creation to copy phases from template**

In `server/src/services/projectService.ts`, find the `create` function. Add logic after the project is created to copy phases from the phase template:

```typescript
// Inside the create function, after validating input:
let phasesJson: string | null = null
let currentPhaseKey: string | null = null

if (data.phaseTemplateId) {
  const template = await prisma.workflowTemplate.findFirst({
    where: { id: data.phaseTemplateId, isActive: true, domain: 'project' },
    select: { statuses: true, transitions: true },
  })
  if (!template) {
    throw new AppError('Phase template not found', 404)
  }
  const phases = JSON.parse(template.statuses) as ProjectPhase[]
  const initialPhase = phases.find(p => p.isInitial)
  currentPhaseKey = initialPhase?.key ?? phases[0]?.key ?? null
  phasesJson = JSON.stringify({
    phases,
    transitions: JSON.parse(template.transitions),
  })
} else {
  // Use system default phase template
  const defaultTemplate = await prisma.workflowTemplate.findFirst({
    where: { isSystem: true, isDefault: true, domain: 'project', isActive: true },
    select: { id: true, statuses: true, transitions: true },
  })
  if (defaultTemplate) {
    data.phaseTemplateId = defaultTemplate.id
    const phases = JSON.parse(defaultTemplate.statuses) as ProjectPhase[]
    const initialPhase = phases.find(p => p.isInitial)
    currentPhaseKey = initialPhase?.key ?? phases[0]?.key ?? null
    phasesJson = JSON.stringify({
      phases,
      transitions: JSON.parse(defaultTemplate.transitions),
    })
  }
}
```

Add to the `prisma.project.create` data:

```typescript
  status: 'active',
  phaseTemplateId: data.phaseTemplateId ?? null,
  phases: phasesJson,
  currentPhaseKey,
```

- [ ] **Step 2: Update changeProjectStatus — only accept 4 condition values**

Replace the `changeProjectStatus` function body to validate against new status values:

```typescript
export async function changeProjectStatus(
  projectId: string,
  newStatus: ProjectStatus,
  userId: string
) {
  if (newStatus === 'completed') {
    throw new AppError('Cannot manually set completed — advance through the final phase instead', 400)
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
  })

  if (!existing) {
    return null
  }

  const oldStatus = existing.status

  const project = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      select: projectWithRelationsSelect,
    })

    await auditService.logStatusChange(
      EntityType.PROJECT,
      projectId,
      userId,
      oldStatus,
      newStatus,
      tx
    )

    return updated
  })

  logger.info(`Project condition changed: ${oldStatus} → ${newStatus}`, { projectId, userId })

  evaluateRules({
    type: 'project_status_changed',
    domain: 'project',
    entityId: projectId,
    projectId,
    userId,
    data: { oldStatus, newStatus },
  }).catch(err => logger.error('Automation project_status_changed failed', { error: err }))

  return project
}
```

- [ ] **Step 3: Add getProjectPhases service method**

Add new function in `server/src/services/projectService.ts`:

```typescript
/**
 * Gets project phases with milestone progress per phase.
 */
export async function getProjectPhases(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: {
      id: true,
      status: true,
      phases: true,
      currentPhaseKey: true,
      phaseTemplateId: true,
    },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  if (!project.phases) {
    return {
      currentPhaseKey: project.currentPhaseKey,
      status: project.status,
      phases: [],
      transitions: {} as Record<string, string[]>,
      milestonesByPhase: {} as Record<string, unknown[]>,
      canAdvance: false,
      nextPhaseKey: null as string | null,
    }
  }

  const parsed = JSON.parse(project.phases) as {
    phases: ProjectPhase[]
    transitions: Record<string, string[]>
  }

  // Fetch milestones for this project with their phaseKey
  const milestones = await prisma.task.findMany({
    where: {
      projectId,
      taskType: 'milestone',
      isDeleted: false,
    },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      phaseKey: true,
      dueDate: true,
      _count: {
        select: {
          subtasks: { where: { isDeleted: false } },
        },
      },
    },
    orderBy: [{ phaseKey: 'asc' }, { position: 'asc' }],
  })

  // Group milestones by phaseKey
  const milestonesByPhase: Record<string, typeof milestones> = {}
  for (const m of milestones) {
    const key = m.phaseKey ?? '__unassigned'
    if (!milestonesByPhase[key]) milestonesByPhase[key] = []
    milestonesByPhase[key].push(m)
  }

  // Determine if current phase can advance
  const currentPhase = project.currentPhaseKey
  const currentMilestones = currentPhase ? (milestonesByPhase[currentPhase] ?? []) : []
  const allCurrentDone = currentMilestones.length > 0 &&
    currentMilestones.every(m => m.status === 'done' || m.status === 'cancelled')

  const nextPhases = currentPhase ? (parsed.transitions[currentPhase] ?? []) : []
  // Find the forward transition (higher order)
  const currentOrder = parsed.phases.find(p => p.key === currentPhase)?.order ?? -1
  const forwardPhase = nextPhases
    .map(key => parsed.phases.find(p => p.key === key))
    .filter(Boolean)
    .find(p => (p?.order ?? -1) > currentOrder)

  return {
    currentPhaseKey: project.currentPhaseKey,
    status: project.status,
    phases: parsed.phases,
    transitions: parsed.transitions,
    milestonesByPhase,
    canAdvance: allCurrentDone && !!forwardPhase,
    nextPhaseKey: allCurrentDone && forwardPhase ? forwardPhase.key : null,
  }
}
```

- [ ] **Step 4: Add advancePhase service method**

```typescript
/**
 * Advances project to the next phase (semi-automatic with user confirmation).
 */
export async function advancePhase(
  projectId: string,
  targetPhaseKey: string,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true, status: true, phases: true, currentPhaseKey: true },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  if (project.status !== 'active') {
    throw new AppError(`Cannot advance phase: project is ${project.status}`, 400)
  }

  if (!project.phases) {
    throw new AppError('Project has no phases configured', 400)
  }

  const parsed = JSON.parse(project.phases) as {
    phases: ProjectPhase[]
    transitions: Record<string, string[]>
  }

  // Validate target phase exists
  const targetPhase = parsed.phases.find(p => p.key === targetPhaseKey)
  if (!targetPhase) {
    throw new AppError(`Phase "${targetPhaseKey}" not found in project`, 400)
  }

  // Validate transition is allowed
  const currentKey = project.currentPhaseKey
  if (!currentKey) {
    throw new AppError('Project has no current phase', 400)
  }
  const allowed = parsed.transitions[currentKey] ?? []
  if (!allowed.includes(targetPhaseKey)) {
    throw new AppError(`Transition from "${currentKey}" to "${targetPhaseKey}" is not allowed`, 400)
  }

  // Check all milestones of current phase are done (blocking prerequisite)
  const currentMilestones = await prisma.task.findMany({
    where: {
      projectId,
      taskType: 'milestone',
      phaseKey: currentKey,
      isDeleted: false,
    },
    select: { id: true, status: true, title: true },
  })

  const incompleteMilestones = currentMilestones.filter(
    m => m.status !== 'done' && m.status !== 'cancelled'
  )

  if (incompleteMilestones.length > 0) {
    const names = incompleteMilestones.map(m => m.title).join(', ')
    throw new AppError(
      `Cannot advance: ${incompleteMilestones.length} milestone(s) incomplete: ${names}`,
      400
    )
  }

  // Determine new status
  const newStatus = targetPhase.isFinal ? 'completed' : 'active'

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: projectId },
      data: {
        currentPhaseKey: targetPhaseKey,
        status: newStatus,
        actualEndDate: targetPhase.isFinal ? new Date() : undefined,
        updatedAt: new Date(),
      },
      select: projectWithRelationsSelect,
    })

    await auditService.logStatusChange(
      EntityType.PROJECT,
      projectId,
      userId,
      `phase:${currentKey}`,
      `phase:${targetPhaseKey}`,
      tx
    )

    return result
  })

  logger.info(`Project phase advanced: ${currentKey} → ${targetPhaseKey}`, { projectId, userId })

  evaluateRules({
    type: 'project_status_changed',
    domain: 'project',
    entityId: projectId,
    projectId,
    userId,
    data: { oldPhase: currentKey, newPhase: targetPhaseKey, oldStatus: project.status, newStatus },
  }).catch(err => logger.error('Automation phase advance failed', { error: err }))

  return updated
}
```

- [ ] **Step 5: Add updateProjectPhases service method**

```typescript
/**
 * Updates project's local phases (add/remove/rename/reorder).
 * Cannot remove phases with assigned milestones.
 */
export async function updateProjectPhases(
  projectId: string,
  newPhases: ProjectPhase[],
  newTransitions: Record<string, string[]>,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true, phases: true, currentPhaseKey: true },
  })

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  // Check that no removed phases have milestones
  if (project.phases) {
    const oldParsed = JSON.parse(project.phases) as { phases: ProjectPhase[] }
    const oldKeys = new Set(oldParsed.phases.map(p => p.key))
    const newKeys = new Set(newPhases.map(p => p.key))
    const removedKeys = [...oldKeys].filter(k => !newKeys.has(k))

    if (removedKeys.length > 0) {
      const milestonesInRemoved = await prisma.task.count({
        where: {
          projectId,
          taskType: 'milestone',
          phaseKey: { in: removedKeys },
          isDeleted: false,
        },
      })

      if (milestonesInRemoved > 0) {
        throw new AppError(
          `Cannot remove phases with assigned milestones. Reassign milestones first.`,
          400
        )
      }
    }
  }

  // Validate currentPhaseKey still exists
  const newKeys = new Set(newPhases.map(p => p.key))
  let currentPhaseKey = project.currentPhaseKey
  if (currentPhaseKey && !newKeys.has(currentPhaseKey)) {
    // Reset to first initial phase
    const initial = newPhases.find(p => p.isInitial) ?? newPhases[0]
    currentPhaseKey = initial?.key ?? null
  }

  const phasesJson = JSON.stringify({ phases: newPhases, transitions: newTransitions })

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      phases: phasesJson,
      currentPhaseKey,
      updatedAt: new Date(),
    },
    select: projectWithRelationsSelect,
  })

  logger.info('Project phases updated', { projectId, userId })

  return updated
}
```

- [ ] **Step 6: Add savePhasesAsTemplate service method**

```typescript
/**
 * Saves current project phases as a new workflow template.
 */
export async function savePhasesAsTemplate(
  projectId: string,
  name: string,
  description: string | undefined,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { phases: true },
  })

  if (!project?.phases) {
    throw new AppError('Project has no phases to save', 400)
  }

  const parsed = JSON.parse(project.phases) as {
    phases: ProjectPhase[]
    transitions: Record<string, string[]>
  }

  // Check name uniqueness
  const existing = await prisma.workflowTemplate.findFirst({
    where: { name, isActive: true },
    select: { id: true },
  })
  if (existing) {
    throw new AppError(`A template named "${name}" already exists`, 409)
  }

  const template = await prisma.workflowTemplate.create({
    data: {
      name,
      description: description ?? null,
      domain: 'project',
      statuses: JSON.stringify(parsed.phases),
      transitions: JSON.stringify(parsed.transitions),
      isDefault: false,
      isSystem: false,
      isActive: true,
      createdById: userId,
    },
  })

  logger.info('Phases saved as template', { projectId, templateId: template.id, userId })

  return { id: template.id, name: template.name }
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add server/src/services/projectService.ts
git commit -m "feat(service): add phase management — getProjectPhases, advancePhase, updateProjectPhases, savePhasesAsTemplate"
```

---

### Task 7: Add phase controller endpoints and routes

**Files:**
- Modify: `server/src/controllers/projectController.ts`
- Modify: `server/src/routes/projectRoutes.ts`

- [ ] **Step 1: Add phase controller methods**

In `server/src/controllers/projectController.ts`, add new handlers:

```typescript
import {
  updateProjectPhasesSchema,
  advancePhaseSchema,
  savePhasesAsTemplateSchema,
} from '../schemas/projectSchemas.js'

/**
 * GET /api/projects/:id/phases
 */
export async function getPhases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = uuidParamSchema.parse(req.params)
    const phases = await projectService.getProjectPhases(id)
    sendSuccess(res, phases)
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/projects/:id/phases
 */
export async function updatePhases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = uuidParamSchema.parse(req.params)
    const { phases, transitions } = updateProjectPhasesSchema.parse(req.body)
    const userId = requireUserId(req)
    const project = await projectService.updateProjectPhases(id, phases, transitions, userId)
    sendSuccess(res, project)
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/projects/:id/phase/advance
 */
export async function advancePhase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = uuidParamSchema.parse(req.params)
    const { targetPhaseKey } = advancePhaseSchema.parse(req.body)
    const userId = requireUserId(req)
    const project = await projectService.advancePhase(id, targetPhaseKey, userId)
    sendSuccess(res, project)
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/projects/:id/phases/save-as-template
 */
export async function savePhasesAsTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = uuidParamSchema.parse(req.params)
    const { name, description } = savePhasesAsTemplateSchema.parse(req.body)
    const userId = requireUserId(req)
    const template = await projectService.savePhasesAsTemplate(id, name, description, userId)
    sendCreated(res, template)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 2: Add routes**

In `server/src/routes/projectRoutes.ts`, add after existing routes:

```typescript
// Phase management
router.get('/:id/phases', projectController.getPhases)
router.patch('/:id/phases', requireRole('admin', 'direzione'), projectController.updatePhases)
router.patch('/:id/phase/advance', requireRole('admin', 'direzione'), projectController.advancePhase)
router.post('/:id/phases/save-as-template', requireRole('admin', 'direzione'), projectController.savePhasesAsTemplate)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/projectController.ts server/src/routes/projectRoutes.ts
git commit -m "feat(api): add phase endpoints — GET/PATCH phases, advance, save-as-template"
```

---

### Task 8: Seed system phase templates

**Files:**
- Modify: `server/prisma/seed.ts`

- [ ] **Step 1: Add phase template seeding**

In `server/prisma/seed.ts`, add after the project template creation (line ~88) and before project creation:

```typescript
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
        { key: 'verification', label: 'Verifica', description: 'Verifica avanzamento e completamento attività', order: 2, color: 'yellow', isInitial: false, isFinal: false },
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
        { key: 'execution', label: 'Esecuzione', description: 'Esecuzione delle attività pianificate', order: 1, color: 'blue', isInitial: false, isFinal: false },
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

  console.log('✅ Created 2 phase templates')
```

- [ ] **Step 2: Update seed projects to use new status + phases**

Update seed projects to use `status: 'active'` and set phase fields:

```typescript
  const bioPhases = JSON.stringify({
    phases: JSON.parse(biomedicalPhaseTemplate.statuses),
    transitions: JSON.parse(biomedicalPhaseTemplate.transitions),
  })

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
```

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(seed): add biomedical and generic phase templates, update projects with phase data"
```

---

### Task 9: Fix remaining backend compilation errors

**Files:**
- Scan all server files referencing old `PROJECT_STATUSES` or old status values

- [ ] **Step 1: Find and fix all references to old project status values**

Search for hardcoded references to old statuses (`planning`, `design`, `verification`, `validation`, `transfer`, `maintenance`) in backend services and controllers. Key files likely affected:

- `server/src/services/projectService.ts` — `changeProjectStatus` (already updated), `getMilestoneValidation` references
- `server/src/controllers/projectController.ts` — any status filtering
- `server/src/services/dashboardService.ts` — may reference project statuses
- `server/src/routes/analyticsRoutes.ts` — may have status filters

For each reference, determine if it should:
- Use the new 4-value status (condition queries)
- Use `currentPhaseKey` (phase queries)
- Be updated to handle both

- [ ] **Step 2: Verify full server compilation**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit all fixes**

```bash
git add -A server/src/
git commit -m "fix(backend): update all references from old 9-value project status to new 4-value condition system"
```

---

## Chunk 3: Frontend Types & Hooks

### Task 10: Update frontend types

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Update ProjectStatus type**

In `client/src/types/index.ts`, find and update `ProjectStatus`:

```typescript
export type ProjectStatus = 'active' | 'on_hold' | 'cancelled' | 'completed'
```

- [ ] **Step 2: Add ProjectPhase type**

```typescript
export interface ProjectPhase {
  key: string
  label: string
  description: string
  order: number
  color: string
  isFinal: boolean
  isInitial: boolean
}

export interface ProjectPhasesResponse {
  currentPhaseKey: string | null
  status: ProjectStatus
  phases: ProjectPhase[]
  transitions: Record<string, string[]>
  milestonesByPhase: Record<string, MilestonePhaseInfo[]>
  canAdvance: boolean
  nextPhaseKey: string | null
}

export interface MilestonePhaseInfo {
  id: string
  code: string
  title: string
  status: string
  phaseKey: string | null
  dueDate: string | null
  _count: { subtasks: number }
}
```

- [ ] **Step 3: Update Project type to include phase fields**

Add to the `Project` interface:

```typescript
  phaseTemplateId?: string | null
  phases?: string | null  // JSON
  currentPhaseKey?: string | null
```

- [ ] **Step 4: Update Task type to include phaseKey**

Add to the `Task` interface:

```typescript
  phaseKey?: string | null
```

- [ ] **Step 5: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat(types): update frontend types for phase system — ProjectPhase, ProjectPhasesResponse, phaseKey"
```

---

### Task 11: Update frontend constants

**Files:**
- Modify: `client/src/lib/constants.ts`

- [ ] **Step 1: Replace PROJECT_STATUS_LABELS with condition labels**

```typescript
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Attivo",
  on_hold: "In Pausa",
  cancelled: "Annullato",
  completed: "Completato",
}
```

- [ ] **Step 2: Add PHASE_COLORS for WorkflowStepper**

```typescript
export const PHASE_COLORS: Record<string, string> = {
  gray: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/constants.ts
git commit -m "feat(constants): update status labels to 4 conditions, add phase colors"
```

---

### Task 12: Add frontend hooks for phases

**Files:**
- Modify: `client/src/hooks/api/useProjects.ts`

- [ ] **Step 1: Add useProjectPhasesQuery hook**

```typescript
export function useProjectPhasesQuery(projectId: string) {
  return useQuery({
    queryKey: [...KEYS.detail(projectId), 'phases'],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/phases`)
      return data.data as ProjectPhasesResponse
    },
    enabled: !!projectId,
  })
}
```

- [ ] **Step 2: Add useAdvancePhase mutation**

```typescript
export function useAdvancePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, targetPhaseKey }: { id: string; targetPhaseKey: string }) => {
      const { data } = await api.patch(`/projects/${id}/phase/advance`, { targetPhaseKey })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}
```

- [ ] **Step 3: Add useUpdateProjectPhases mutation**

```typescript
export function useUpdateProjectPhases() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, phases, transitions }: {
      id: string
      phases: ProjectPhase[]
      transitions: Record<string, string[]>
    }) => {
      const { data } = await api.patch(`/projects/${id}/phases`, { phases, transitions })
      return data.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}
```

- [ ] **Step 4: Add useSavePhasesAsTemplate mutation**

```typescript
export function useSavePhasesAsTemplate() {
  return useMutation({
    mutationFn: async ({ id, name, description }: {
      id: string
      name: string
      description?: string
    }) => {
      const { data } = await api.post(`/projects/${id}/phases/save-as-template`, { name, description })
      return data.data
    },
  })
}
```

- [ ] **Step 5: Add usePhaseTemplatesQuery hook**

```typescript
export function usePhaseTemplatesQuery() {
  return useQuery({
    queryKey: ['workflow-templates', 'project'],
    queryFn: async () => {
      const { data } = await api.get('/workflows', { params: { domain: 'project' } })
      return data.data
    },
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/api/useProjects.ts
git commit -m "feat(hooks): add phase management hooks — useProjectPhasesQuery, useAdvancePhase, usePhaseTemplatesQuery"
```

---

## Chunk 4: Frontend UI Integration

### Task 13: Update WorkflowStepper for server-driven phases

**Files:**
- Modify: `client/src/components/common/WorkflowStepper.tsx`
- Delete: `client/src/lib/workflows/projectWorkflow.ts`

- [ ] **Step 1: Refactor WorkflowStepper to accept server-driven phase data**

The WorkflowStepper currently expects a `WorkflowDefinition` with `prerequisites` functions. The new version should accept `ProjectPhasesResponse` directly:

```typescript
interface PhaseStepperProps {
  phasesData: ProjectPhasesResponse
  onAdvance?: (targetPhaseKey: string) => void
  collapsed?: boolean
  className?: string
}
```

Replace the phase evaluation logic (which used frontend `evaluate()` functions) with the server-provided `canAdvance` and `milestonesByPhase`.

Each step shows:
- Phase name + color
- Milestone count: "3/5 completate" badge
- List of milestones with their status
- "Avanza fase" button when `canAdvance && phase.key === phasesData.currentPhaseKey`

Keep the existing `StepperBar` component for the visual step indicators.

- [ ] **Step 2: Delete projectWorkflow.ts**

```bash
rm client/src/lib/workflows/projectWorkflow.ts
```

If the `workflows/` directory is now empty, delete it too.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/WorkflowStepper.tsx
git rm client/src/lib/workflows/projectWorkflow.ts
git commit -m "feat(ui): refactor WorkflowStepper for server-driven phases, remove hardcoded projectWorkflow"
```

---

### Task 14: Update ProjectDetailPage

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`

- [ ] **Step 1: Replace ProjectWorkflowStepperWrapper**

Replace the existing `ProjectWorkflowStepperWrapper` (lines 144-186) which imports `projectWorkflow` and builds `ValidationData` from frontend data. Instead:

```typescript
import { useProjectPhasesQuery, useAdvancePhase } from "@/hooks/api/useProjects"

// Inside the component:
const { data: phasesData } = useProjectPhasesQuery(id!)
const advancePhase = useAdvancePhase()

const handleAdvance = (targetPhaseKey: string) => {
  advancePhase.mutate(
    { id: id!, targetPhaseKey },
    {
      onSuccess: () => toast.success("Fase avanzata"),
      onError: (err) => toast.error(err.message || "Errore nell'avanzamento fase"),
    }
  )
}
```

Pass to `WorkflowStepper`:

```tsx
{phasesData && (
  <WorkflowStepper
    phasesData={phasesData}
    onAdvance={canManageProject ? handleAdvance : undefined}
  />
)}
```

- [ ] **Step 2: Add condition banners for on_hold/cancelled**

Before the WorkflowStepper, add:

```tsx
{project.status === 'on_hold' && (
  <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2">
    <AlertTriangle className="h-4 w-4" />
    Progetto in pausa
  </div>
)}
{project.status === 'cancelled' && (
  <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive-foreground flex items-center gap-2">
    <XCircle className="h-4 w-4" />
    Progetto cancellato
  </div>
)}
```

- [ ] **Step 3: Update status change handler**

The `handleStatusChange` function should now only accept condition values (`active`, `on_hold`, `cancelled`):

```typescript
const handleStatusChange = (status: string) => {
  changeStatus.mutate(
    { id: id!, status },
    {
      onSuccess: () => toast.success("Condizione aggiornata"),
      onError: () => toast.error("Errore nell'aggiornamento"),
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectDetailPage.tsx
git commit -m "feat(ui): integrate server-driven phases in ProjectDetailPage with condition banners"
```

---

### Task 15: Update ProjectFormPage — phase template select

**Files:**
- Modify: `client/src/pages/projects/ProjectFormPage.tsx`

- [ ] **Step 1: Add phase template selector to project creation form**

In the ProjectWizard or ProjectEditForm, add a select for choosing a phase template:

```tsx
import { usePhaseTemplatesQuery } from "@/hooks/api/useProjects"

const { data: phaseTemplates } = usePhaseTemplatesQuery()

// In the form:
<FormField label="Template fasi" error={errors.phaseTemplateId?.message}>
  <Select
    value={watch("phaseTemplateId") ?? ""}
    onValueChange={(v) => setValue("phaseTemplateId", v || null)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Seleziona template fasi" />
    </SelectTrigger>
    <SelectContent>
      {phaseTemplates?.map((t: { id: string; name: string }) => (
        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</FormField>
```

- [ ] **Step 2: Remove old status select from edit form**

The project edit form currently has a status select with 9 values. Replace it with a condition select (4 values):

```tsx
<FormField label="Condizione" error={errors.status?.message}>
  <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
        <SelectItem key={value} value={value}>{label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</FormField>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/projects/ProjectFormPage.tsx
git commit -m "feat(ui): add phase template selector to project form, update status to condition select"
```

---

### Task 16: Update ProjectListPage — show phase + condition

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Update status column to show condition + phase**

In the DataTable columns, update the status column to show both:

```tsx
{
  accessorKey: "status",
  header: "Stato",
  cell: ({ row }) => {
    const project = row.original
    const conditionLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status
    // Parse phases to find currentPhaseKey label
    let phaseLabel: string | null = null
    if (project.phases && project.currentPhaseKey) {
      try {
        const parsed = JSON.parse(project.phases) as { phases: ProjectPhase[] }
        const phase = parsed.phases.find(p => p.key === project.currentPhaseKey)
        phaseLabel = phase?.label ?? null
      } catch { /* ignore */ }
    }
    return (
      <div className="flex flex-col gap-0.5">
        <StatusBadge status={project.status} label={conditionLabel} />
        {phaseLabel && (
          <span className="text-xs text-muted-foreground">{phaseLabel}</span>
        )}
      </div>
    )
  },
}
```

- [ ] **Step 2: Update filter values for status**

Update status filter to use the 4 condition values instead of 9.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/projects/ProjectListPage.tsx
git commit -m "feat(ui): show project condition + current phase in ProjectListPage"
```

---

### Task 17: Fix remaining frontend compilation errors

**Files:**
- Scan all client files referencing old `PROJECT_STATUS_LABELS` keys or old status values

- [ ] **Step 1: Search and fix**

Search for references to old status values (`planning`, `design`, `verification`, `validation`, `transfer`, `maintenance`) in frontend code. Key files likely affected:

- `client/src/pages/analytics/AnalyticsPage.tsx`
- `client/src/pages/reports/WeeklyReportPage.tsx`
- `client/src/pages/home/HomePage.tsx`
- `client/src/components/features/AdvancedFilterBuilder.tsx`
- `client/src/components/features/SavedViewsBar.tsx`

For each reference, update to use new condition values or phase-based logic.

- [ ] **Step 2: Verify client compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add -A client/src/
git commit -m "fix(frontend): update all references from old 9-value status to new condition + phase system"
```

---

## Chunk 5: Data Migration & Final Verification

### Task 18: Write data migration script

**Files:**
- Create: `server/prisma/migrations/manual/migrate-project-phases.ts`

- [ ] **Step 1: Write migration script**

This script migrates existing projects from old 9-value status to new condition + phase system:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BIOMEDICAL_PHASES = [
  { key: 'planning', label: 'Pianificazione', description: 'Definizione obiettivi e pianificazione', order: 0, color: 'gray', isInitial: true, isFinal: false },
  { key: 'design', label: 'Design', description: 'Progettazione e strutturazione del lavoro', order: 1, color: 'blue', isInitial: false, isFinal: false },
  { key: 'verification', label: 'Verifica', description: 'Verifica avanzamento e completamento attività', order: 2, color: 'yellow', isInitial: false, isFinal: false },
  { key: 'validation', label: 'Validazione', description: 'Validazione finale e approvazione deliverable', order: 3, color: 'purple', isInitial: false, isFinal: false },
  { key: 'transfer', label: 'Trasferimento', description: 'Consegna finale e chiusura progetto', order: 4, color: 'green', isInitial: false, isFinal: true },
]

const BIOMEDICAL_TRANSITIONS = {
  planning: ['design'],
  design: ['planning', 'verification'],
  verification: ['design', 'validation'],
  validation: ['verification', 'transfer'],
  transfer: ['validation'],
}

const PHASE_STATUSES = new Set(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance'])

async function migrate() {
  // Find the biomedical phase template
  const bioTemplate = await prisma.workflowTemplate.findFirst({
    where: { name: 'Biomedico IEC 62304', domain: 'project', isActive: true },
  })

  const phasesJson = JSON.stringify({
    phases: BIOMEDICAL_PHASES,
    transitions: BIOMEDICAL_TRANSITIONS,
  })

  const projects = await prisma.project.findMany({
    where: { isDeleted: false },
  })

  for (const project of projects) {
    const oldStatus = project.status
    let newStatus: string
    let currentPhaseKey: string | null

    if (PHASE_STATUSES.has(oldStatus)) {
      newStatus = 'active'
      currentPhaseKey = oldStatus === 'maintenance' ? 'transfer' : oldStatus
    } else if (oldStatus === 'on_hold') {
      newStatus = 'on_hold'
      currentPhaseKey = 'planning'
    } else if (oldStatus === 'cancelled') {
      newStatus = 'cancelled'
      currentPhaseKey = null
    } else if (oldStatus === 'completed') {
      newStatus = 'completed'
      currentPhaseKey = 'transfer'
    } else {
      newStatus = 'active'
      currentPhaseKey = 'planning'
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: newStatus,
        currentPhaseKey,
        phases: phasesJson,
        phaseTemplateId: bioTemplate?.id ?? null,
      },
    })

    console.log(`Migrated project ${project.code}: ${oldStatus} → ${newStatus} (phase: ${currentPhaseKey})`)
  }

  console.log(`\n✅ Migrated ${projects.length} projects`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Commit**

```bash
git add server/prisma/migrations/manual/
git commit -m "feat(migration): add data migration script for project phase system"
```

---

### Task 19: End-to-end verification

- [ ] **Step 1: Run seed to verify clean setup**

```bash
cd server && npx prisma db seed
```

Expected: Seed completes with phase templates and projects with phase data.

- [ ] **Step 2: Start server and test endpoints**

Test with curl or API client:

```bash
# Get phase templates
curl http://192.168.52.22:3000/api/workflows?domain=project

# Get project phases
curl http://192.168.52.22:3000/api/projects/<id>/phases

# Advance phase (will fail if milestones not done — expected)
curl -X PATCH http://192.168.52.22:3000/api/projects/<id>/phase/advance -d '{"targetPhaseKey":"design"}'
```

- [ ] **Step 3: Start client and verify UI**

```bash
cd client && npm run dev
```

Verify:
- Project list shows condition + phase
- Project detail shows WorkflowStepper with phases from server
- Phase advancement works when milestones are done
- on_hold/cancelled banners display correctly
- Project form has phase template selector

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: project phase system — complete implementation with server-driven phases from milestones"
```
