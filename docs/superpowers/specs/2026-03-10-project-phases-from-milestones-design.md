# Design: Fasi Progetto derivate da Milestone

**Data**: 2026-03-10
**Branch**: `feature/ux-redesign-jarvis`
**Stato**: Approvato

---

## Problema

Oggi `Project.status` è un campo diretto con 9 valori che mescolano fasi operative (planning, design, verification...) e condizioni trasversali (on_hold, cancelled). Le milestone sono task indipendenti senza legame con le fasi. Il WorkflowStepper mostra 5 fasi hardcoded nel frontend (`projectWorkflow.ts`) senza connessione reale con il lavoro strutturato nelle milestone.

## Obiettivo

- Le **fasi del progetto** sono definite da template configurabili (gestiti da admin)
- Ogni **milestone** è assegnata a una fase (`phaseKey`)
- Più milestone possono appartenere alla stessa fase
- L'avanzamento di fase è **semi-automatico**: il sistema suggerisce, l'utente conferma
- Gli **stati trasversali** (on_hold, cancelled) restano separati dalle fasi
- Le fasi di un progetto sono **personalizzabili** (copia locale dal template)

## Decisioni di design

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Dove vivono i template di fasi | Estensione di `WorkflowTemplate` con `domain` discriminator | Riuso infrastruttura esistente (CRUD, UI admin, assignment) |
| Come si collegano milestone e fasi | `Task.phaseKey` (stringa) | Semplice, no FK complesse, referenzia `Project.phases[].key` |
| Fasi personalizzabili per progetto | `Project.phases` JSON (copia locale) | Requisito utente: modifica solo questo progetto o salva come template |
| Avanzamento fase | Semi-automatico con conferma | Contesto regolamentato: serve atto deliberato |
| Stati trasversali | `Project.status` ridotto a 4 valori (active/on_hold/cancelled/completed) | Separazione netta tra "dove siamo" (fase) e "come stiamo" (condizione) |
| Comportamento on_hold | Soft block con banner, tutto modificabile | Pragmatico: permette di chiudere attività in corso |

---

## Schema DB

### WorkflowTemplate — campo `domain` aggiunto

```prisma
model WorkflowTemplate {
  // ... campi esistenti invariati ...
  domain      String   @default("task") @map("domain")  // "task" | "project"
  // Quando domain="task": statuses = stati task, transitions = transizioni task
  // Quando domain="project": statuses = fasi progetto, transitions = transizioni fase
}
```

### Project — nuovi campi

```prisma
model Project {
  // ... campi esistenti ...
  workflowTemplateId  String?  @map("workflow_template_id")  // template stati TASK (invariato)
  phaseTemplateId     String?  @map("phase_template_id")     // NUOVO: template fasi progetto
  phases              String?  @db.NVarChar(Max) @map("phases")  // NUOVO: copia locale fasi (JSON)
  currentPhaseKey     String?  @map("current_phase_key")     // NUOVO: fase corrente

  // status cambia semantica: da 9 valori a 4
  // "active" | "on_hold" | "cancelled" | "completed"

  phaseTemplate  WorkflowTemplate?  @relation("ProjectPhaseTemplate", fields: [phaseTemplateId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

### Task — campo `phaseKey`

```prisma
model Task {
  // ... campi esistenti ...
  phaseKey    String?  @map("phase_key")  // NUOVO: solo per taskType='milestone'
}
```

### Struttura JSON delle fasi

Quando `domain='project'`, il campo `statuses` del WorkflowTemplate contiene:

```typescript
interface ProjectPhase {
  key: string           // "planning", "design", etc.
  label: string         // "Pianificazione", "Design"
  description: string   // descrizione della fase
  order: number         // ordine sequenziale (0, 1, 2...)
  color: string         // colore Tailwind (blue, purple, green...)
  isFinal: boolean      // fase terminale
  isInitial: boolean    // fase iniziale
}
```

Le `transitions` restano `Record<string, string[]>` (stessa struttura dei workflow task).

---

## Semantica di `Project.status` (prima vs dopo)

### Prima (9 valori misti)

```
planning | design | verification | validation | transfer | maintenance | completed | on_hold | cancelled
```

Mescolava fasi operative e condizioni trasversali.

### Dopo (4 condizioni)

| Valore | Significato | Comportamento UI |
|--------|-------------|------------------|
| `active` | Progetto in corso | WorkflowStepper visibile, fase corrente in `currentPhaseKey` |
| `on_hold` | In pausa | Banner giallo, tutto modificabile (soft block) |
| `cancelled` | Cancellato | Banner rosso, sola lettura |
| `completed` | Completato | Banner verde, sola lettura, si setta quando l'ultima fase isFinal è confermata |

La **fase** (dove siamo nel processo) è in `currentPhaseKey`.
La **condizione** (come stiamo) è in `status`.

---

## Logica di avanzamento fasi

### Determinazione stato di ogni fase (per WorkflowStepper)

```
completed  → order < ordine della fase corrente
current    → key === currentPhaseKey
available  → fase successiva E tutte le milestone della fase corrente sono "done"
locked     → fasi future non ancora raggiungibili
```

### Flusso semi-automatico

1. L'utente completa l'ultima milestone di una fase (tutte le milestone con quel `phaseKey` sono `done`)
2. Il backend rileva la condizione nel response della mutation (o via polling dal frontend)
3. Il frontend mostra un **suggerimento**: "Tutte le milestone della fase [X] sono completate. Avanzare alla fase [Y]?"
4. L'utente conferma → `PATCH /api/projects/:id/phase/advance`
5. Il backend aggiorna `currentPhaseKey` alla prossima fase da `transitions`
6. Se la fase è `isFinal`, il progetto passa a `status: 'completed'` automaticamente

### Prerequisiti per avanzare

Non più hardcoded nel frontend. Calcolati dal backend:
- **Blocking**: tutte le milestone della fase corrente devono essere `done`
- **Soft**: documenti delle milestone approvati (suggerimento, non blocco)

### Regressione di fase

Possibile: l'utente può tornare a una fase precedente (tramite `transitions` che lo permettono). Utile quando si scoprono problemi dopo l'avanzamento.

---

## Template di fasi predefiniti (seed)

### Template "Biomedico IEC 62304" (isSystem: true)

```json
{
  "domain": "project",
  "name": "Biomedico IEC 62304",
  "statuses": [
    { "key": "planning", "label": "Pianificazione", "description": "Definizione obiettivi e pianificazione", "order": 0, "color": "gray", "isInitial": true, "isFinal": false },
    { "key": "design", "label": "Design", "description": "Progettazione e strutturazione del lavoro", "order": 1, "color": "blue", "isInitial": false, "isFinal": false },
    { "key": "verification", "label": "Verifica", "description": "Verifica dell'avanzamento e completamento attività", "order": 2, "color": "yellow", "isInitial": false, "isFinal": false },
    { "key": "validation", "label": "Validazione", "description": "Validazione finale e approvazione deliverable", "order": 3, "color": "purple", "isInitial": false, "isFinal": false },
    { "key": "transfer", "label": "Trasferimento", "description": "Consegna finale e chiusura progetto", "order": 4, "color": "green", "isInitial": false, "isFinal": true }
  ],
  "transitions": {
    "planning": ["design"],
    "design": ["planning", "verification"],
    "verification": ["design", "validation"],
    "validation": ["verification", "transfer"],
    "transfer": ["validation"]
  }
}
```

### Template "Generico" (isSystem: true)

```json
{
  "domain": "project",
  "name": "Generico",
  "statuses": [
    { "key": "initiation", "label": "Avvio", "description": "Avvio e definizione del progetto", "order": 0, "color": "gray", "isInitial": true, "isFinal": false },
    { "key": "execution", "label": "Esecuzione", "description": "Esecuzione delle attività pianificate", "order": 1, "color": "blue", "isInitial": false, "isFinal": false },
    { "key": "closing", "label": "Chiusura", "description": "Completamento e consegna", "order": 2, "color": "green", "isInitial": false, "isFinal": true }
  ],
  "transitions": {
    "initiation": ["execution"],
    "execution": ["initiation", "closing"],
    "closing": ["execution"]
  }
}
```

---

## Personalizzazione fasi per progetto

### Alla creazione del progetto

1. L'utente sceglie un template di fasi (select nel form, default: template di sistema)
2. Le fasi del template vengono **copiate in `Project.phases`** (JSON)
3. `currentPhaseKey` = prima fase `isInitial`
4. `phaseTemplateId` = ID del template scelto (per riferimento)

### Modifica fasi (`PATCH /api/projects/:id/phases`)

- Aggiungere una fase (con `key`, `label`, `order`)
- Rimuovere una fase (solo se non ha milestone assegnate)
- Rinominare/riordinare fasi
- Modifica solo `Project.phases` (copia locale), il template originale non viene toccato

### Salva come template (`POST /api/projects/:id/phases/save-as-template`)

- Crea un nuovo `WorkflowTemplate` con `domain: 'project'` dalle fasi correnti del progetto
- L'utente sceglie il nome del template
- Il nuovo template è disponibile per tutti i progetti futuri

---

## API Endpoints

### Template fasi (riuso CRUD esistente)

| Endpoint | Metodo | Descrizione | Auth |
|----------|--------|-------------|------|
| `GET /api/workflows?domain=project` | GET | Lista template fasi progetto | Tutti autenticati |
| `GET /api/workflows/:id` | GET | Dettaglio template | Tutti autenticati |
| `POST /api/workflows` | POST | Crea template (con `domain: 'project'`) | admin, direzione |
| `PUT /api/workflows/:id` | PUT | Modifica template | admin, direzione |
| `DELETE /api/workflows/:id` | DELETE | Elimina template | admin |

### Fasi progetto (nuovi endpoint)

| Endpoint | Metodo | Descrizione | Auth |
|----------|--------|-------------|------|
| `GET /api/projects/:id/phases` | GET | Fasi del progetto + milestone per fase + stato avanzamento | Tutti autenticati |
| `PATCH /api/projects/:id/phases` | PATCH | Modifica fasi locali (add/remove/rename/reorder) | admin, direzione |
| `PATCH /api/projects/:id/phase/advance` | PATCH | Avanza alla fase successiva | admin, direzione |
| `POST /api/projects/:id/phases/save-as-template` | POST | Salva fasi correnti come nuovo template | admin, direzione |

### Endpoint esistenti modificati

| Endpoint | Modifica |
|----------|----------|
| `PATCH /api/projects/:id/status` | Accetta solo `active/on_hold/cancelled` (non più le fasi) |
| `GET /api/projects/:id` | Ritorna `phases`, `currentPhaseKey`, `phaseTemplateId` |
| `POST /api/projects` | Accetta `phaseTemplateId`, copia fasi in `phases` |
| `POST/PUT /api/tasks` | Milestone accettano `phaseKey` |

---

## Impatto Frontend

### File da rimuovere

- `client/src/lib/workflows/projectWorkflow.ts` — le fasi vengono dal DB

### File da modificare

- `client/src/lib/workflow-engine.ts` — i prerequisiti diventano server-driven (milestone done per fase)
- `client/src/components/common/WorkflowStepper.tsx` — riceve fasi da `project.phases`, mostra milestone sotto ogni step
- `client/src/pages/projects/ProjectDetailPage.tsx` — usa fasi dal server, banner per on_hold/cancelled, bottone avanzamento
- `client/src/pages/projects/ProjectListPage.tsx` — mostra fase corrente + condizione
- `client/src/hooks/api/useProjects.ts` — nuovi hook: `useProjectPhasesQuery`, `useAdvancePhase`, `useSavePhasesAsTemplate`
- `client/src/types/index.ts` — `ProjectStatus` diventa `'active' | 'on_hold' | 'cancelled' | 'completed'`
- `client/src/lib/constants.ts` — aggiornare `PROJECT_STATUS_LABELS`, aggiungere `PROJECT_CONDITION_LABELS`
- Form progetto — aggiungere select template fasi

### Nuovo hook API

```typescript
// hooks/api/useProjects.ts (aggiunte)
export function useProjectPhasesQuery(projectId: string) { ... }
export function useAdvancePhase() { ... }
export function useUpdateProjectPhases() { ... }
export function useSavePhasesAsTemplate() { ... }
```

### WorkflowStepper aggiornato

Lo stepper mostra:
- Ogni fase come step (completed/current/available/locked)
- Sotto ogni step: lista milestone con stato (done/in_progress/todo)
- Badge con conteggio milestone: "3/5 completate"
- Bottone "Avanza fase" quando tutte le milestone della fase corrente sono done

---

## Migrazione dati

### Passi di migrazione

1. **Aggiungere `domain` a `WorkflowTemplate`** con default `'task'`
2. **Aggiungere a `Project`**: `phaseTemplateId`, `phases`, `currentPhaseKey`
3. **Aggiungere a `Task`**: `phaseKey`
4. **Seedare** i 2 template di sistema con `domain: 'project'`
5. **Migrare progetti esistenti**:
   - `status` in (`planning`, `design`, `verification`, `validation`, `transfer`, `maintenance`) → `currentPhaseKey = status`, `status = 'active'`, `phases` = copia dal template Biomedico
   - `status = 'on_hold'` → `status = 'on_hold'`, `currentPhaseKey = 'planning'` (o ultimo noto)
   - `status = 'cancelled'` → `status = 'cancelled'`
   - `status = 'completed'` → `status = 'completed'`, `currentPhaseKey` = ultima fase
6. **Milestone esistenti**: `phaseKey = null` (assegnazione manuale successiva, o best-effort basato sulla fase del progetto)

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Migrazione rompe progetti esistenti | Migrazione dati con mapping esplicito, rollback possibile |
| Utenti confusi dal cambio semantica status | Banner informativo temporaneo, documentazione |
| Template fasi e template task nella stessa tabella | `domain` discriminator chiaro, UI filtra per domain |
| Milestone senza phaseKey | Permesso (null), UI mostra "Fase non assegnata" con suggerimento |
| Performance query fasi + milestone | Una singola query con join, stessa complessità di oggi |
