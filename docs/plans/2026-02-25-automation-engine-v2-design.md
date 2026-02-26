# Automation Engine V2 — Design Document

**Data**: 2026-02-25
**Stato**: Approvato
**Obiettivo**: Riscrivere il motore automazioni con architettura a plugin, supporto multi-dominio (task, risk, document, project), workflow documentale automatizzato, e motore di raccomandazioni basato su analisi pattern.

---

## Sezione 1: Automation Engine V2 — Core

### 1.1 — Architettura a Registry

Il motore attuale è monolitico con switch statements. Il V2 adotta un'architettura a plugin registry.

```
AutomationRegistry
├── TriggerRegistry    → Map<string, TriggerHandler>
├── ConditionRegistry  → Map<string, ConditionEvaluator>
├── ActionRegistry     → Map<string, ActionExecutor>
└── ContextRegistry    → Map<string, ContextProvider>
```

Ogni componente è un modulo autonomo con interfaccia standard:

- **TriggerHandler**: `{ type, label, paramsSchema, matchesEvent(event, config) }`
- **ConditionEvaluator**: `{ type, label, paramsSchema, evaluate(context, config) }`
- **ActionExecutor**: `{ type, label, paramsSchema, execute(context, config) }`
- **ContextProvider**: `{ domain, loadContext(entityId) }` — carica dati dell'entità

Aggiungere un nuovo trigger o azione = creare un file e registrarlo. Zero modifiche al core engine.

### 1.2 — Multi-dominio

Il V2 introduce il concetto di dominio. Ogni trigger specifica il dominio, e il context provider carica i dati necessari.

| Dominio | Entità | Context Provider |
|---------|--------|-----------------|
| `task` | Task, Subtask, Milestone | Carica task + project + assignee |
| `risk` | Risk | Carica risk + project + owner |
| `document` | Document | Carica document + project + creator |
| `project` | Project | Carica project + owner + stats |

### 1.3 — Cooldown e Deduplicazione

- Nuova tabella `AutomationCooldown` (ruleId + entityId + lastFiredAt)
- `cooldownMinutes` per regola (default 60 per scheduler, 0 per eventi)
- Check prima di eseguire: se `lastFiredAt + cooldown > now`, skip

### 1.4 — Condizioni AND/OR

- Campo `conditionLogic: 'AND' | 'OR'` sulla regola (default `AND`)
- Valutazione raggruppata di conseguenza

### 1.5 — Interpolazione messaggi

- Helper centralizzato `interpolateMessage(template, context)`
- Supporta: `{task.code}`, `{task.title}`, `{risk.title}`, `{document.title}`, `{project.name}`, `{assignee.name}`, `{dueDate}`, ecc.
- Applicato automaticamente a tutte le azioni che generano testo

### 1.6 — Workflow enforcement

- Azioni che cambiano `status` passano attraverso il service appropriato (non Prisma diretto)
- Garantisce validazione workflow su task e documenti

---

## Sezione 2: Trigger, Azioni e Condizioni per Tutti i Domini

### Trigger — Dominio Task (esistenti migliorati + nuovi)

| Trigger | Miglioramento/Nuovo | Parametri |
|---------|---------------------|-----------|
| `task_status_changed` | Esistente, invariato | `fromStatus?`, `toStatus?`, `taskType?` |
| `task_created` | Esistente, invariato | `taskType?` |
| `task_assigned` | Esistente, invariato | — |
| `all_subtasks_completed` | Esistente, invariato | — |
| `task_overdue` | Fix: cooldown 60min default | `overdueHours?` |
| `task_deadline_approaching` | Esistente, invariato | `daysBeforeDeadline` |
| `task_updated` | **Nuovo** — cambio campo | `field`, `fromValue?`, `toValue?` |
| `task_commented` | **Nuovo** — nuovo commento | `mentionsUser?` |
| `task_idle` | **Nuovo** — scheduler, non aggiornato da N giorni | `idleDays` (default 7) |

### Trigger — Dominio Risk (tutti nuovi)

| Trigger | Quando scatta | Parametri |
|---------|--------------|-----------|
| `risk_created` | Nuovo rischio | `severity?` |
| `risk_status_changed` | Cambio stato rischio | `fromStatus?`, `toStatus?` |
| `risk_severity_changed` | Cambio severità | `fromSeverity?`, `toSeverity?` |
| `risk_overdue` | Rischio con mitigation date scaduta | `cooldownMinutes` (default 60) |

### Trigger — Dominio Document (tutti nuovi)

| Trigger | Quando scatta | Parametri |
|---------|--------------|-----------|
| `document_created` | Nuovo documento | `type?` |
| `document_status_changed` | Cambio stato documento | `fromStatus?`, `toStatus?` |
| `document_expiring` | Documento vicino a scadenza revisione | `daysBeforeExpiry` |
| `document_expired` | Documento scaduto e non revisionato | `cooldownMinutes` (default 1440 = 24h) |

### Trigger — Dominio Project (tutti nuovi)

| Trigger | Quando scatta | Parametri |
|---------|--------------|-----------|
| `project_status_changed` | Cambio stato progetto | `fromStatus?`, `toStatus?` |
| `project_budget_threshold` | Budget consumato oltre soglia | `percentThreshold` (es. 80) |
| `milestone_deadline_approaching` | Milestone in scadenza | `daysBeforeDeadline` |

### Nuove Azioni (cross-dominio)

| Azione | Cosa fa | Parametri |
|--------|---------|-----------|
| `send_email` | Email via SMTP (template HTML) | `to: 'assignee' \| 'owner' \| userId`, `subject`, `body` |
| `set_due_date` | Imposta/sposta scadenza | `mode: 'absolute' \| 'relative'`, `value` |
| `create_subtask` | Crea subtask automatico | `title`, `assigneeId?` |
| `set_risk_status` | Cambia stato rischio | `status` |
| `set_document_status` | Cambia stato documento (con workflow) | `status` |
| `webhook` | HTTP POST a URL esterno | `url`, `headers?`, `bodyTemplate?` |
| `escalate` | Notifica progressiva: owner → poi urgente dopo N ore | `escalateAfterHours`, `message` |

### Nuove Condizioni

| Condizione | Cosa verifica | Parametri |
|------------|--------------|-----------|
| `entity_in_project` | L'entità appartiene a un progetto specifico | `projectId` |
| `risk_severity_is` | Severità del rischio | `value` |
| `document_type_is` | Tipo documento | `value` |
| `time_since_last_update` | Ore/giorni dall'ultimo aggiornamento | `operator`, `value`, `unit` |
| `user_workload_above` | Carico assegnatario sopra soglia | `maxTasks` |

---

## Sezione 3: Workflow Documentale Automatizzato

### 3.1 — Ciclo di vita documento

```
draft → in_review → approved → published
  ↑         ↓
  ←── rejected
```

| Transizione | Automazione suggerita |
|-------------|----------------------|
| `draft → in_review` | Notifica ai revisori assegnati |
| `in_review → approved` | Notifica al creatore, aggiorna stato progetto |
| `in_review → rejected` | Notifica al creatore con commento motivazione |
| `approved → published` | Notifica a tutto il team progetto |
| Scadenza revisione -30gg | Reminder al responsabile documento |
| Scadenza revisione -7gg | Escalation: reminder + notifica owner progetto |
| Documento scaduto | Alert giornaliero fino a revisione completata |

### 3.2 — Revisione periodica

- Nuovo campo `reviewDueDate` sul documento (opzionale)
- Quando il documento viene approvato/pubblicato, se ha una frequenza di revisione (`reviewFrequencyDays`), il sistema calcola automaticamente la prossima `reviewDueDate`
- Lo scheduler controlla i documenti in scadenza e scaduti, applicando i trigger `document_expiring` e `document_expired`

### 3.3 — Template automazioni documentali

| Template | Trigger | Azione |
|----------|---------|--------|
| Notifica revisori | `document_status_changed` → `in_review` | `notify_user` ai revisori |
| Reminder scadenza | `document_expiring` (30gg) | `send_email` al responsabile |
| Escalation scadenza | `document_expiring` (7gg) | `escalate` a owner progetto |
| Alert scaduto | `document_expired` | `notify_user` + `send_email` giornaliero |
| Auto-rinnovo revisione | `document_status_changed` → `approved` | `set_due_date` prossima revisione |

---

## Sezione 4: Motore di Raccomandazioni (Pattern Analysis)

### 4.1 — Come funziona

```
Dati storici → Pattern Analyzer → Raccomandazioni → UI card con "Attiva"
```

Il `recommendationService` esegue query periodiche (ogni 24h dallo scheduler, o on-demand) e genera suggerimenti con:

- **Titolo** e **descrizione** del pattern rilevato
- **Evidenza**: metrica concreta (es. "12 task su 30 hanno sforato la scadenza")
- **Impatto stimato**: alto/medio/basso
- **Automazione suggerita**: regola pre-compilata, attivabile con un click
- **Dismissable**: l'utente può ignorare un suggerimento e non verrà riproposto

### 4.2 — Pattern rilevati

| Pattern | Query | Raccomandazione generata |
|---------|-------|--------------------------|
| Task frequentemente in ritardo | `>30%` task con `dueDate < completedAt` in un progetto | "Attiva escalation automatica 48h prima della scadenza" |
| Task che restano `in_progress` troppo a lungo | Task con status `in_progress` da >N giorni (mediana progetto × 2) | "Attiva alert per task fermi da X giorni" |
| Subtask completati ma parent non avanza | Parent con tutti subtask `done` ma parent ancora `in_progress` | "Attiva completamento automatico del parent" |
| Rischi high senza owner | Rischi con `severity: high` e nessun `ownerId` | "Attiva assegnazione automatica rischi critici al PM" |
| Documenti scaduti senza revisione | Documenti con `reviewDueDate` passata | "Attiva reminder settimanale per documenti scaduti" |
| Milestone senza buffer | Milestone con deadline <7gg e task figli non completati >50% | "Attiva alert milestone a rischio" |
| Assegnatario sovraccarico | Utenti con >N task attivi (sopra media team × 1.5) | "Considera la redistribuzione: {user} ha {n} task attivi vs media {avg}" |
| Nessuna automazione su progetto | Progetto attivo senza regole associate | "Questo progetto non ha automazioni — vuoi applicare il pacchetto base?" |

### 4.3 — Pacchetti automazione

Gruppi di regole attivabili insieme:

| Pacchetto | Regole incluse |
|-----------|---------------|
| **Base** | Notify overdue + deadline approaching (1gg) + auto-complete parent |
| **Gestione rischi** | Notify risk high + escalation risk overdue |
| **Compliance documentale** | Workflow approvativo + reminder scadenze + alert scaduti |
| **Scadenze rigorose** | Escalation 48h + 24h + notifica owner + alert idle 5gg |

### 4.4 — Persistenza

- Tabella `AutomationRecommendation` (id, projectId?, pattern, evidence JSON, suggestedRule JSON, impact, status, dismissedAt?, dismissedBy?, appliedRuleId?, createdAt)
- Le raccomandazioni vengono rigenerate periodicamente (ogni 24h dallo scheduler, o on-demand)
- Quando l'utente attiva una raccomandazione → crea la regola e segna come "applied"
- Quando l'utente la ignora → segna come "dismissed", non viene riproposta per quel progetto

### 4.5 — UI nella pagina Automazioni

Sezione **"Suggerimenti"** in cima alla pagina AutomationListPage:

- Card con icona pattern, titolo, evidenza, badge impatto (alto/medio/basso)
- Pulsante "Attiva" → crea la regola pre-compilata (con possibilità di personalizzare prima)
- Pulsante "Ignora" → dismiss
- Filtro per progetto (coerente con i filtri esistenti)

---

## Modello dati — Nuove tabelle/campi

### Nuova tabella: `AutomationCooldown`
- `id` UUID PK
- `ruleId` FK → AutomationRule (CASCADE)
- `entityId` String — ID dell'entità (task/risk/document)
- `lastFiredAt` DateTime
- `@@unique([ruleId, entityId])`

### Nuova tabella: `AutomationRecommendation`
- `id` UUID PK
- `projectId` String? FK → Project
- `pattern` String — chiave del pattern (es. "tasks_frequently_late")
- `evidence` NVarChar(Max) — JSON con dati statistici
- `suggestedRule` NVarChar(Max) — JSON con la regola pre-compilata
- `impact` String — "high" | "medium" | "low"
- `status` String — "pending" | "applied" | "dismissed"
- `appliedRuleId` String? FK → AutomationRule
- `dismissedAt` DateTime?
- `dismissedBy` String? FK → User
- `createdAt` DateTime

### Modifiche a `AutomationRule`
- `+ domain` String (default "task") — dominio dell'entità
- `+ conditionLogic` String (default "AND") — "AND" | "OR"
- `+ cooldownMinutes` Int (default 0) — minuti di cooldown tra esecuzioni

### Modifiche a `Document`
- `+ reviewDueDate` DateTime? — scadenza prossima revisione
- `+ reviewFrequencyDays` Int? — frequenza revisione in giorni

---

## Decisioni chiave

- **Escalation**: assegnatario e owner sono responsabili. La direzione ha ruolo consultivo.
- **Cooldown default**: 60 min per trigger scheduler, 0 per trigger evento
- **Retrocompatibilità**: regole esistenti continuano a funzionare (domain default "task", conditionLogic default "AND")
- **Workflow enforcement**: azioni che cambiano status passano attraverso il service, non Prisma diretto
- **Raccomandazioni**: rigenerate ogni 24h, dismissable, mai ripetute dopo dismiss
