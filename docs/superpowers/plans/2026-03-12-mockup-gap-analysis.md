# Mockup Gap Analysis — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap between HTML mockups and the running app by adding 4 centralized backend services, 2 new DB models, a risk scale migration (String→Int 1-5), document versioning, budget calculations, and wiring everything into all frontend pages.

**Architecture:** 4 cross-cutting services (statsService, activityService, enrichmentService, relatedEntitiesService) serve all pages — zero per-page duplication. Schema changes land in one migration. Each page gets enriched data through existing list/detail hooks + new dedicated hooks.

**Tech Stack:** Prisma 7 + SQL Server (adapter pattern), Express, Zod, TanStack Query 5, shadcn/ui, EntityList/EntityDetail templates.

**Spec:** `docs/superpowers/specs/2026-03-12-mockup-gap-analysis-design.md`

---

## File Structure

### New files (backend)

| File | Responsibility |
|------|---------------|
| `server/src/services/activityService.ts` | Unified timeline from AuditLog |
| `server/src/services/enrichmentService.ts` | Batch-enrich lists (progress, subtasks, hours) — internal only, no endpoint |
| `server/src/services/relatedEntitiesService.ts` | Polymorphic related-entity retrieval |
| `server/src/controllers/statsController.ts` | Routes for /api/stats/* |
| `server/src/controllers/activityController.ts` | Routes for /api/activity/* |
| `server/src/controllers/relatedController.ts` | Routes for /api/related/* |
| `server/src/routes/statsRoutes.ts` | Stats route definitions |
| `server/src/routes/activityRoutes.ts` | Activity route definitions |
| `server/src/routes/relatedRoutes.ts` | Related entities route definitions |
| `server/src/schemas/statsSchemas.ts` | Zod schemas for stats queries |
| `server/src/schemas/activitySchemas.ts` | Zod schemas for activity queries |
| `server/src/schemas/relatedSchemas.ts` | Zod schemas for related queries |
| `server/prisma/migrations/YYYYMMDD_gap_analysis/migration.sql` | Single migration for all schema changes |

### New files (frontend)

| File | Responsibility |
|------|---------------|
| `client/src/hooks/api/useStats.ts` | `useStatsQuery(domain)`, `useSummaryQuery(type, id)` |
| `client/src/hooks/api/useActivity.ts` | `useActivityQuery(entityType, entityId)` |
| `client/src/hooks/api/useRelated.ts` | `useRelatedQuery(entityType, entityId, include[])` |

### Modified files (backend)

| File | Changes |
|------|---------|
| `server/prisma/schema.prisma` | +DocumentVersion, +RiskTask models, +User.hourlyRate, Risk.probability/impact String→Int |
| `server/src/constants/enums.ts` | Replace RISK_PROBABILITIES/RISK_IMPACTS with riskScaleSchema (1-5 int) |
| `server/src/schemas/riskSchemas.ts` | probability/impact → z.number().int().min(1).max(5) |
| `server/src/types/index.ts` | RiskProbability/RiskImpact → number; +DocumentVersion, +RiskTask, +ActivityItem types |
| `server/src/services/statsService.ts` | **Extend** (file already exists): add KPI strip + summary methods alongside existing exports |
| `server/src/services/riskService.ts` | Remove calculateRiskLevel() string mapping, use direct int multiplication; remove RiskProbability/RiskImpact imports |
| `server/src/services/dashboardService.ts` | Delegate stats to statsService, delegate activity to activityService, +milestone_at_risk, +days param; remove isRiskCritical() function |
| `server/src/services/analyticsService.ts` | Update risk filters from string to int (semantic broadening: 'high' → `>= 4` includes values 4 AND 5) |
| `server/src/services/documentService.ts` | Create DocumentVersion on file update |
| `server/src/services/projectService.ts` | Call enrichmentService.enrichProjects() |
| `server/src/services/taskService.ts` | Call enrichmentService.enrichTasks() / enrichKanbanCards() |
| `server/src/utils/responseHelpers.ts` | Fix sendError: `error` key → `message` key |
| `server/src/utils/selectFields.ts` | +documentVersionSelect, +riskTaskSelect, +userWithHourlyRateSelect |
| `server/src/routes/index.ts` | Register stats, activity, related routes |

### Modified files (frontend)

| File | Changes |
|------|---------|
| `client/src/types/index.ts` | Risk.probability/impact → number; +DocumentVersion; +RiskTask; +ActivityItem; +KpiCard |
| `client/src/lib/constants.ts` | Risk labels for 1-5 scale, RISK_LEVEL_COLORS, RISK_LEVEL_LABELS |
| `client/src/hooks/api/useRisks.ts` | Update types for int probability/impact |
| `client/src/hooks/api/useDashboard.ts` | +days param for my-tasks-today; +`milestone_at_risk` in AttentionItem type |
| `client/src/components/domain/automation/RecommendationsPanel.tsx` | Update risk impact from string to int |
| Various pages | Wire kpiStrip, activity tab, related sidebar via new hooks; update risk display in ProjectDetailPage |

---

## Chunk 1: Foundation (DB + sendError fix + risk scale + types)

### Task 1.1: Fix sendError response format

**Files:**
- Modify: `server/src/utils/responseHelpers.ts:54-56`

- [ ] **Step 1: Fix sendError to use `message` key instead of `error`**

In `server/src/utils/responseHelpers.ts`, change line 55:

```typescript
// FROM:
res.status(statusCode).json({ success: false, error: message })
// TO:
res.status(statusCode).json({ success: false, message })
```

- [ ] **Step 2: Verify no other code relies on the `error` key**

Run: `cd /c/Users/Nicola_MussolinAdmin/Documents/Mikai/ProjectPulse && grep -r '"error"' server/src/ --include='*.ts' | grep -v node_modules | grep -v '.d.ts'`

Check results — if any frontend code reads `.error` from API responses, note it for later fix. The error middleware already uses `message`, so this aligns them.

- [ ] **Step 3: Commit**

```bash
git add server/src/utils/responseHelpers.ts
git commit -m "fix(api): align sendError response key to 'message' matching error middleware"
```

---

### Task 1.2: Prisma schema changes — new models + fields

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/utils/selectFields.ts`

- [ ] **Step 1: Add User.hourlyRate field**

In `server/prisma/schema.prisma`, inside `model User` (after line 29, after `weeklyHoursTarget`), add:

```prisma
  hourlyRate    Decimal?  @map("hourly_rate") @db.Decimal(8, 2)
```

> **Note**: `Project.budget` already exists in the schema (line 90) as `Decimal? @db.Decimal(15, 2)`. No change needed.

- [ ] **Step 2: Change Risk.probability and Risk.impact from String to Int**

In `server/prisma/schema.prisma`, change the Risk model (lines 307-308):

```prisma
// FROM:
  probability    String   @default("medium")
  impact         String   @default("medium")
// TO:
  probability    Int      @default(3)
  impact         Int      @default(3)
```

- [ ] **Step 3: Add DocumentVersion model**

After the `Document` model (after line 358), add:

```prisma
model DocumentVersion {
  id           String   @id @default(uuid())
  documentId   String   @map("document_id")
  version      Int
  filePath     String   @map("file_path")
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type")
  note         String?  @db.NVarChar(Max)
  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  document   Document @relation(fields: [documentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  uploadedBy User     @relation("DocumentVersionUploader", fields: [uploadedById], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([documentId])
  @@map("document_versions")
}
```

Add the relation in `model Document` (after line 352):

```prisma
  versions   DocumentVersion[]
```

Add the relation in `model User` (after line 63, after `recommendationsDismissed`):

```prisma
  uploadedVersions    DocumentVersion[] @relation("DocumentVersionUploader")
```

- [ ] **Step 4: Add RiskTask model**

After the new `DocumentVersion` model, add:

```prisma
model RiskTask {
  id          String   @id @default(uuid())
  riskId      String   @map("risk_id")
  taskId      String   @map("task_id")
  linkType    String   @map("link_type")
  createdAt   DateTime @default(now()) @map("created_at")
  createdById String   @map("created_by_id")

  risk      Risk @relation(fields: [riskId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  task      Task @relation(fields: [taskId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  createdBy User @relation("RiskTaskCreator", fields: [createdById], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([riskId, taskId])
  @@index([riskId])
  @@index([taskId])
  @@map("risk_tasks")
}
```

Add relations in `model Risk` (after line 320):

```prisma
  linkedTasks  RiskTask[]
```

Add relations in `model Task` (find the Task model relations section):

```prisma
  linkedRisks  RiskTask[]
```

Add relation in `model User` (after `uploadedVersions`):

```prisma
  createdRiskTasks    RiskTask[] @relation("RiskTaskCreator")
```

- [ ] **Step 5: Add select fields for new models**

In `server/src/utils/selectFields.ts`, add at the end of the file:

```typescript
// ============================================================
// DOCUMENT VERSION SELECT
// ============================================================

export const documentVersionSelect = {
  id: true,
  version: true,
  filePath: true,
  fileSize: true,
  mimeType: true,
  note: true,
  createdAt: true,
  uploadedBy: { select: userMinimalSelect },
} as const

// ============================================================
// RISK TASK SELECT
// ============================================================

export const riskTaskSelect = {
  id: true,
  linkType: true,
  createdAt: true,
  createdBy: { select: userMinimalSelect },
} as const

export const riskTaskWithTaskSelect = {
  ...riskTaskSelect,
  task: {
    select: {
      id: true,
      title: true,
      code: true,
      status: true,
      taskType: true,
    },
  },
} as const

export const riskTaskWithRiskSelect = {
  ...riskTaskSelect,
  risk: {
    select: {
      id: true,
      title: true,
      code: true,
      status: true,
      probability: true,
      impact: true,
    },
  },
} as const

// ============================================================
// USER WITH HOURLY RATE SELECT
// ============================================================

export const userWithHourlyRateSelect = {
  ...userWithAvatarSelect,
  hourlyRate: true,
} as const
```

- [ ] **Step 6: Generate migration**

Run: `cd server && npx prisma migrate dev --name gap_analysis_schema --create-only`

This creates the migration SQL without applying it (the backend server is on a different machine).

- [ ] **Step 7: Fix risk data migration SQL in generated migration file**

Open the generated migration file. Prisma will auto-generate DDL for the `probability`/`impact` column type change (String→Int) that **drops the columns and recreates them**, destroying existing data. You MUST:

1. **REMOVE** any auto-generated DDL for `probability` and `impact` columns (DROP COLUMN / ADD COLUMN / ALTER TABLE)
2. **REPLACE** with the manual migration SQL below
3. **KEEP** all other auto-generated DDL (DocumentVersion table, RiskTask table, hourlyRate column) as-is

```sql
-- Risk scale migration: String → Int (1-5)
-- Step 1: Add temporary Int columns
ALTER TABLE risks ADD probability_new INT;
ALTER TABLE risks ADD impact_new INT;

-- Step 2: Convert existing values
UPDATE risks SET probability_new = CASE probability
  WHEN 'low' THEN 1 WHEN 'medium' THEN 3 WHEN 'high' THEN 5
  ELSE 3 END;
UPDATE risks SET impact_new = CASE impact
  WHEN 'low' THEN 1 WHEN 'medium' THEN 3 WHEN 'high' THEN 5
  ELSE 3 END;

-- Step 3: Drop old columns, rename new
ALTER TABLE risks DROP COLUMN probability;
ALTER TABLE risks DROP COLUMN impact;
EXEC sp_rename 'risks.probability_new', 'probability', 'COLUMN';
EXEC sp_rename 'risks.impact_new', 'impact', 'COLUMN';

-- Step 4: Set defaults
ALTER TABLE risks ADD DEFAULT 3 FOR probability;
ALTER TABLE risks ADD DEFAULT 3 FOR impact;
```

- [ ] **Step 8: Commit**

```bash
git add server/prisma/schema.prisma server/src/utils/selectFields.ts server/prisma/migrations/
git commit -m "feat(db): add DocumentVersion, RiskTask models, hourlyRate field, risk Int scale"
```

---

### Task 1.3: Update backend constants and types for risk scale 1-5

**Files:**
- Modify: `server/src/constants/enums.ts:59-71`
- Modify: `server/src/schemas/riskSchemas.ts`
- Modify: `server/src/types/index.ts`

- [ ] **Step 1: Replace risk probability/impact enums with int scale**

In `server/src/constants/enums.ts`, replace lines 65-71 (keep RISK_STATUSES and RISK_CATEGORIES on lines 63-64 untouched):

```typescript
// FROM:
export const RISK_PROBABILITIES = ['low', 'medium', 'high'] as const
export const RISK_IMPACTS = ['low', 'medium', 'high'] as const

export const riskStatusSchema = z.enum(RISK_STATUSES)
export const riskCategorySchema = z.enum(RISK_CATEGORIES)
export const riskProbabilitySchema = z.enum(RISK_PROBABILITIES)
export const riskImpactSchema = z.enum(RISK_IMPACTS)

// TO:
export const RISK_SCALE_MIN = 1
export const RISK_SCALE_MAX = 5
export const RISK_CRITICAL_THRESHOLD = 15
export const RISK_HIGH_THRESHOLD = 10
export const RISK_MEDIUM_THRESHOLD = 5

export const riskStatusSchema = z.enum(RISK_STATUSES)
export const riskCategorySchema = z.enum(RISK_CATEGORIES)
export const riskScaleSchema = z.number().int().min(RISK_SCALE_MIN).max(RISK_SCALE_MAX)
```

- [ ] **Step 2: Update risk Zod schemas**

In `server/src/schemas/riskSchemas.ts`, replace the imports and schemas:

```typescript
// FROM:
import {
  riskCategorySchema,
  riskProbabilitySchema,
  riskImpactSchema,
  riskStatusSchema,
} from '../constants/enums.js'

// TO:
import {
  riskCategorySchema,
  riskScaleSchema,
  riskStatusSchema,
} from '../constants/enums.js'
```

Update `createRiskSchema`:

```typescript
export const createRiskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullish(),
  category: riskCategorySchema.default('technical'),
  probability: riskScaleSchema.default(3),
  impact: riskScaleSchema.default(3),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid('Invalid owner ID').nullish(),
})
```

Update `updateRiskSchema`:

```typescript
export const updateRiskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
  category: riskCategorySchema.optional(),
  probability: riskScaleSchema.optional(),
  impact: riskScaleSchema.optional(),
  status: riskStatusSchema.optional(),
  mitigationPlan: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
})
```

Update `riskQuerySchema` — probability and impact filters now accept numeric strings:

```typescript
export const riskQuerySchema = paginationSchema.extend({
  projectId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  category: optionalQueryEnum(riskCategorySchema),
  status: optionalQueryEnum(riskStatusSchema),
  probability: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    riskScaleSchema.optional()
  ),
  impact: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    riskScaleSchema.optional()
  ),
  ownerId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  search: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
})
```

- [ ] **Step 3: Update TypeScript types**

In `server/src/types/index.ts`, change:

```typescript
// FROM:
export type RiskProbability = 'low' | 'medium' | 'high'
export type RiskImpact = 'low' | 'medium' | 'high'

// TO: (remove both lines entirely — probability/impact are now just `number`)
```

Update `CreateRiskInput` and `UpdateRiskInput` — change `probability` and `impact` fields from string to `number`:

```typescript
// In CreateRiskInput:
probability?: number   // 1-5
impact?: number        // 1-5

// In UpdateRiskInput:
probability?: number
impact?: number
```

Add new types at end of file:

```typescript
// ============================================================
// DOCUMENT VERSION
// ============================================================

export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  filePath: string
  fileSize: number
  mimeType: string
  note: string | null
  uploadedBy: { id: string; firstName: string; lastName: string }
  createdAt: string
}

// ============================================================
// RISK TASK LINK
// ============================================================

export type RiskTaskLinkType = 'mitigation' | 'verification' | 'related'

export interface RiskTaskLink {
  id: string
  riskId: string
  taskId: string
  linkType: RiskTaskLinkType
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string }
}

// ============================================================
// ACTIVITY ITEM
// ============================================================

export interface ActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  field?: string
  oldValue?: string
  newValue?: string
  user: { id: string; firstName: string; lastName: string }
  createdAt: string
}

// ============================================================
// KPI CARD
// ============================================================

export interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: string
  icon?: string
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/constants/enums.ts server/src/schemas/riskSchemas.ts server/src/types/index.ts
git commit -m "feat(risk): update types and schemas for 1-5 integer scale"
```

---

### Task 1.4: Update riskService for integer scale

**Files:**
- Modify: `server/src/services/riskService.ts`

- [ ] **Step 0: Update imports**

Remove `RiskProbability` and `RiskImpact` from the import statement (they no longer exist as types). Also update `RiskQueryParams` interface — change `probability?: string` and `impact?: string` to `probability?: number` and `impact?: number`.

- [ ] **Step 1: Remove calculateRiskLevel() and string mapping**

In `server/src/services/riskService.ts`, find and remove the `calculateRiskLevel()` function (around lines 47-64) and the `RISK_VALUE_MAP` / `getRiskLevelLabel` helpers.

Replace with:

```typescript
import { RISK_CRITICAL_THRESHOLD, RISK_HIGH_THRESHOLD, RISK_MEDIUM_THRESHOLD } from '../constants/enums.js'

/**
 * Calculate risk score from integer probability and impact (both 1-5)
 */
function calculateRiskScore(probability: number, impact: number): number {
  return probability * impact
}

/**
 * Get risk level label from score
 */
function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= RISK_CRITICAL_THRESHOLD) return 'critical'
  if (score >= RISK_HIGH_THRESHOLD) return 'high'
  if (score >= RISK_MEDIUM_THRESHOLD) return 'medium'
  return 'low'
}
```

- [ ] **Step 2: Update getStatistics() method**

The `getStatistics()` method currently counts `highLevelRisks` using string comparisons like `probability: 'high'`. Update to use integer thresholds:

Find the `highLevelRisks` count query and replace with a raw approach or a where clause using score calculation. Since Prisma doesn't support computed columns in `where`, fetch risks and filter:

```typescript
// In getStatistics:
// Replace highLevelRisks string query with:
const allOpenRisks = await prisma.risk.findMany({
  where: { projectId, isDeleted: false, status: { not: 'closed' } },
  select: { probability: true, impact: true },
})
const highLevelRisks = allOpenRisks.filter(
  r => r.probability * r.impact >= RISK_HIGH_THRESHOLD
).length
```

- [ ] **Step 3: Update getRiskMatrix() method**

The matrix currently uses string probability/impact as keys (`'low'`, `'medium'`, `'high'`). Update to use integer keys 1-5:

```typescript
// Replace the 3×3 string matrix with a 5×5 integer matrix
async getRiskMatrix(projectId: string) {
  const risks = await prisma.risk.findMany({
    where: { projectId, isDeleted: false, status: { not: 'closed' } },
    select: riskWithRelationsSelect,
  })

  // Build 5×5 matrix: matrix[probability][impact] = Risk[]
  const matrix: Record<number, Record<number, typeof risks>> = {}
  for (let p = 1; p <= 5; p++) {
    matrix[p] = {}
    for (let i = 1; i <= 5; i++) {
      matrix[p][i] = []
    }
  }

  for (const risk of risks) {
    matrix[risk.probability][risk.impact].push(risk)
  }

  return matrix
}
```

- [ ] **Step 4: Update notification thresholds in create/update**

In the `create` and `update` methods, replace high-risk notification checks:

```typescript
// FROM: if (calculateRiskLevel(probability, impact) >= 6)
// TO:
const score = probability * impact
if (score >= RISK_CRITICAL_THRESHOLD) {
  // Send high-risk notification...
}
```

- [ ] **Step 5: Update filter handling in getRisks()**

The `getRisks` query filter now uses integer probability/impact directly — Zod already parses them as numbers, so the Prisma where clause works without changes (Prisma compares `Int` fields correctly). Verify the where clause doesn't use `probability: filters.probability` with a string comparison.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/riskService.ts
git commit -m "refactor(risk): use integer 1-5 scale with direct score calculation"
```

---

### Task 1.5: Update dashboardService risk threshold

**Files:**
- Modify: `server/src/services/dashboardService.ts`

- [ ] **Step 1: Replace RISK_VALUE_MAP and isRiskCritical with integer comparison**

Find and remove:
- `RISK_VALUE_MAP` object (converts string→number)
- `isRiskCritical(probability: string, impact: string)` function (around line 127-131)

Replace all critical risk checks with:

```typescript
import { RISK_CRITICAL_THRESHOLD } from '../constants/enums.js'
// ...
// FROM: RISK_VALUE_MAP[r.probability] * RISK_VALUE_MAP[r.impact] > 6
// FROM: isRiskCritical(r.probability, r.impact)
// TO:
r.probability * r.impact >= RISK_CRITICAL_THRESHOLD
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/dashboardService.ts
git commit -m "fix(dashboard): update critical risk threshold to >= 15 for 1-5 scale"
```

---

### Task 1.6: Update analyticsService risk filters

**Files:**
- Modify: `server/src/services/analyticsService.ts`

- [ ] **Step 1: Find and update risk impact/probability string comparisons**

Search for `impact === 'high'` or `probability === 'high'` and replace with integer comparisons.

> **Semantic broadening (intentional)**: Previously only exact `'high'` matched. Now `>= 4` captures both "Alta" (4) and "Molto alta" (5) per the new 1-5 scale design. This is a deliberate design change.

```typescript
// FROM: impact === 'high'
// TO:   impact >= 4

// FROM: probability === 'high'
// TO:   probability >= 4
```

Also update any `RISK_VALUE_MAP` usage to direct integer math.

- [ ] **Step 2: Commit**

```bash
git add server/src/services/analyticsService.ts
git commit -m "refactor(analytics): update risk filters for integer 1-5 scale"
```

---

### Task 1.7: Update frontend types and constants for risk scale

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/lib/constants.ts`

- [ ] **Step 1: Update Risk type in frontend**

In `client/src/types/index.ts`, change the Risk interface:

```typescript
// FROM:
probability: RiskProbability  // 'low' | 'medium' | 'high'
impact: RiskImpact            // 'low' | 'medium' | 'high'

// TO:
probability: number  // 1-5
impact: number       // 1-5
```

Remove `RiskProbability` and `RiskImpact` type aliases if they exist as string unions. Also update `RiskSummary`:

```typescript
// FROM:
probability: string
impact: string
riskLevel: number

// TO:
probability: number
impact: number
score: number  // probability × impact (1-25)
```

Add the new types (DocumentVersion, RiskTaskLink, ActivityItem, KpiCard) matching the backend types from Task 1.3.

- [ ] **Step 2: Update constants**

In `client/src/lib/constants.ts`, replace risk probability/impact labels:

```typescript
// FROM:
export const RISK_PROBABILITY_LABELS: Record<string, string> = {
  low: 'Bassa', medium: 'Media', high: 'Alta'
}
export const RISK_IMPACT_LABELS: Record<string, string> = {
  low: 'Basso', medium: 'Medio', high: 'Alto'
}
export const RISK_SCORE_MAP: Record<string, number> = {
  low: 1, medium: 2, high: 3
}

// TO:
export const RISK_SCALE_LABELS: Record<number, string> = {
  1: 'Molto bassa', 2: 'Bassa', 3: 'Media', 4: 'Alta', 5: 'Molto alta'
}
export const RISK_SCALE_MIN = 1
export const RISK_SCALE_MAX = 5
export const RISK_CRITICAL_THRESHOLD = 15
export const RISK_HIGH_THRESHOLD = 10
export const RISK_MEDIUM_THRESHOLD = 5

export const RISK_LEVEL_LABELS: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Basso',
}

export const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= RISK_CRITICAL_THRESHOLD) return 'critical'
  if (score >= RISK_HIGH_THRESHOLD) return 'high'
  if (score >= RISK_MEDIUM_THRESHOLD) return 'medium'
  return 'low'
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts client/src/lib/constants.ts
git commit -m "feat(frontend): update types and constants for risk 1-5 scale"
```

---

## Chunk 2: Four Centralized Backend Services

### Task 2.1: statsService — KPI strip and summaries

> **IMPORTANT**: `statsService.ts` already exists with functions `getTaskStats`, `getTeamWorkload`, `getOverdueTasks`, `countTasksFromArray`, `getProjectTaskCountsMap`. The `analyticsService.ts` imports from it. ADD the new methods below alongside the existing exports — do NOT overwrite the file.

**Files:**
- Modify: `server/src/services/statsService.ts` (extend with new methods)
- Create: `server/src/controllers/statsController.ts`
- Create: `server/src/routes/statsRoutes.ts`
- Create: `server/src/schemas/statsSchemas.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Create statsSchemas.ts**

Create `server/src/schemas/statsSchemas.ts`:

```typescript
import { z } from 'zod'

export const statsDomainSchema = z.enum([
  'projects', 'documents', 'risks', 'users', 'tasks'
])

export const statsDomainParamSchema = z.object({
  domain: statsDomainSchema,
})

export const summaryParamSchema = z.object({
  id: z.string().uuid(),
})

export const statsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  role: z.string().optional(),
})
```

- [ ] **Step 2: Extend statsService.ts with KPI and summary methods**

Add the following methods to the **existing** `server/src/services/statsService.ts`. Preserve all existing exports. Key new methods:

```typescript
import { prisma } from '../models/prismaClient.js'
import { RISK_CRITICAL_THRESHOLD, RISK_HIGH_THRESHOLD } from '../constants/enums.js'
import type { KpiCard } from '../types/index.js'

// ---------- List-level KPIs ----------

export async function getProjectStats(userId?: string, role?: string): Promise<KpiCard[]> {
  const where = { isDeleted: false }
  const [total, active, onHold, completed] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.count({ where: { ...where, status: 'active' } }),
    prisma.project.count({ where: { ...where, status: 'on_hold' } }),
    prisma.project.count({ where: { ...where, status: 'completed' } }),
  ])

  return [
    { label: 'Totale progetti', value: total, color: 'blue', icon: 'FolderKanban' },
    { label: 'Attivi', value: active, color: 'green', icon: 'Play' },
    { label: 'In pausa', value: onHold, color: 'amber', icon: 'Pause' },
    { label: 'Completati', value: completed, color: 'emerald', icon: 'CheckCircle' },
  ]
}

// NOTE: Named getTaskKpis to avoid collision with existing getTaskStats() in this file
export async function getTaskKpis(userId?: string, role?: string): Promise<KpiCard[]> {
  const baseWhere = { isDeleted: false, taskType: { not: 'milestone' as const } }
  const assigneeFilter = role === 'dipendente' && userId
    ? { assigneeId: userId }
    : {}
  const where = { ...baseWhere, ...assigneeFilter }

  const [total, todo, inProgress, done, blocked] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: 'todo' } }),
    prisma.task.count({ where: { ...where, status: 'in_progress' } }),
    prisma.task.count({ where: { ...where, status: 'done' } }),
    prisma.task.count({ where: { ...where, status: 'blocked' } }),
  ])

  return [
    { label: 'Totale task', value: total, color: 'blue', icon: 'CheckSquare' },
    { label: 'Da fare', value: todo, color: 'slate', icon: 'Circle' },
    { label: 'In corso', value: inProgress, color: 'blue', icon: 'Play' },
    { label: 'Completati', value: done, color: 'green', icon: 'CheckCircle' },
    { label: 'Bloccati', value: blocked, color: 'red', icon: 'Ban' },
  ]
}

export async function getRiskStats(userId?: string, role?: string): Promise<KpiCard[]> {
  const where = { isDeleted: false }

  const [total, open, mitigated] = await Promise.all([
    prisma.risk.count({ where }),
    prisma.risk.count({ where: { ...where, status: 'open' } }),
    prisma.risk.count({ where: { ...where, status: 'mitigated' } }),
  ])

  // Count critical risks (score >= 15)
  const openRisks = await prisma.risk.findMany({
    where: { ...where, status: 'open' },
    select: { probability: true, impact: true },
  })
  const critical = openRisks.filter(r => r.probability * r.impact >= RISK_CRITICAL_THRESHOLD).length
  const high = openRisks.filter(r => {
    const s = r.probability * r.impact
    return s >= RISK_HIGH_THRESHOLD && s < RISK_CRITICAL_THRESHOLD
  }).length

  return [
    { label: 'Totale rischi', value: total, color: 'red', icon: 'AlertTriangle' },
    { label: 'Aperti', value: open, color: 'red', icon: 'AlertCircle' },
    { label: 'Critici', value: critical, color: 'red', icon: 'Flame' },
    { label: 'Alti', value: high, color: 'orange', icon: 'TrendingUp' },
    { label: 'Mitigati', value: mitigated, color: 'blue', icon: 'Shield' },
  ]
}

export async function getDocumentStats(userId?: string, role?: string): Promise<KpiCard[]> {
  const where = { isDeleted: false }

  const [total, draft, review, approved] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, status: 'draft' } }),
    prisma.document.count({ where: { ...where, status: 'review' } }),
    prisma.document.count({ where: { ...where, status: 'approved' } }),
  ])

  return [
    { label: 'Totale documenti', value: total, color: 'purple', icon: 'FileText' },
    { label: 'Bozze', value: draft, color: 'slate', icon: 'FilePlus' },
    { label: 'In revisione', value: review, color: 'amber', icon: 'FileSearch' },
    { label: 'Approvati', value: approved, color: 'green', icon: 'FileCheck' },
  ]
}

export async function getUserStats(): Promise<KpiCard[]> {
  const where = { isDeleted: false, isActive: true }

  const [total, admins, direzione, dipendenti] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, role: 'admin' } }),
    prisma.user.count({ where: { ...where, role: 'direzione' } }),
    prisma.user.count({ where: { ...where, role: 'dipendente' } }),
  ])

  return [
    { label: 'Totale utenti', value: total, color: 'green', icon: 'Users' },
    { label: 'Admin', value: admins, color: 'red', icon: 'ShieldCheck' },
    { label: 'Direzione', value: direzione, color: 'purple', icon: 'Crown' },
    { label: 'Dipendenti', value: dipendenti, color: 'blue', icon: 'User' },
  ]
}

// ---------- Detail-level Summaries ----------

export async function getProjectSummary(projectId: string): Promise<KpiCard[]> {
  const tasks = await prisma.task.findMany({
    where: { projectId, isDeleted: false, taskType: { not: 'milestone' } },
    select: { status: true, estimatedHours: true },
  })
  const milestones = await prisma.task.count({
    where: { projectId, isDeleted: false, taskType: 'milestone' },
  })
  const timeEntries = await prisma.timeEntry.findMany({
    where: { task: { projectId }, isDeleted: false },
    select: { duration: true, user: { select: { hourlyRate: true } } },
  })
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { budget: true },
  })

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const hoursLogged = timeEntries.reduce((sum, te) => sum + (te.duration ?? 0), 0) / 60
  const hoursEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0)
  const budgetHoursPercent = hoursEstimated > 0
    ? Math.round((hoursLogged / hoursEstimated) * 100)
    : null

  // Money budget
  const moneyUsed = timeEntries.reduce((sum, te) => {
    const rate = te.user?.hourlyRate ? Number(te.user.hourlyRate) : 0
    return sum + ((te.duration ?? 0) / 60) * rate
  }, 0)
  const budgetTotal = project?.budget ? Number(project.budget) : null
  const budgetMoneyPercent = budgetTotal
    ? Math.round((moneyUsed / budgetTotal) * 100)
    : null

  return [
    { label: 'Avanzamento', value: `${progress}%`, color: 'blue', icon: 'TrendingUp' },
    { label: 'Task', value: `${completedTasks}/${totalTasks}`, color: 'blue', icon: 'CheckSquare' },
    { label: 'Milestone', value: milestones, color: 'purple', icon: 'Flag' },
    { label: 'Ore registrate', value: `${hoursLogged.toFixed(1)}h`, color: 'green', icon: 'Clock',
      subtitle: hoursEstimated > 0 ? `di ${hoursEstimated}h stimate` : undefined },
    ...(budgetHoursPercent !== null
      ? [{ label: 'Budget ore', value: `${budgetHoursPercent}%`, color: budgetHoursPercent > 100 ? 'red' : 'green', icon: 'Timer' }]
      : []),
    ...(budgetMoneyPercent !== null
      ? [{ label: 'Budget €', value: `${budgetMoneyPercent}%`, color: budgetMoneyPercent > 100 ? 'red' : 'green', icon: 'Euro',
           subtitle: `€${moneyUsed.toFixed(0)} di €${budgetTotal!.toFixed(0)}` }]
      : []),
  ]
}

export async function getTaskSummary(taskId: string): Promise<KpiCard[]> {
  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: taskId, isDeleted: false },
    select: { status: true },
  })
  const timeEntries = await prisma.timeEntry.findMany({
    where: { taskId, isDeleted: false },
    select: { duration: true },
  })
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { estimatedHours: true },
  })

  const subtotalDone = subtasks.filter(s => s.status === 'done').length
  const subtasksTotal = subtasks.length
  const completion = subtasksTotal > 0
    ? Math.round((subtotalDone / subtasksTotal) * 100)
    : 0

  const hoursLogged = timeEntries.reduce((sum, te) => sum + (te.duration ?? 0), 0) / 60
  const hoursEstimated = task?.estimatedHours ?? 0
  const hoursRemaining = Math.max(0, hoursEstimated - hoursLogged)

  return [
    ...(subtasksTotal > 0
      ? [{ label: 'Subtask', value: `${subtotalDone}/${subtasksTotal}`, color: 'blue', icon: 'GitBranch',
           subtitle: `${completion}% completato` }]
      : []),
    { label: 'Ore registrate', value: `${hoursLogged.toFixed(1)}h`, color: 'green', icon: 'Clock' },
    ...(hoursEstimated > 0
      ? [{ label: 'Ore stimate', value: `${hoursEstimated}h`, color: 'blue', icon: 'Timer' },
         { label: 'Ore rimanenti', value: `${hoursRemaining.toFixed(1)}h`, color: hoursRemaining > 0 ? 'amber' : 'green', icon: 'Hourglass' }]
      : []),
  ]
}
```

- [ ] **Step 3: Create statsController.ts**

Create `server/src/controllers/statsController.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { statsDomainParamSchema, summaryParamSchema } from '../schemas/statsSchemas.js'
import * as statsService from '../services/statsService.js'

const DOMAIN_HANDLERS: Record<string, (userId?: string, role?: string) => Promise<unknown>> = {
  projects: statsService.getProjectStats,
  tasks: statsService.getTaskKpis,
  risks: statsService.getRiskStats,
  documents: statsService.getDocumentStats,
  users: statsService.getUserStats,
}

export async function getDomainStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req)
    const role = req.user?.role ?? 'dipendente'
    const { domain } = statsDomainParamSchema.parse(req.params)
    const handler = DOMAIN_HANDLERS[domain]
    const stats = await handler(userId, role)
    sendSuccess(res, stats)
  } catch (error) {
    next(error)
  }
}

export async function getProjectSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = summaryParamSchema.parse(req.params)
    const summary = await statsService.getProjectSummary(id)
    sendSuccess(res, summary)
  } catch (error) {
    next(error)
  }
}

export async function getTaskSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id } = summaryParamSchema.parse(req.params)
    const summary = await statsService.getTaskSummary(id)
    sendSuccess(res, summary)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 4: Create statsRoutes.ts**

Create `server/src/routes/statsRoutes.ts`:

```typescript
import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as statsController from '../controllers/statsController.js'

const router = Router()

router.use(authMiddleware)

// Specific routes BEFORE parametric :domain
router.get('/project/:id/summary', statsController.getProjectSummary)
router.get('/task/:id/summary', statsController.getTaskSummary)
router.get('/:domain', statsController.getDomainStats)

export default router
```

- [ ] **Step 5: Register in routes/index.ts**

In `server/src/routes/index.ts`, add import and mount:

```typescript
import statsRoutes from './statsRoutes.js'
// ... (with other imports)

// Add before the dashboard route:
router.use('/stats', statsRoutes)
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/statsService.ts server/src/controllers/statsController.ts server/src/routes/statsRoutes.ts server/src/schemas/statsSchemas.ts server/src/routes/index.ts
git commit -m "feat(api): add statsService with domain KPI and project/task summary endpoints"
```

---

### Task 2.2: activityService — Unified timeline

**Files:**
- Create: `server/src/services/activityService.ts`
- Create: `server/src/controllers/activityController.ts`
- Create: `server/src/routes/activityRoutes.ts`
- Create: `server/src/schemas/activitySchemas.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Create activitySchemas.ts**

Create `server/src/schemas/activitySchemas.ts`:

```typescript
import { z } from 'zod'

export const activityParamSchema = z.object({
  entityType: z.enum(['project', 'task', 'risk', 'document', 'user']),
  entityId: z.string().uuid(),
})

export const activityQuerySchema = z.object({
  limit: z.preprocess(
    (v) => (v === '' || v === undefined ? 20 : Number(v)),
    z.number().int().min(1).max(100).default(20)
  ),
})
```

- [ ] **Step 2: Create activityService.ts**

Create `server/src/services/activityService.ts`:

```typescript
import { prisma } from '../models/prismaClient.js'
import { userMinimalSelect } from '../utils/selectFields.js'
import type { ActivityItem } from '../types/index.js'

function extractEntityName(log: { newData: string | null; oldData: string | null }): string {
  try {
    const data = log.newData ? JSON.parse(log.newData) : log.oldData ? JSON.parse(log.oldData) : {}
    return data.name || data.title || data.code || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function extractFieldChange(log: { oldData: string | null; newData: string | null }): {
  field?: string; oldValue?: string; newValue?: string
} {
  try {
    const oldObj = log.oldData ? JSON.parse(log.oldData) : {}
    const newObj = log.newData ? JSON.parse(log.newData) : {}

    // Find first changed field
    for (const key of Object.keys(newObj)) {
      if (oldObj[key] !== undefined && oldObj[key] !== newObj[key]) {
        return {
          field: key,
          oldValue: String(oldObj[key] ?? ''),
          newValue: String(newObj[key] ?? ''),
        }
      }
    }
    return {}
  } catch {
    return {}
  }
}

function mapToActivityItem(log: {
  id: string
  action: string
  entityType: string
  entityId: string
  oldData: string | null
  newData: string | null
  createdAt: Date
  user: { id: string; firstName: string; lastName: string }
}): ActivityItem {
  const change = log.action === 'update' ? extractFieldChange(log) : {}
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityName: extractEntityName(log),
    ...change,
    user: log.user,
    createdAt: log.createdAt.toISOString(),
  }
}

export async function getEntityActivity(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    select: {
      id: true, action: true, entityType: true, entityId: true,
      oldData: true, newData: true, createdAt: true,
      user: { select: userMinimalSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}

export async function getUserActivity(userId: string, limit = 20): Promise<ActivityItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    select: {
      id: true, action: true, entityType: true, entityId: true,
      oldData: true, newData: true, createdAt: true,
      user: { select: userMinimalSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}

export async function getFeed(userId: string, role: string, limit = 20): Promise<ActivityItem[]> {
  const where = role === 'dipendente' ? { userId } : {}
  const logs = await prisma.auditLog.findMany({
    where,
    select: {
      id: true, action: true, entityType: true, entityId: true,
      oldData: true, newData: true, createdAt: true,
      user: { select: userMinimalSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map(mapToActivityItem)
}
```

- [ ] **Step 3: Create activityController.ts**

Create `server/src/controllers/activityController.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { activityParamSchema, activityQuerySchema } from '../schemas/activitySchemas.js'
import * as activityService from '../services/activityService.js'

export async function getEntityActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { entityType, entityId } = activityParamSchema.parse(req.params)
    const { limit } = activityQuerySchema.parse(req.query)

    let items
    if (entityType === 'user') {
      items = await activityService.getUserActivity(entityId, limit)
    } else {
      items = await activityService.getEntityActivity(entityType, entityId, limit)
    }

    sendSuccess(res, items)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 4: Create activityRoutes.ts**

Create `server/src/routes/activityRoutes.ts`:

```typescript
import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as activityController from '../controllers/activityController.js'

const router = Router()

router.use(authMiddleware)

router.get('/:entityType/:entityId', activityController.getEntityActivity)

export default router
```

- [ ] **Step 5: Register in routes/index.ts**

```typescript
import activityRoutes from './activityRoutes.js'
// ...
router.use('/activity', activityRoutes)
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/activityService.ts server/src/controllers/activityController.ts server/src/routes/activityRoutes.ts server/src/schemas/activitySchemas.ts server/src/routes/index.ts
git commit -m "feat(api): add activityService with unified timeline endpoint"
```

---

### Task 2.3: enrichmentService — Batch enrichment for lists

**Files:**
- Create: `server/src/services/enrichmentService.ts`

- [ ] **Step 1: Create enrichmentService.ts**

Create `server/src/services/enrichmentService.ts`:

```typescript
import { prisma } from '../models/prismaClient.js'

// ============================================================
// TYPES
// ============================================================

export interface EnrichedProject {
  progress: number
  teamCount: number
  milestoneCount: number
  openTaskCount: number
  budgetUsedPercent: number | null
  memberAvatars: Array<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }>
}

export interface EnrichedTask {
  subtasksDone: number
  subtasksTotal: number
  hoursLogged: number
  hoursEstimated: number
  completion: number
}

// ============================================================
// PROJECT ENRICHMENT
// ============================================================

export async function enrichProjects<T extends { id: string }>(
  projects: T[]
): Promise<(T & EnrichedProject)[]> {
  if (projects.length === 0) return []

  const ids = projects.map(p => p.id)

  // Task counts by project (excluding milestones)
  const taskCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: { not: 'milestone' } },
    _count: true,
  })

  // Completed task counts
  const doneCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: { not: 'milestone' }, status: 'done' },
    _count: true,
  })

  // Open (not done/cancelled) task counts
  const openCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: ids }, isDeleted: false, taskType: { not: 'milestone' },
      status: { notIn: ['done', 'cancelled'] },
    },
    _count: true,
  })

  // Milestone counts
  const milestoneCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: 'milestone' },
    _count: true,
  })

  // Team counts
  const teamCounts = await prisma.projectMember.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids } },
    _count: true,
  })

  // Member avatars (top 5 per project)
  const members = await prisma.projectMember.findMany({
    where: { projectId: { in: ids } },
    select: {
      projectId: true,
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    take: ids.length * 5, // rough limit
  })

  // Hours logged per project
  const timeEntries = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: {
      task: { projectId: { in: ids }, isDeleted: false },
      isDeleted: false,
    },
    _sum: { duration: true },
  })

  // Map taskId → projectId for time aggregation
  const taskProjectMap = await prisma.task.findMany({
    where: { projectId: { in: ids }, isDeleted: false },
    select: { id: true, projectId: true },
  })
  const tpMap = new Map(taskProjectMap.map(t => [t.id, t.projectId]))

  // Aggregate hours by project
  const hoursByProject = new Map<string, number>()
  for (const te of timeEntries) {
    const projId = tpMap.get(te.taskId)
    if (projId) {
      hoursByProject.set(projId, (hoursByProject.get(projId) ?? 0) + (te._sum.duration ?? 0))
    }
  }

  // Estimated hours per project
  const estimatedHours = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: { not: 'milestone' } },
    _sum: { estimatedHours: true },
  })

  // Build lookup maps
  const taskCountMap = new Map(taskCounts.map(t => [t.projectId, t._count]))
  const doneCountMap = new Map(doneCounts.map(t => [t.projectId, t._count]))
  const openCountMap = new Map(openCounts.map(t => [t.projectId, t._count]))
  const milestoneMap = new Map(milestoneCounts.map(t => [t.projectId, t._count]))
  const teamCountMap = new Map(teamCounts.map(t => [t.projectId, t._count]))
  const estimatedMap = new Map(estimatedHours.map(t => [t.projectId, t._sum.estimatedHours ?? 0]))

  // Group member avatars by project (max 5)
  const avatarsByProject = new Map<string, EnrichedProject['memberAvatars']>()
  for (const m of members) {
    const list = avatarsByProject.get(m.projectId) ?? []
    if (list.length < 5) {
      list.push(m.user)
      avatarsByProject.set(m.projectId, list)
    }
  }

  return projects.map(p => {
    const total = taskCountMap.get(p.id) ?? 0
    const done = doneCountMap.get(p.id) ?? 0
    const logged = (hoursByProject.get(p.id) ?? 0) / 60
    const estimated = estimatedMap.get(p.id) ?? 0

    return {
      ...p,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      teamCount: teamCountMap.get(p.id) ?? 0,
      milestoneCount: milestoneMap.get(p.id) ?? 0,
      openTaskCount: openCountMap.get(p.id) ?? 0,
      budgetUsedPercent: estimated > 0 ? Math.round((logged / estimated) * 100) : null, // hours-based; money-based budget is in statsService.getProjectSummary()
      memberAvatars: avatarsByProject.get(p.id) ?? [],
    }
  })
}

// ============================================================
// TASK ENRICHMENT
// ============================================================

export async function enrichTasks<T extends { id: string; estimatedHours?: number | null }>(
  tasks: T[]
): Promise<(T & EnrichedTask)[]> {
  if (tasks.length === 0) return []

  const ids = tasks.map(t => t.id)

  // Subtask counts by parent
  const subtaskCounts = await prisma.task.groupBy({
    by: ['parentTaskId'],
    where: { parentTaskId: { in: ids }, isDeleted: false },
    _count: true,
  })

  const subtaskDoneCounts = await prisma.task.groupBy({
    by: ['parentTaskId'],
    where: { parentTaskId: { in: ids }, isDeleted: false, status: 'done' },
    _count: true,
  })

  // Hours logged per task
  const timeEntries = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: { taskId: { in: ids }, isDeleted: false },
    _sum: { duration: true },
  })

  const subtaskMap = new Map(subtaskCounts.map(s => [s.parentTaskId!, s._count]))
  const subtaskDoneMap = new Map(subtaskDoneCounts.map(s => [s.parentTaskId!, s._count]))
  const hoursMap = new Map(timeEntries.map(te => [te.taskId, (te._sum.duration ?? 0) / 60]))

  return tasks.map(t => {
    const subtasksTotal = subtaskMap.get(t.id) ?? 0
    const subtasksDone = subtaskDoneMap.get(t.id) ?? 0
    const hoursLogged = hoursMap.get(t.id) ?? 0
    const hoursEstimated = t.estimatedHours ?? 0

    return {
      ...t,
      subtasksDone,
      subtasksTotal,
      hoursLogged: Math.round(hoursLogged * 10) / 10,
      hoursEstimated,
      completion: subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0,
    }
  })
}

// ============================================================
// KANBAN CARD ENRICHMENT (lighter)
// ============================================================

export async function enrichKanbanCards<T extends { id: string }>(
  tasks: T[]
): Promise<(T & { subtasksDone: number; subtasksTotal: number })[]> {
  if (tasks.length === 0) return []

  const ids = tasks.map(t => t.id)

  const subtaskCounts = await prisma.task.groupBy({
    by: ['parentTaskId'],
    where: { parentTaskId: { in: ids }, isDeleted: false },
    _count: true,
  })

  const subtaskDoneCounts = await prisma.task.groupBy({
    by: ['parentTaskId'],
    where: { parentTaskId: { in: ids }, isDeleted: false, status: 'done' },
    _count: true,
  })

  const subtaskMap = new Map(subtaskCounts.map(s => [s.parentTaskId!, s._count]))
  const subtaskDoneMap = new Map(subtaskDoneCounts.map(s => [s.parentTaskId!, s._count]))

  return tasks.map(t => ({
    ...t,
    subtasksDone: subtaskDoneMap.get(t.id) ?? 0,
    subtasksTotal: subtaskMap.get(t.id) ?? 0,
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/enrichmentService.ts
git commit -m "feat(api): add enrichmentService for batch project/task list enrichment"
```

---

### Task 2.4: relatedEntitiesService — Polymorphic relations

**Files:**
- Create: `server/src/services/relatedEntitiesService.ts`
- Create: `server/src/controllers/relatedController.ts`
- Create: `server/src/routes/relatedRoutes.ts`
- Create: `server/src/schemas/relatedSchemas.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Create relatedSchemas.ts**

Create `server/src/schemas/relatedSchemas.ts`:

```typescript
import { z } from 'zod'

export const relatedParamSchema = z.object({
  entityType: z.enum(['project', 'task', 'risk', 'document', 'user']),
  entityId: z.string().uuid(),
})

export const relatedQuerySchema = z.object({
  include: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : []),
    z.array(z.enum(['tasks', 'risks', 'documents', 'team', 'projects', 'milestones', 'versions'])).min(1)
  ),
  limit: z.preprocess(
    (v) => (v === '' || v === undefined ? 10 : Number(v)),
    z.number().int().min(1).max(50).default(10)
  ),
})
```

- [ ] **Step 2: Create relatedEntitiesService.ts**

Create `server/src/services/relatedEntitiesService.ts`:

```typescript
import { prisma } from '../models/prismaClient.js'
import { userWithAvatarSelect, documentVersionSelect, riskTaskWithTaskSelect, riskTaskWithRiskSelect } from '../utils/selectFields.js'

type RelatedResult = Record<string, unknown[]>

interface RelatedConfig {
  entityType: string
  entityId: string
  include: string[]
  limit: number
}

const HANDLERS: Record<string, Record<string, (entityId: string, limit: number) => Promise<unknown[]>>> = {
  project: {
    risks: async (id, limit) => prisma.risk.findMany({
      where: { projectId: id, isDeleted: false },
      select: { id: true, code: true, title: true, status: true, probability: true, impact: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    documents: async (id, limit) => prisma.document.findMany({
      where: { projectId: id, isDeleted: false },
      select: { id: true, code: true, title: true, status: true, type: true, version: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    team: async (id, limit) => prisma.projectMember.findMany({
      where: { projectId: id },
      select: { id: true, role: true, user: { select: userWithAvatarSelect } },
      take: limit,
    }),
    milestones: async (id, limit) => prisma.task.findMany({
      where: { projectId: id, isDeleted: false, taskType: 'milestone' },
      select: { id: true, title: true, code: true, status: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: limit,
    }),
    tasks: async (id, limit) => prisma.task.findMany({
      where: { projectId: id, isDeleted: false, taskType: { not: 'milestone' } },
      select: { id: true, title: true, code: true, status: true, priority: true, assigneeId: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  },
  risk: {
    tasks: async (id, limit) => prisma.riskTask.findMany({
      where: { riskId: id },
      select: riskTaskWithTaskSelect,
      take: limit,
    }),
  },
  task: {
    risks: async (id, limit) => prisma.riskTask.findMany({
      where: { taskId: id },
      select: riskTaskWithRiskSelect,
      take: limit,
    }),
  },
  user: {
    projects: async (id, limit) => prisma.projectMember.findMany({
      where: { userId: id },
      select: {
        id: true,
        role: true,
        project: { select: { id: true, code: true, name: true, status: true } },
      },
      take: limit,
    }),
  },
  document: {
    versions: async (id, limit) => prisma.documentVersion.findMany({
      where: { documentId: id },
      select: documentVersionSelect,
      orderBy: { version: 'desc' },
      take: limit,
    }),
  },
}

export async function getRelated(config: RelatedConfig): Promise<RelatedResult> {
  const entityHandlers = HANDLERS[config.entityType] ?? {}
  const result: RelatedResult = {}

  const promises = config.include
    .filter(rel => entityHandlers[rel])
    .map(async (rel) => {
      result[rel] = await entityHandlers[rel](config.entityId, config.limit)
    })

  await Promise.all(promises)
  return result
}
```

- [ ] **Step 3: Create relatedController.ts**

Create `server/src/controllers/relatedController.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express'
import { requireUserId } from '../utils/controllerHelpers.js'
import { sendSuccess } from '../utils/responseHelpers.js'
import { relatedParamSchema, relatedQuerySchema } from '../schemas/relatedSchemas.js'
import * as relatedEntitiesService from '../services/relatedEntitiesService.js'

export async function getRelated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { entityType, entityId } = relatedParamSchema.parse(req.params)
    const { include, limit } = relatedQuerySchema.parse(req.query)
    const result = await relatedEntitiesService.getRelated({ entityType, entityId, include, limit })
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 4: Create relatedRoutes.ts**

Create `server/src/routes/relatedRoutes.ts`:

```typescript
import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as relatedController from '../controllers/relatedController.js'

const router = Router()

router.use(authMiddleware)

router.get('/:entityType/:entityId', relatedController.getRelated)

export default router
```

- [ ] **Step 5: Register in routes/index.ts**

```typescript
import relatedRoutes from './relatedRoutes.js'
// ...
router.use('/related', relatedRoutes)
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/relatedEntitiesService.ts server/src/controllers/relatedController.ts server/src/routes/relatedRoutes.ts server/src/schemas/relatedSchemas.ts server/src/routes/index.ts
git commit -m "feat(api): add relatedEntitiesService with polymorphic entity relations endpoint"
```

---

## Chunk 3: Service Integration + Dashboard + Document Versioning

### Task 3.1: Integrate enrichmentService into projectService and taskService

**Files:**
- Modify: `server/src/services/projectService.ts`
- Modify: `server/src/services/taskService.ts`

- [ ] **Step 1: Enrich project list responses**

In `server/src/services/projectService.ts`, find the `getAll()` / `getProjects()` method. After fetching the paginated data, enrich before returning:

```typescript
import { enrichProjects } from './enrichmentService.js'

// In getAll/getProjects, after the findMany:
const enrichedData = await enrichProjects(data)
return {
  data: enrichedData,
  pagination: buildPagination(page, limit, total),
}
```

- [ ] **Step 2: Enrich task list responses**

In `server/src/services/taskService.ts`, find the `getTasks()` method. After fetching data:

```typescript
import { enrichTasks, enrichKanbanCards } from './enrichmentService.js'

// In getTasks, after findMany:
const enrichedData = await enrichTasks(data)
return {
  data: enrichedData,
  pagination: buildPagination(page, limit, total),
}
```

For the Kanban method (if it exists as `getKanban()` or `getTasksByProject()`), enrich with the lighter version:

```typescript
// In getKanban/board view method:
const enrichedCards = await enrichKanbanCards(data)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/projectService.ts server/src/services/taskService.ts
git commit -m "feat(api): integrate enrichmentService into project and task list responses"
```

---

### Task 3.2: Dashboard enhancements

**Files:**
- Modify: `server/src/services/dashboardService.ts`

- [ ] **Step 1: Add milestone_at_risk to getAttention()**

In `dashboardService.ts`, in the `getAttention()` method, add a new attention type after the existing ones:

```typescript
// Milestone at risk: due within 7 days, not done, has blocked/overdue subtasks
const now = new Date()
const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

const riskyMilestones = await prisma.task.findMany({
  where: {
    taskType: 'milestone',
    isDeleted: false,
    status: { notIn: ['done', 'cancelled'] },
    dueDate: { gte: now, lte: sevenDaysFromNow },
  },
  select: {
    id: true,
    title: true,
    dueDate: true,
    projectId: true,
    project: { select: { name: true } },
    subtasks: {
      where: {
        isDeleted: false,
        OR: [
          { status: 'blocked' },
          { dueDate: { lt: now }, status: { notIn: ['done', 'cancelled'] } },
        ],
      },
      select: { id: true },
    },
  },
  orderBy: { dueDate: 'asc' },
})

for (const ms of riskyMilestones) {
  if (ms.subtasks.length > 0) {
    items.push({
      type: 'milestone_at_risk',
      entityId: ms.id,
      title: ms.title,
      projectName: ms.project.name,
      projectId: ms.projectId,
      dueDate: ms.dueDate?.toISOString() ?? null,
      extra: `${ms.subtasks.length} task problematic${ms.subtasks.length > 1 ? 'i' : 'o'}`,
    })
  }
}
```

- [ ] **Step 2: Add `days` param to getMyTasksToday()**

Update the `getMyTasksToday()` signature and query to accept a `days` parameter:

```typescript
// FROM:
async function getMyTasksToday(userId: string)

// TO:
async function getMyTasksToday(userId: string, days = 1)

// Update the date range:
const start = new Date()
start.setHours(0, 0, 0, 0)
const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000 - 1)

// Use `end` instead of end-of-today in the dueDate query
```

Update the controller to parse `days` from query:

```typescript
const days = req.query.days ? Number(req.query.days) : 1
const tasks = await dashboardService.getMyTasksToday(userId, days)
```

- [ ] **Step 3: Implement budgetUsedPercent in getStats()**

In the `getStats()` method, add real budget calculation:

```typescript
// After existing stat calculations, add:
const activeProjectIds = await prisma.project.findMany({
  where: { isDeleted: false, status: 'active', budget: { not: null } },
  select: { id: true, budget: true },
})

let budgetUsedPercent: number | null = null
if (activeProjectIds.length > 0) {
  const totalBudget = activeProjectIds.reduce((sum, p) => sum + Number(p.budget!), 0)
  if (totalBudget > 0) {
    const timeWithRates = await prisma.timeEntry.findMany({
      where: {
        task: { projectId: { in: activeProjectIds.map(p => p.id) }, isDeleted: false },
        isDeleted: false,
      },
      select: { duration: true, user: { select: { hourlyRate: true } } },
    })
    const totalSpent = timeWithRates.reduce((sum, te) => {
      const rate = te.user?.hourlyRate ? Number(te.user.hourlyRate) : 0
      return sum + ((te.duration ?? 0) / 60) * rate
    }, 0)
    budgetUsedPercent = Math.round((totalSpent / totalBudget) * 100)
  }
}

// Include budgetUsedPercent in the returned stats object
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/dashboardService.ts server/src/controllers/dashboardController.ts
git commit -m "feat(dashboard): add milestone_at_risk attention, days param, budget calculation"
```

---

### Task 3.3: Document versioning

**Files:**
- Modify: `server/src/services/documentService.ts`
- Modify: `server/src/controllers/documentController.ts`

- [ ] **Step 1: Create DocumentVersion on file update**

In `server/src/services/documentService.ts`, find the `updateFile()` / `updateDocumentFile()` method. Before updating the document, create a version snapshot:

```typescript
// In the updateFile method, inside the transaction:
// 1. Fetch current document data
const current = await tx.document.findUnique({
  where: { id: documentId },
  select: { filePath: true, fileSize: true, mimeType: true, version: true },
})

if (current && current.filePath) {
  // 2. Create version record with current data
  await tx.documentVersion.create({
    data: {
      documentId,
      version: current.version,
      filePath: current.filePath,
      fileSize: current.fileSize ?? 0,
      mimeType: current.mimeType ?? 'application/octet-stream',
      uploadedById: userId,
    },
  })
}

// 3. Then update the document with new file + increment version (existing code)
```

- [ ] **Step 2: Add download endpoint for specific version**

In `server/src/controllers/documentController.ts`, add a new handler:

```typescript
export async function downloadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUserId(req)
    const { id, versionId } = z.object({
      id: z.string().uuid(),
      versionId: z.string().uuid(),
    }).parse(req.params)

    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId: id },
    })

    if (!version) {
      throw new AppError('Version not found', 404)
    }

    // Stream file from filePath (same pattern as existing download)
    res.download(version.filePath)
  } catch (error) {
    next(error)
  }
}
```

Add route in document routes:

```typescript
router.get('/:id/versions/:versionId/download', documentController.downloadVersion)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/documentService.ts server/src/controllers/documentController.ts server/src/routes/documentRoutes.ts
git commit -m "feat(documents): add version history on file update and version download endpoint"
```

---

## Chunk 4: Frontend Hooks + Page Wiring

### Task 4.1: Create frontend hooks

**Files:**
- Create: `client/src/hooks/api/useStats.ts`
- Create: `client/src/hooks/api/useActivity.ts`
- Create: `client/src/hooks/api/useRelated.ts`

- [ ] **Step 1: Create useStats.ts**

Create `client/src/hooks/api/useStats.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { KpiCard } from '@/types'

const KEYS = {
  all: ['stats'] as const,
  domain: (domain: string) => [...KEYS.all, domain] as const,
  summary: (type: string, id: string) => [...KEYS.all, 'summary', type, id] as const,
}

export function useStatsQuery(domain: string) {
  return useQuery({
    queryKey: KEYS.domain(domain),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: KpiCard[] }>(`/stats/${domain}`)
      return data.data
    },
  })
}

export function useSummaryQuery(type: 'project' | 'task', id: string) {
  return useQuery({
    queryKey: KEYS.summary(type, id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: KpiCard[] }>(`/stats/${type}/${id}/summary`)
      return data.data
    },
    enabled: !!id,
  })
}
```

- [ ] **Step 2: Create useActivity.ts**

Create `client/src/hooks/api/useActivity.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityItem } from '@/types'

const KEYS = {
  all: ['activity'] as const,
  entity: (entityType: string, entityId: string) =>
    [...KEYS.all, entityType, entityId] as const,
}

export function useActivityQuery(
  entityType: string,
  entityId: string,
  limit = 20
) {
  return useQuery({
    queryKey: KEYS.entity(entityType, entityId),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ActivityItem[] }>(
        `/activity/${entityType}/${entityId}`,
        { params: { limit } }
      )
      return data.data
    },
    enabled: !!entityId,
  })
}
```

- [ ] **Step 3: Create useRelated.ts**

Create `client/src/hooks/api/useRelated.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['related'] as const,
  entity: (entityType: string, entityId: string, include: string[]) =>
    [...KEYS.all, entityType, entityId, include.sort().join(',')] as const,
}

export function useRelatedQuery(
  entityType: string,
  entityId: string,
  include: string[],
  limit = 10
) {
  return useQuery({
    queryKey: KEYS.entity(entityType, entityId, include),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Record<string, unknown[]> }>(
        `/related/${entityType}/${entityId}`,
        { params: { include: include.join(','), limit } }
      )
      return data.data
    },
    enabled: !!entityId && include.length > 0,
  })
}
```

- [ ] **Step 4: Update useDashboard.ts for days param**

In `client/src/hooks/api/useDashboard.ts`, find `useMyTasksTodayQuery` and add a `days` parameter:

```typescript
// Update query key to include days
export function useMyTasksTodayQuery(days = 1) {
  return useQuery({
    queryKey: [...KEYS.myTasksToday(), days] as const,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/my-tasks-today', { params: { days } })
      return data.data
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/api/useStats.ts client/src/hooks/api/useActivity.ts client/src/hooks/api/useRelated.ts client/src/hooks/api/useDashboard.ts
git commit -m "feat(frontend): add useStats, useActivity, useRelated hooks and days param for dashboard"
```

---

### Task 4.2: Wire KPI strip into list pages

**Files:**
- Modify: Various list pages (ProjectListPage, TaskListPage, RiskListPage, DocumentListPage, UserListPage)

- [ ] **Step 1: Add kpiStrip to ProjectListPage**

In the project list page, import and use the stats hook:

```typescript
import { useStatsQuery } from '@/hooks/api/useStats'

// Inside the component:
const { data: kpiCards } = useStatsQuery('projects')

// Pass to EntityList:
<EntityList
  kpiStrip={kpiCards}
  // ... existing props
/>
```

- [ ] **Step 2: Repeat for TaskListPage**

```typescript
const { data: kpiCards } = useStatsQuery('tasks')
<EntityList kpiStrip={kpiCards} ... />
```

- [ ] **Step 3: Repeat for RiskListPage (also update risk filters for 1-5 scale)**

```typescript
const { data: kpiCards } = useStatsQuery('risks')
<EntityList kpiStrip={kpiCards} ... />
```

Update filter config to use 1-5 numeric options instead of low/medium/high for probability/impact filters. Use `RISK_SCALE_LABELS` from constants.

- [ ] **Step 4: Repeat for DocumentListPage**

```typescript
const { data: kpiCards } = useStatsQuery('documents')
<EntityList kpiStrip={kpiCards} ... />
```

- [ ] **Step 5: Repeat for UserListPage (admin only)**

```typescript
const { data: kpiCards } = useStatsQuery('users')
<EntityList kpiStrip={kpiCards} ... />
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): wire KPI strip into all list pages via useStatsQuery"
```

---

### Task 4.3: Wire summary KPIs and activity into detail pages

**Files:**
- Modify: ProjectDetailPage, TaskDetailPage

- [ ] **Step 1: Add kpiRow to ProjectDetailPage**

```typescript
import { useSummaryQuery } from '@/hooks/api/useStats'
import { KpiStrip } from '@/components/common/KpiStrip'

const { data: summary } = useSummaryQuery('project', projectId)

<EntityDetail
  kpiRow={summary ? <KpiStrip cards={summary} /> : undefined}
  // ... existing props
/>
```

- [ ] **Step 2: Add activity tab to ProjectDetailPage**

```typescript
import { useActivityQuery } from '@/hooks/api/useActivity'

const { data: activity } = useActivityQuery('project', projectId)

// Add to tabs array:
{ key: 'activity', label: 'Attività', content: <ActivityTimeline items={activity ?? []} /> }
```

Create a simple `ActivityTimeline` component if it doesn't exist (or reuse the existing activity feed pattern from HomePage).

- [ ] **Step 3: Add kpiRow and activity to TaskDetailPage**

```typescript
const { data: summary } = useSummaryQuery('task', taskId)
const { data: activity } = useActivityQuery('task', taskId)

<EntityDetail
  kpiRow={summary ? <KpiStrip cards={summary} /> : undefined}
  // ...
/>
// Add activity tab
```

- [ ] **Step 4: Wire related sidebar into ProjectDetailPage**

```typescript
import { useRelatedQuery } from '@/hooks/api/useRelated'

const { data: related } = useRelatedQuery('project', projectId, ['risks', 'documents', 'team'])

// Use in sidebar slot
<EntityDetail
  sidebar={<RelatedEntitiesSidebar data={related} entityType="project" />}
/>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): wire summary KPIs, activity timeline, and related sidebar into detail pages"
```

---

### Task 4.4: Update risk pages and all risk displays for 1-5 scale UI

**Files:**
- Modify: Risk list page, risk detail page, risk form page
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx` (has `getRiskSeverityLevel(probability: string, impact: string)`)
- Modify: `client/src/components/domain/automation/RecommendationsPanel.tsx` (has `impact: "high"|"medium"|"low"`)
- Modify: `client/src/hooks/api/useDashboard.ts` (AttentionItem type needs `milestone_at_risk`)

- [ ] **Step 1: Update risk form — probability/impact as 1-5 slider or select**

In the risk form, replace the probability/impact dropdowns (which showed low/medium/high) with a number selector (1-5):

```tsx
import { RISK_SCALE_LABELS } from '@/lib/constants'

// Probability field:
<FormField label="Probabilità" error={errors.probability?.message}>
  <Select
    value={String(watch('probability') ?? 3)}
    onValueChange={(v) => setValue('probability', Number(v))}
  >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      {[1, 2, 3, 4, 5].map(n => (
        <SelectItem key={n} value={String(n)}>{n} - {RISK_SCALE_LABELS[n]}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</FormField>

// Same pattern for impact
```

- [ ] **Step 2: Update risk detail — show score and level**

```tsx
import { getRiskLevel, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from '@/lib/constants'

const score = risk.probability * risk.impact
const level = getRiskLevel(score)

<Badge className={RISK_LEVEL_COLORS[level]}>
  {RISK_LEVEL_LABELS[level]} ({score})
</Badge>
```

- [ ] **Step 3: Update risk matrix (if displayed) for 5×5 grid**

The existing matrix component shows a 3×3 grid. Update to 5×5 with color-coded cells based on the score threshold.

- [ ] **Step 4: Update ProjectDetailPage risk display**

In `ProjectDetailPage.tsx`, find `getRiskSeverityLevel(probability: string, impact: string)` (around line 162) and risk probability/impact string rendering (around lines 882-883). Replace with integer-based scoring:

```tsx
import { getRiskLevel, RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, RISK_SCALE_LABELS } from '@/lib/constants'

// Remove getRiskSeverityLevel function entirely, use centralized getRiskLevel
const score = risk.probability * risk.impact
const level = getRiskLevel(score)
```

- [ ] **Step 5: Update RecommendationsPanel for integer impact**

In `client/src/components/domain/automation/RecommendationsPanel.tsx`, find `impact: "high" | "medium" | "low"` (around line 20) and the associated `IMPACT_COLORS`/`IMPACT_LABELS`. Replace with integer-based display using `RISK_SCALE_LABELS[impact]`.

- [ ] **Step 6: Update AttentionItem type for milestone_at_risk**

In `client/src/hooks/api/useDashboard.ts`, find the `AttentionItem` type (around line 21). Add `'milestone_at_risk'` to the type union:

```typescript
// FROM:
type: 'blocked_task' | 'due_soon' | 'critical_risk' | 'pending_review'
// TO:
type: 'blocked_task' | 'due_soon' | 'critical_risk' | 'pending_review' | 'milestone_at_risk'
```

Also update `AttentionSection.tsx` color/icon map to include a new entry for `milestone_at_risk` (use purple/Flag icon).

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ client/src/components/ client/src/hooks/api/useDashboard.ts
git commit -m "feat(ui): update all risk displays for 1-5 integer scale and add milestone_at_risk attention type"
```

---

### Task 4.5: Update frontend useRisks hook types

**Files:**
- Modify: `client/src/hooks/api/useRisks.ts`

- [ ] **Step 1: Update mutation payloads**

Ensure `useCreateRisk` and `useUpdateRisk` send `probability` and `impact` as numbers (not strings). If the hook uses `Record<string, unknown>` for the payload this should work automatically since the form sends numbers.

Verify the `useProjectRiskMatrixQuery` return type matches the new 5×5 format (Record<number, Record<number, Risk[]>>).

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/api/useRisks.ts
git commit -m "fix(hooks): align risk hooks with integer probability/impact types"
```

---

### Task 4.6: Wire remaining detail pages (Documents, Users)

**Files:**
- Modify: DocumentDetailPage (or DocumentDrawer)
- Modify: UserDetailPage (or UserDrawer)

- [ ] **Step 1: Wire document version history**

In the document detail page/drawer, add version history tab using:

```typescript
import { useRelatedQuery } from '@/hooks/api/useRelated'

const { data: related } = useRelatedQuery('document', documentId, ['versions'])

// Display versions in a timeline or table showing: version number, uploaded by, date, file size, download link
```

- [ ] **Step 2: Wire user related projects and activity**

In the user detail page/drawer, add:

```typescript
import { useRelatedQuery } from '@/hooks/api/useRelated'
import { useActivityQuery } from '@/hooks/api/useActivity'

const { data: related } = useRelatedQuery('user', userId, ['projects'])
const { data: activity } = useActivityQuery('user', userId)

// Display related projects list and activity timeline
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): wire document version history and user related entities into detail pages"
```

---

## Chunk 5: Final Integration + Verification

### Task 5.1: Dashboard delegation to statsService

**Files:**
- Modify: `server/src/services/dashboardService.ts`

- [ ] **Step 1: Refactor getStats() to delegate to statsService**

In `dashboardService.getStats()`, replace duplicated count queries with delegation:

```typescript
import * as statsService from './statsService.js'

// In getStats(), replace the individual count queries with:
const [projectKpis, taskKpis, riskKpis] = await Promise.all([
  statsService.getProjectStats(userId, role),
  statsService.getTaskStats(userId, role),
  statsService.getRiskStats(userId, role),
])

// Extract the values you need from the KPI cards
const activeProjects = (projectKpis.find(k => k.label === 'Attivi')?.value ?? 0) as number
// ... etc.
```

**Note**: This refactor is optional — if the dashboard stats format is significantly different from the KPI card format, it may be cleaner to keep the dashboard stats calculation separate and just share the risk threshold constants. Use judgment.

- [ ] **Step 2: Refactor getRecentActivity() to delegate to activityService**

```typescript
import * as activityService from './activityService.js'

// In getRecentActivity():
async function getRecentActivity(userId: string, role: string, limit = 10) {
  return activityService.getFeed(userId, role, limit)
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/dashboardService.ts
git commit -m "refactor(dashboard): delegate stats and activity to centralized services"
```

---

### Task 5.2: TypeScript compilation check

- [ ] **Step 1: Run TypeScript compiler on server**

Run: `cd /c/Users/Nicola_MussolinAdmin/Documents/Mikai/ProjectPulse/server && npx tsc --noEmit`

Fix any type errors. Common issues:
- Missing imports
- Prisma client not regenerated (run `npx prisma generate` first)
- Type mismatches from String→Int migration

- [ ] **Step 2: Run TypeScript compiler on client**

Run: `cd /c/Users/Nicola_MussolinAdmin/Documents/Mikai/ProjectPulse/client && npx tsc --noEmit`

Fix any type errors.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript compilation errors from gap analysis implementation"
```

---

### Task 5.3: Final commit and summary

- [ ] **Step 1: Run git status and verify all changes**

Run: `git status`

Ensure no untracked files are forgotten.

- [ ] **Step 2: Create summary commit if needed**

If there are minor fixes or cleanup:

```bash
git add -A
git commit -m "chore: gap analysis implementation cleanup"
```

---

## Post-Implementation Notes

### Pending on backend server (192.168.52.22)

These must be run on the backend server, NOT on the dev machine:

1. `npx prisma migrate dev` — applies the schema migration
2. `npx prisma db seed` — if seed needs updating
3. Verify risk data migration converted correctly (spot-check a few risks)

### Testing checklist

**Stats endpoints:**
- [ ] `GET /api/stats/projects` returns KPI cards
- [ ] `GET /api/stats/tasks` returns task KPI cards
- [ ] `GET /api/stats/risks` returns risk KPI cards
- [ ] `GET /api/stats/documents` returns document KPI cards
- [ ] `GET /api/stats/users` returns user KPI cards
- [ ] `GET /api/stats/project/:id/summary` returns project summary with budget
- [ ] `GET /api/stats/task/:id/summary` returns task summary with subtask counts

**Activity endpoints:**
- [ ] `GET /api/activity/project/:id` returns timeline items
- [ ] `GET /api/activity/task/:id` returns task timeline
- [ ] `GET /api/activity/user/:id` returns user activity

**Related endpoints:**
- [ ] `GET /api/related/project/:id?include=risks,documents,team` returns related entities
- [ ] `GET /api/related/risk/:id?include=tasks` returns linked tasks
- [ ] `GET /api/related/user/:id?include=projects` returns user's projects
- [ ] `GET /api/related/document/:id?include=versions` returns version history

**Dashboard enhancements:**
- [ ] `GET /api/dashboard/attention` includes `milestone_at_risk` type
- [ ] `GET /api/dashboard/my-tasks-today?days=7` returns upcoming tasks
- [ ] `GET /api/dashboard/stats` includes real `budgetUsedPercent`

**Risk scale migration:**
- [ ] Risk create/update accepts integer 1-5 for probability/impact
- [ ] Risk list shows score badge with correct level colors (critical ≥15, high ≥10, medium ≥5, low <5)
- [ ] Risk matrix displays as 5×5 grid
- [ ] ProjectDetailPage risk display uses integer scoring

**Enrichment:**
- [ ] Project list shows progress %, team count, member avatars
- [ ] Task list shows subtask count, hours logged
- [ ] Kanban cards show subtask progress

**Document versioning:**
- [ ] Document upload creates version history entry
- [ ] `GET /api/documents/:id/versions/:vid/download` downloads specific version
