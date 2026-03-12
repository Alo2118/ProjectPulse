# Mockup Gap Analysis — Design Spec

**Data**: 2026-03-12
**Branch**: `feature/ux-redesign-jarvis`
**Obiettivo**: Colmare i gap tra i mockup HTML e il backend attuale, con architettura centralizzata e riutilizzabile.

---

## Decisioni di Design

| Decisione | Scelta | Alternativa scartata |
|-----------|--------|---------------------|
| Scala rischi | 1-5 (max score 25) | 1-3 (attuale, max 9) |
| Budget | Ore + Monetario (€) | Solo ore |
| Document versioning | Tabella `DocumentVersion` dedicata | Derivato da audit log |
| Risk-Task linking | Tabella ponte `RiskTask` con linkType | FK semplice su Task |
| Costo orario | `hourlyRate` su User | Per ruolo o per project-member |
| Approccio implementativo | Pagina per pagina, full-stack | Backend-first o parallel |

---

## 1. Schema Changes (migrazione unica)

### 1.1 Nuovo modello: `DocumentVersion`

```prisma
model DocumentVersion {
  id           String   @id @default(uuid())
  documentId   String
  version      Int
  filePath     String
  fileSize     Int
  mimeType     String
  note         String?
  uploadedById String
  createdAt    DateTime @default(now())

  document     Document @relation(fields: [documentId], references: [id])
  uploadedBy   User     @relation("DocumentVersionUploader", fields: [uploadedById], references: [id])

  @@index([documentId])
  @@map("document_versions")
}
```

**Impatto**: Ogni upload crea un `DocumentVersion`. Il `Document.version` rimane come "current version number". Lo storico è in `DocumentVersion`.

### 1.2 Nuovo modello: `RiskTask`

```prisma
model RiskTask {
  id          String   @id @default(uuid())
  riskId      String
  taskId      String
  linkType    String   // "mitigation" | "verification" | "related"
  createdAt   DateTime @default(now())
  createdById String

  risk        Risk     @relation(fields: [riskId], references: [id])
  task        Task     @relation(fields: [taskId], references: [id])
  createdBy   User     @relation("RiskTaskCreator", fields: [createdById], references: [id])

  @@unique([riskId, taskId])
  @@index([riskId])
  @@index([taskId])
  @@map("risk_tasks")
}
```

**linkType values**: `mitigation` (azione di mitigazione), `verification` (verifica/test), `related` (collegamento generico).

### 1.3 Campi aggiunti

| Modello | Campo | Tipo | Note |
|---------|-------|------|------|
| `User` | `hourlyRate` | `Decimal?` | Tariffa oraria in €, nullable |
| `Project` | `budget` | `Decimal?` | Budget monetario in €, nullable |
| `Risk` | `probability` | `Int` | **BREAKING**: cambia da String (`'low'|'medium'|'high'`) a Int (1-5). Richiede migrazione dati |
| `Risk` | `impact` | `Int` | **BREAKING**: cambia da String (`'low'|'medium'|'high'`) a Int (1-5). Richiede migrazione dati |

### 1.4 Risk Scale Migration (CRITICA)

La scala rischi attuale usa **stringhe** (`'low'`, `'medium'`, `'high'`) mappate a numeri nel codice. La nuova scala usa **interi 1-5** direttamente nel DB.

**Migrazione dati**:
```sql
-- Step 1: Aggiungere colonne temporanee Int
ALTER TABLE risks ADD probability_new INT;
ALTER TABLE risks ADD impact_new INT;

-- Step 2: Convertire valori esistenti
UPDATE risks SET probability_new = CASE probability
  WHEN 'low' THEN 1 WHEN 'medium' THEN 3 WHEN 'high' THEN 5 END;
UPDATE risks SET impact_new = CASE impact
  WHEN 'low' THEN 1 WHEN 'medium' THEN 3 WHEN 'high' THEN 5 END;

-- Step 3: Drop colonne vecchie, rinomina nuove
ALTER TABLE risks DROP COLUMN probability;
ALTER TABLE risks DROP COLUMN impact;
EXEC sp_rename 'risks.probability_new', 'probability', 'COLUMN';
EXEC sp_rename 'risks.impact_new', 'impact', 'COLUMN';
```

**File da aggiornare** (tutti leggono probability/impact come stringhe):
1. `constants/enums.ts` — rimuovere `RISK_PROBABILITIES`/`RISK_IMPACTS` string arrays, aggiungere `RISK_SCALE_MIN=1`, `RISK_SCALE_MAX=5`, Zod `z.number().int().min(1).max(5)`
2. `schemas/riskSchemas.ts` — aggiornare validazione da `z.enum()` a `z.number().int().min(1).max(5)`
3. `services/riskService.ts` — rimuovere `calculateRiskLevel()` string→number mapping, calcolare `score = probability * impact` direttamente
4. `services/dashboardService.ts` — rimuovere `RISK_VALUE_MAP`, `isRiskCritical()` ora controlla `score >= 15`
5. `services/analyticsService.ts` — aggiornare filtri `impact === 'high'` a `impact >= 4`
6. `types/index.ts` — rimuovere `RiskProbability = 'low' | 'medium' | 'high'`, usare `number`
7. Frontend `lib/constants.ts` — aggiornare label/colori per scala 1-5

### 1.5 Threshold rischi aggiornati

| Livello | Score range (1-5 × 1-5) | Colore |
|---------|--------------------------|--------|
| Critico | ≥ 15 | Rosso |
| Alto | 10-14 | Arancione |
| Medio | 5-9 | Giallo |
| Basso | 1-4 | Verde |

---

## 2. Architettura Servizi Centralizzati

### Principio: 4 servizi trasversali, non endpoint per-pagina

Tutti i gap mockup sono coperti da 4 servizi riutilizzabili che servono tutte le pagine. Zero duplicazione.

### 2.1 `statsService.ts` — KPI Strip e Summary

**Scopo**: Unica source of truth per tutte le metriche aggregate.

```typescript
interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: string  // context gradient key
  icon?: string  // lucide icon name
}

// Metodi
getProjectStats(userId?, role?)     → KpiCard[]
getDocumentStats(userId?, role?)    → KpiCard[]
getRiskStats(userId?, role?)        → KpiCard[]
getUserStats()                      → KpiCard[]
getTaskStats(userId?, role?)        → KpiCard[]
getProjectSummary(projectId)        → KpiCard[]
getTaskSummary(taskId)              → TaskSummary
```

**Endpoint**:
- `GET /api/stats/project/:id/summary` — KPI dettaglio progetto
- `GET /api/stats/task/:id/summary` — Summary dettaglio task
- `GET /api/stats/:domain` — KPI per lista (domain: projects, documents, risks, users, tasks)

> **NOTA Route Ordering**: In Express, le route specifiche (`/project/:id/summary`, `/task/:id/summary`) DEVONO essere registrate PRIMA della route parametrica `/:domain`, altrimenti `:domain` cattura "project" e "task" come domain names.

**Calcoli specifici**:

**Project Summary**:
- `progress%` = task completati / task totali × 100
- `milestoneCount` = count milestone del progetto
- `taskCount` = count task (escluse milestone)
- `hoursLogged` = sum time entries del progetto
- `hoursEstimated` = sum estimatedHours dei task
- `budgetUsedHours%` = hoursLogged / hoursEstimated × 100
- `budgetUsedMoney%` = sum(timeEntry.minutes × user.hourlyRate / 60) / project.budget × 100

**Task Summary**:
- `completion%` = subtask done / subtask totali × 100 (se ha subtask), altrimenti 0 o 100
- `subtasksDone` / `subtasksTotal` = count subtask per status
- `hoursLogged` = sum time entries del task (in ore decimali)
- `hoursEstimated` = task.estimatedHours
- `hoursRemaining` = max(0, estimated - logged)

**Dashboard refactor**: `dashboardService.getStats()` delega a `statsService.getProjectStats()` + `statsService.getTaskStats()` + `statsService.getRiskStats()`. Elimina duplicazione.

> **Fix pre-requisito `sendError`**: L'attuale `responseHelpers.sendError()` invia `{ success: false, error: message }` (chiave `error`), ma il middleware di errore invia `{ success: false, message: ... }` (chiave `message`). Prima di implementare i nuovi servizi, allineare `sendError` per usare `message` come il middleware. I nuovi servizi devono lanciare `AppError` (gestita dal middleware) e non chiamare `sendError` direttamente.

### 2.2 `activityService.ts` — Timeline Unificata

**Scopo**: Unica fonte per activity feed e timeline, basata su AuditLog esistente.

```typescript
interface ActivityItem {
  id: string
  action: string           // 'created' | 'updated' | 'deleted' | 'status_changed' | ...
  entityType: string       // 'task' | 'project' | 'risk' | 'document'
  entityId: string
  entityName: string
  field?: string           // campo modificato (es. 'status', 'assigneeId')
  oldValue?: string
  newValue?: string
  user: { id: string; firstName: string; lastName: string }
  createdAt: string
}

// Metodi
getEntityActivity(entityType, entityId, limit?)  → ActivityItem[]
getUserActivity(userId, limit?)                   → ActivityItem[]
getFeed(userId, role, limit?)                     → ActivityItem[]
```

**Endpoint**: `GET /api/activity/:entityType/:entityId?limit=20`

**Accesso**:
- Autenticati: vedono activity delle entità a cui hanno accesso
- Admin/direzione: vedono tutto
- Dipendente: solo entità assegnate o dei propri progetti

**Migrazione dashboard**: `dashboardService.getRecentActivity()` delega a `activityService.getFeed()`.

> **Type alignment**: L'attuale `dashboardService` ha un tipo `ActivityItem` più semplice (senza `field`, `oldValue`, `newValue`). Il nuovo `activityService.ActivityItem` è un superset. La migrazione deve:
> 1. Esportare `ActivityItem` da `activityService` come tipo canonico
> 2. Aggiornare `dashboardService` per importare e usare lo stesso tipo
> 3. Aggiornare il frontend hook `useRecentActivity` per gestire i campi opzionali aggiuntivi (sono opzionali, quindi backward-compatible)

### 2.3 `enrichmentService.ts` — Arricchimento Liste (interno)

**Scopo**: Aggiunge campi calcolati alle liste in batch, eliminando N+1 queries. Non ha endpoint proprio — è usato internamente dai service esistenti.

```typescript
// Metodi
enrichProjects(projects[])      → projects[] con:
  - progress: number            // % task completati
  - teamCount: number           // membri del progetto
  - milestoneCount: number
  - openTaskCount: number
  - budgetUsedPercent: number | null
  - memberAvatars: { id, firstName, lastName, avatarUrl }[]  // primi 5

enrichTasks(tasks[])            → tasks[] con:
  - subtasksDone: number
  - subtasksTotal: number
  - hoursLogged: number         // ore decimali
  - hoursEstimated: number
  - completion: number          // %

enrichKanbanCards(tasks[])      → tasks[] con:
  - subtasksDone: number
  - subtasksTotal: number
  // Versione leggera per performance kanban
```

**Pattern implementativo**:
```typescript
// Esempio: enrichProjects
async enrichProjects(projects: Project[]) {
  const ids = projects.map(p => p.id)

  // Query separate per task e milestone (SQL Server adapter non supporta _count con where nidificato in groupBy)
  const taskCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: { not: 'milestone' } },
    _count: true
  })

  const milestoneCounts = await prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: ids }, isDeleted: false, taskType: 'milestone' },
    _count: true
  })

  // Una query per team counts (ProjectMember.groupBy)
  // Una query per ore loggate (TimeEntry → task.projectId, aggregazione)
  // Mappa risultati su projects
}
```

> **Nota SQL Server**: Prisma 7 con adapter SQL Server non supporta `_count: { where: {...} }` nidificato dentro `groupBy`. Usare sempre query `groupBy` separate con filtro `where` a livello top per distinguere milestone da task.
```

**Dove si integra**:
- `projectService.getAll()` → chiama `enrichmentService.enrichProjects(results)`
- `taskService.getTasks()` → chiama `enrichmentService.enrichTasks(results)`
- `taskService.getKanban()` → chiama `enrichmentService.enrichKanbanCards(results)`

### 2.4 `relatedEntitiesService.ts` — Relazioni Polimorfiche

**Scopo**: Recupera entità correlate per sidebar, drawer, detail page.

```typescript
interface RelatedConfig {
  entityType: string
  entityId: string
  include: string[]  // ['tasks', 'risks', 'documents', 'team', 'projects']
  limit?: number     // default 10 per relazione
}

// Metodo principale
getRelated(config: RelatedConfig) → Record<string, any[]>
```

**Mappatura relazioni**:

| entityType | include | Source |
|------------|---------|--------|
| `project` | `risks` | Risk where projectId |
| `project` | `documents` | Document where projectId |
| `project` | `team` | ProjectMember where projectId → User |
| `project` | `milestones` | Task where projectId, taskType='milestone' |
| `risk` | `tasks` | RiskTask where riskId → Task |
| `task` | `risks` | RiskTask where taskId → Risk |
| `user` | `projects` | ProjectMember where userId → Project |
| `document` | `versions` | DocumentVersion where documentId |

**Endpoint**: `GET /api/related/:entityType/:entityId?include=tasks,risks,documents`

---

## 3. Dashboard Enrichments

### 3.1 Nuovo attention type: `milestone_at_risk`

Aggiungere al `dashboardService.getAttention()`:

```typescript
// Milestone con dueDate entro 7 giorni E status != 'done' E ha task bloccati o in ritardo
{
  type: 'milestone_at_risk',
  entityId: milestone.id,
  title: milestone.title,
  projectName: project.name,
  projectId: project.id,
  dueDate: milestone.dueDate,
  extra: '2 task bloccati'  // conteggio task problematici
}
```

### 3.2 Upcoming deadlines (estensione my-tasks-today)

Rinominare concettualmente `my-tasks-today` → `my-upcoming-tasks` con query param `days`:

`GET /api/dashboard/my-tasks-today?days=7` — task dei prossimi N giorni (default 1 = solo oggi).

Il frontend HomePage usa `days=1`, il calendario sidebar usa `days=7` o `days=14`.

### 3.3 budgetUsedPercent implementato

Il `dashboardService.getStats()` ora calcola `budgetUsedPercent` reale:
```
sum(progetti attivi: sum(timeEntries.minutes × user.hourlyRate / 60)) / sum(progetti attivi: budget) × 100
```
Se nessun progetto ha `budget`, ritorna `null`.

---

## 4. Document Version History

### Flow di upload

1. `POST /api/documents/:id/upload` (già esiste)
2. **Nuovo**: prima di sovrascrivere, crea `DocumentVersion` con i dati correnti
3. Aggiorna `Document` con nuovo file + incrementa `version`

### Endpoint storico

`GET /api/related/document/:id?include=versions` (usa relatedEntitiesService)

Ritorna:
```json
{
  "versions": [
    { "id": "...", "version": 3, "filePath": "...", "fileSize": 2400000,
      "mimeType": "application/pdf", "note": "Aggiornamento sezione 4.2",
      "uploadedBy": { "id": "...", "firstName": "M.", "lastName": "Ferrari" },
      "createdAt": "2026-03-11T10:30:00Z", "isCurrent": true },
    { "version": 2, ... },
    { "version": 1, ... }
  ]
}
```

### Download versione specifica

`GET /api/documents/:id/versions/:versionId/download` — nuovo endpoint nel documentController.

---

## 5. Risk Scale Update

> **BREAKING CHANGE**: Vedi sezione 1.4 per migrazione dati completa (String→Int).

### Riepilogo

- **Prima**: `probability`/`impact` = `'low'|'medium'|'high'` (stringhe), score calcolato in-memory via `calculateRiskLevel()`
- **Dopo**: `probability`/`impact` = `1-5` (interi), `score = probability × impact` (1-25)

### Validazione Zod

```typescript
// constants/enums.ts — nuove costanti
export const RISK_SCALE_MIN = 1
export const RISK_SCALE_MAX = 5
export const riskScaleSchema = z.number().int().min(RISK_SCALE_MIN).max(RISK_SCALE_MAX)

// schemas/riskSchemas.ts — sostituisce z.enum(['low','medium','high'])
probability: riskScaleSchema
impact: riskScaleSchema
```

### Soglie critiche

| Livello | Range | Frontend class |
|---------|-------|---------------|
| critical | ≥ 15 | `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400` |
| high | 10-14 | `bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400` |
| medium | 5-9 | `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400` |
| low | 1-4 | `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400` |

### Dashboard attention threshold

`critical_risk` attention type: score ≥ 15 (era > 6).

---

## 6. Budget Calculation

### Modello

- `User.hourlyRate: Decimal?` — tariffa oraria in €
- `Project.budget: Decimal?` — budget totale in €

### Calcolo budget usato (in statsService)

```typescript
// Per un singolo progetto
budgetUsedMoney = sum(
  timeEntries.map(te => (te.minutes / 60) * te.user.hourlyRate)
)
budgetUsedPercent = project.budget ? (budgetUsedMoney / project.budget * 100) : null

// Budget ore
budgetUsedHours = sum(timeEntries.minutes) / 60
budgetHoursPercent = sum(tasks.estimatedHours) > 0
  ? (budgetUsedHours / sum(tasks.estimatedHours) * 100)
  : null
```

### Endpoint

Incluso in `GET /api/stats/project/:id/summary` come parte dei KPI.

---

## 7. Mappa Endpoint → Pagine

### Nuovi endpoint

| Endpoint | Metodo | Servizio | Pagine servite |
|----------|--------|----------|----------------|
| `GET /api/stats/:domain` | GET | statsService | Tutte le liste |
| `GET /api/stats/project/:id/summary` | GET | statsService | Dettaglio progetto |
| `GET /api/stats/task/:id/summary` | GET | statsService | Dettaglio task |
| `GET /api/activity/:entityType/:entityId` | GET | activityService | Det. task, Det. progetto, Drawer utente |
| `GET /api/related/:entityType/:entityId` | GET | relatedEntitiesService | Det. progetto, Drawer rischio, Drawer utente, Det. documento |
| `GET /api/documents/:id/versions/:vid/download` | GET | documentController | Drawer documento |

### Endpoint modificati

| Endpoint | Modifica | Servizio |
|----------|----------|----------|
| `GET /api/projects` | Arricchito con progress, teamCount, avatars | enrichmentService |
| `GET /api/tasks` | Arricchito con subtasks count, hours | enrichmentService |
| `GET /api/tasks/kanban/:projectId` | Arricchito con subtask progress | enrichmentService |
| `GET /api/dashboard/stats` | budgetUsedPercent reale, delega a statsService | statsService |
| `GET /api/dashboard/attention` | + milestone_at_risk type | dashboardService |
| `GET /api/dashboard/my-tasks-today` | + param `days` per range | dashboardService |
| `POST /api/documents/:id/upload` | Crea DocumentVersion prima di sovrascrivere | documentService |

### Frontend hooks nuovi

| Hook | Endpoint | Usato in |
|------|----------|----------|
| `useStatsQuery(domain)` | `/api/stats/:domain` | Tutte le EntityList |
| `useSummaryQuery(domain, id)` | `/api/stats/:domain/:id/summary` | EntityDetail |
| `useActivityQuery(entityType, entityId)` | `/api/activity/:entityType/:entityId` | Tab timeline |
| `useRelatedQuery(entityType, entityId, include)` | `/api/related/:entityType/:entityId` | Sidebar, drawer |

---

## 8. Ordine di Implementazione (pagina per pagina)

1. **Schema changes** — migrazione unica per DocumentVersion, RiskTask, hourlyRate, budget
2. **4 servizi centrali** — statsService, activityService, enrichmentService, relatedEntitiesService + controller/routes
3. **Dashboard** — refactor stats, attention milestone_at_risk, upcoming days param
4. **Lista Progetti** — enrichment (progress, team), stats KPI
5. **Dettaglio Progetto** — summary KPI, related sidebar
6. **Lista Task / Kanban** — enrichment (subtasks, hours), stats KPI
7. **Dettaglio Task** — summary, activity timeline
8. **Documenti** — stats KPI, version history, related versions
9. **Rischi** — stats KPI, scala 1-5, related tasks, threshold update
10. **Utenti** — stats KPI, related projects, activity
11. **Report Weekly** — delega a statsService per KPI aggregati
