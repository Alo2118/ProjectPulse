# ProjectPulse — Documento di Stato

> Ultimo aggiornamento: 2026-03-16
> Branch attivo: `feature/ux-redesign-jarvis`

---

## Stato Generale

| Area | Stato | Note |
|------|-------|------|
| **Backend Core** | Stabile | Controller→Service→Prisma, 200+ endpoint |
| **Frontend Core** | Stabile | 3 template, 24 shadcn/ui, 30 TanStack hooks |
| **Multi-Theme** | Completo | 3 temi × 2 mode, token CSS, useThemeConfig |
| **Phase System** | Completo | WorkflowTemplate domain, stepper, wizard |
| **UX Clarity** | Completo | Dashboard, liste rich, sidebar connesse |
| **Mockup Gap Analysis** | Completo | 4 servizi centrali, risk 1-5, DocumentVersion, RiskTask, 33 hooks |

---

## Architettura Backend

### Stack
- Node.js, Express, Prisma 7, SQL Server Express
- Zod validation, JWT auth, Socket.io, Winston logging
- Prisma adapter pattern (no `url` in schema.prisma)

### Pattern
```
Controller → Service → Prisma
(Zod validation)  (business logic)  (data access)
```

### Response Format (SEMPRE)
```typescript
sendSuccess(res, data)        // { success: true, data }
sendCreated(res, data)        // { success: true, data } (201)
sendPaginated(res, result)    // { success: true, data, pagination }
sendError(res, message, code) // { success: false, message }
```

### Utilities Centralizzate
| File | Scopo |
|------|-------|
| `utils/responseHelpers.ts` | 4 helper per risposte standard |
| `utils/controllerHelpers.ts` | requireUserId, requireResource |
| `utils/codeGenerator.ts` | Generazione codici entità (PRJ-, DOC-, etc.) |
| `utils/paginate.ts` | Paginazione standard |
| `utils/selectFields.ts` | Select fields Prisma per 12 entità |
| `middleware/errorMiddleware.ts` | AppError + gestione Prisma/Zod errors |

### Infrastruttura
- **Frontend dev**: `192.168.52.58:5173` (Vite)
- **Backend server**: `192.168.52.22:3000` (Express)
- Vite proxy: `/api` e `/socket.io` → backend

---

## Architettura Frontend

### Stack
- React 18, TypeScript strict, Vite
- TanStack Query 5 (30 hooks), Zustand (6 store UI-only)
- shadcn/ui (24 Radix), Tailwind CSS, Framer Motion
- React Hook Form + Zod resolver

### Template Components (`components/common/`)
| Template | Scopo | Feature chiave |
|----------|-------|---------------|
| **EntityList** | Liste | KPI strip, groupBy, grid/list, bulk, drag-drop, role switcher |
| **EntityDetail** | Dettagli | beforeContent slot, colorBar, kpiRow, tabs, sidebar |
| **EntityForm** | Form | Create/edit, permissions, delete dialog |
| **DataTable** | Tabelle | Sort, select, drag-drop, stagger animation, theme hover |

### Design System
- **Temi**: office-classic, asana-like, tech-hud (× light/dark)
- **Token**: CSS variables HSL in `globals.css`
- **Colori**: Context Color System in `lib/constants.ts`
- **Icone**: via `useThemeConfig()` (stesse Lucide base, effetti per tema)
- **Emoji**: via `useThemeConfig()` (diverse per tono tema)

### Route (~28)
- HomePage (role-based, sostituisce MyDay + Dashboard)
- AdminConfigPage con 6 tab
- NotificationPanel slide-over
- TaskListPage con 5 view mode (list, table, board, gantt, calendar)

---

## Modelli DB Principali

### Esistenti (nel DB)

| Modello | Soft Delete | Codice | Note |
|---------|:-----------:|--------|------|
| Project | Si | PRJ-YYYY-NNN | status, currentPhaseKey, phases JSON |
| Task | Si | CODE-T/M/SNNN | taskType: milestone/task/subtask, phaseKey |
| Risk | Si | CODE-RNNN | **ATTUALE**: probability/impact come stringhe ('low'/'medium'/'high'), score calcolato in-memory |
| Document | Si | DOC-YYYY-NNN | version int, status workflow |
| User | Si | — | role, lastLoginAt |
| TimeEntry | No | — | minutes, userId, taskId |
| ProjectMember | No | — | userId, projectId, role |
| WorkflowTemplate | No | — | domain: 'task' \| 'project' |
| AuditLog | No | — | action, entityType, entityId, userId |
| AutomationRule | Si | — | trigger, conditions, actions |

### Pianificati (da migrazione gap analysis)

| Modello/Campo | Tipo | Note |
|---------------|------|------|
| `DocumentVersion` | Nuovo modello | Storico revisioni per documento |
| `RiskTask` | Nuovo modello | Tabella ponte risk↔task con linkType |
| `User.hourlyRate` | Nuovo campo `Decimal?` | Tariffa oraria in € |
| `Project.budget` | Nuovo campo `Decimal?` | Budget monetario in € |
| `Risk.probability` | **BREAKING** String→Int | Da 'low'/'medium'/'high' a 1-5 |
| `Risk.impact` | **BREAKING** String→Int | Da 'low'/'medium'/'high' a 1-5 |

### Bug noto: `sendError` response format

`responseHelpers.sendError()` invia `{ success: false, error: message }` ma il middleware di errore invia `{ success: false, message: ... }`. Da allineare durante l'implementazione.

---

## Servizi Centralizzati (da implementare)

> Spec: `docs/superpowers/specs/2026-03-12-mockup-gap-analysis-design.md`

| Servizio | Scopo | Endpoint |
|----------|-------|----------|
| **statsService** | KPI strip e summary per tutte le entità | `GET /api/stats/:domain`, `GET /api/stats/:domain/:id/summary` |
| **activityService** | Timeline unificata da AuditLog | `GET /api/activity/:entityType/:entityId` |
| **enrichmentService** | Arricchimento liste in batch (no N+1) | Interno, nessun endpoint |
| **relatedEntitiesService** | Entità correlate per sidebar/drawer | `GET /api/related/:entityType/:entityId?include=...` |

### Mappa Servizio → Pagine

| Servizio | Dashboard | Liste | Dettagli | Drawer | Report |
|----------|:---------:|:-----:|:--------:|:------:|:------:|
| statsService | KPI | KPI strip | Summary KPI | — | KPI |
| activityService | Feed | — | Tab timeline | Activity | — |
| enrichmentService | — | Progress, team, subtasks | — | — | — |
| relatedEntitiesService | — | — | Sidebar | Relazioni | — |

---

## Backend Server (192.168.52.22) — Stato Deploy

> Server backend gestito via WinRM da macchina dev. Processo avviato con scheduled task `ProjectPulseServer`.

### Migrazioni Applicate (2026-03-16)
- [x] Prisma migrations (4): baseline, permission_policies, phase_system, gap_analysis_schema
- [x] Manual SQL: `add-ux-overhaul-fields.sql` (TagAssignment.createdById, UserInputReply, User.notificationPreferences)
- [x] Risk scale: probability/impact String→Int (1-5), score 1-25, critico ≥ 15
- [x] DocumentVersion, RiskTask tables
- [x] User.hourlyRate (Decimal 8,2)
- [x] Codice server aggiornato + Prisma client rigenerato + TypeScript compilato
- [x] Server avviato e raggiungibile su porta 3000

### Seed Completati (2026-03-16)
- [x] Template fasi progetto: "Biomedico IEC 62304" (5 fasi), "Generico" (3 fasi) — gia presenti
- [x] Migrazione dati: 6 progetti migrati a phase system (status→condition + currentPhaseKey + phases JSON)

---

## Piano Implementazione (ordine)

1. Schema changes (migrazione unica)
2. 4 servizi centrali + controller + routes
3. Dashboard enrichments
4. Lista Progetti
5. Dettaglio Progetto
6. Lista Task / Kanban
7. Dettaglio Task
8. Documenti
9. Rischi
10. Utenti
11. Report Weekly

---

## Storico Lavori Completati

| Data | Lavoro | Branch | Spec |
|------|--------|--------|------|
| 2026-03-10 | Multi-Theme System (3×2) | feature/ux-redesign-jarvis | immersive-context-ux |
| 2026-03-10 | UX Clarity Redesign | feature/ux-redesign-jarvis | ux-clarity-redesign |
| 2026-03-10 | Navigazione Guidata + Stepper | feature/ux-redesign-jarvis | — |
| 2026-03-10 | Project Phases from Milestones | feature/ux-redesign-jarvis | project-phases-from-milestones |
| 2026-03-11 | Mockup Replication (5 chunk) | feature/ux-redesign-jarvis | mockup-replication |
| 2026-03-12 | Mockup Gap Analysis (design) | feature/ux-redesign-jarvis | mockup-gap-analysis |

---

## Convenzioni per Modifiche Future

### Aggiungere una nuova pagina
1. Usa EntityList, EntityDetail, o EntityForm
2. Aggiungi hook in `hooks/api/`
3. Se serve KPI strip → usa `useStatsQuery(domain)`
4. Se serve timeline → usa `useActivityQuery(entityType, id)`
5. Se serve sidebar relazioni → usa `useRelatedQuery(entityType, id, include)`

### Aggiungere un nuovo endpoint
1. Schema Zod in `schemas/`
2. Service in `services/`
3. Controller in `controllers/` (usa responseHelpers)
4. Route in `routes/`
5. Registra in `routes/index.ts`

### Aggiungere un nuovo modello
1. Schema Prisma in `schema.prisma`
2. Select fields in `utils/selectFields.ts`
3. Zod schema in `schemas/`
4. Service + Controller + Route
5. Aggiorna `enrichmentService` se serve arricchimento liste
6. Aggiorna `relatedEntitiesService` se serve nelle sidebar
7. Aggiorna `statsService` se serve KPI

### Modificare il Design System
1. Token CSS in `styles/globals.css` (tutti e 6 i blocchi tema×mode)
2. Costanti colore in `lib/constants.ts`
3. Icone/emoji in `lib/theme-config.ts`
4. Mai hex hardcoded — sempre token semantici
