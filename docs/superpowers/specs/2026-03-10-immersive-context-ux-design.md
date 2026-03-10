# Immersive Context UX — Design Spec

> **Data**: 2026-03-10
> **Branch**: `feature/ux-redesign-jarvis`
> **Approccio**: B — "Immersive Context"
> **Stato**: Approvato

---

## Obiettivo

Trasformare ProjectPulse da app gestionale standard a strumento **context-aware** dove l'utente sa sempre: **dove sono**, **cosa posso fare**, **a che punto siamo**. Il contesto (progetto, task, rischio, ecc.) diventa un sistema visivo pervasivo che colora l'intera esperienza.

## 6 Sistemi progettati

1. [Context System + Multi-Theme](#1-context-system--multi-theme)
2. [Radial Menu](#2-radial-menu)
3. [Progress Visualization](#3-progress-visualization)
4. [Guided Workflows](#4-guided-workflows)
5. [Role-Aware Actions](#5-role-aware-actions)
6. [Permission Management System](#6-permission-management-system-admin-ui)

---

## 1. Context System + Multi-Theme

### PageContext Provider

Ogni pagina dichiara il suo contesto tramite un hook. Il contesto propaga dominio, colore, icona, permessi a tutti i componenti figli.

```
App → AppShell → PageContextProvider
                    ├── Header          ← banda colore + icona contesto
                    ├── Sidebar         ← item attivo con colore dominio
                    ├── RadialMenu      ← azioni filtrate per contesto
                    └── <Page>          ← dichiara il contesto
```

**API:**

```tsx
usePageContext({
  domain: "project",           // dominio corrente
  entityId?: "uuid-xxx",       // entita' specifica (opzionale)
  parentDomain?: "project",    // contesto padre (opzionale)
  parentId?: "uuid-yyy",
})
```

Il provider risolve automaticamente dal `domain`:
- Colore: dalla mappa `DOMAIN_COLORS` in `lib/constants.ts`
- Icona: dalla mappa in `lib/theme-config.ts` (tema-aware)
- Label: "Progetti", "Task", "Rischi", ecc.
- Permessi: incrocia `domain` + `user.role` + policies DB

### Effetti visivi del contesto

1. **Context Header Bar** — banda 3px colorata in cima al content area
2. **Sidebar Active Item** — bordo sinistro + sfondo con colore dominio
3. **Breadcrumbs contestuali** — ogni segmento mostra icona del dominio con colore
4. **Card accent** — EntityDetail e EntityForm hanno bordo superiore 2px con colore dominio

### Multi-Theme System (3 temi x 2 mode = 6 varianti)

Tema e mode gestiti separatamente da `themeStore` (Zustand persistito). Applicati via attributi CSS su `<html>`:

```html
<html class="dark" data-theme="tech-hud">
```

#### I 3 temi

| Tema | Estetica | Radius | Font dati | Animazioni | Ombre |
|------|----------|--------|-----------|------------|-------|
| **Office Classic** | Pulito, sobrio, bordi definiti. Stile Microsoft 365 | `4px` | Inter/System | Fade 150ms, ease | Subtle, `shadow-sm` |
| **Asana Like** | Colorato, arrotondato, spazioso. Stile Asana/Monday | `12px` | Inter | Spring bounce 200ms | Soft, `shadow-md` |
| **Tech HUD** | Denso, glow/neon sottili, data-heavy. Stile dashboard tecnica | `2px` | JetBrains Mono | Glow pulse 250ms | Neon glow, `shadow-[0_0_8px]` |

#### Icone — stesse Lucide base, effetti diversi per tema

Tutti i temi usano le stesse icone Lucide per dominio:

| Dominio | Icona Lucide |
|---------|-------------|
| Progetto | `FolderKanban` |
| Milestone | `Flag` |
| Task | `CheckSquare` |
| Subtask | `GitBranch` |
| Rischio | `AlertTriangle` |
| Documento | `FileText` |
| Utente/Team | `Users` |
| Richiesta | `MessageSquarePlus` |

**Effetti per tema:**

| Effetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Stile | Flat, nessun effetto | Filled/soft background circle | Glow outline neon |
| Hover | Nessuno | Scale 1.1 + bounce | Glow pulse |
| Colore | Dominio solido | Dominio + sfondo pastello | Dominio + glow |
| Wrapper CSS | `p-1.5` | `p-2 rounded-full bg-{color}-100 dark:bg-{color}-900/20` | `p-1.5 shadow-[0_0_6px] shadow-{color}-400/40` |

#### Emoji per stati (variano per tono del tema)

| Stato | Office Classic | Asana Like | Tech HUD |
|-------|---------------|------------|----------|
| Completato | check | party | zap |
| In corso | arrows_counterclockwise | rocket | play |
| Bloccato | stop_sign | worried | red_circle |
| Nuovo | page_facing_up | sparkles | wrench |
| Successo (toast) | check | confetti | check_mark |
| Errore (toast) | x | cry | no_entry |
| Warning | warning | thinking | warning |

#### Struttura CSS

```css
:root[data-theme="office-classic"]      { /* light values */ }
:root[data-theme="office-classic"].dark  { /* dark values */ }
:root[data-theme="asana-like"]           { /* light values */ }
:root[data-theme="asana-like"].dark      { /* dark values */ }
:root[data-theme="tech-hud"]            { /* light values */ }
:root[data-theme="tech-hud"].dark       { /* dark values */ }
```

#### ThemeStore

```tsx
interface ThemeState {
  theme: "office-classic" | "asana-like" | "tech-hud"
  mode: "light" | "dark" | "system"
  setTheme: (theme: ThemeState["theme"]) => void
  setMode: (mode: ThemeState["mode"]) => void
}
```

### File

```
NUOVI:
  hooks/ui/usePageContext.ts
  lib/theme-config.ts

MODIFICATI:
  components/layout/AppShell.tsx
  components/layout/Header.tsx
  components/layout/Sidebar.tsx
  components/common/Breadcrumbs.tsx
  components/common/EntityDetail.tsx
  components/common/EntityForm.tsx
  lib/constants.ts
  stores/themeStore.ts
  styles/globals.css
  tutte le ~28 pagine (aggiunta usePageContext)
```

---

## 2. Radial Menu

### Concetto

Menu circolare context-aware con 4-8 azioni disposte a cerchio attorno al punto di attivazione. Le azioni cambiano in base a dominio, entita', e ruolo utente.

### Attivazione

| Piattaforma | Trigger primario | Trigger secondario |
|-------------|-----------------|-------------------|
| Desktop | Right-click su area contenuto | `Ctrl+Space` |
| Mobile | Long-press (400ms) | FAB (56x56px) in basso a destra |

### Layout

```
         [Azione 1]
      /              \
 [Azione 6]      [Azione 2]
      |      *       |          * = punto attivazione
 [Azione 5]      [Azione 3]
      \              /
         [Azione 4]
```

- Desktop: raggio 100px, item 44x44px
- Mobile: raggio 120px, item 52x52px (min touch 48px)
- Ogni item: cerchio con icona Lucide (dal tema) + label sotto

### Collision Detection — Edge-Aware

Il menu rileva la distanza dai bordi viewport e **ruota l'intero layout** per presentare le voci verso lo spazio disponibile:

- Se un bordo e' troppo vicino (< raggio + 40px padding) → items si distribuiscono nel semicerchio opposto
- Se due bordi sono vicini (angolo) → items nel quadrante opposto
- Mantiene sempre min 60 gradi tra items adiacenti
- Su mobile il FAB e' a 24px dal bordo → menu si apre sempre verso alto-sinistra

### Action Registry

```tsx
interface RadialAction {
  id: string
  label: string                    // max 12 caratteri
  icon: keyof ThemeIcons
  domain: Domain
  scope: "list" | "detail" | "global"
  roles: Role[]
  permission: (perms: ResolvedPermissions) => boolean
  action: (ctx: PageContext) => void
  shortcut?: string
}
```

### Azioni per contesto

| Contesto | Scope List | Scope Detail |
|----------|-----------|-------------|
| Progetti | Nuovo progetto, Filtra, Esporta, Ordina | Modifica, Aggiungi task, Aggiungi rischio, Aggiungi documento, Vedi timeline, Elimina |
| Task | Nuovo task, Filtra, Esporta, Cambia vista | Cambia stato, Assegna, Log ore, Aggiungi subtask, Aggiungi commento, Modifica |
| Rischi | Nuovo rischio, Filtra, Esporta | Modifica, Cambia stato, Assegna mitigazione, Elimina |
| Documenti | Nuovo documento, Filtra, Esporta | Modifica, Cambia stato, Scarica, Elimina |
| Richieste | Nuova richiesta, Filtra, Esporta | Valuta, Accetta, Rifiuta, Converti in progetto, Converti in task, Modifica |
| Time Tracking | Nuova voce, Filtra, Esporta | Modifica, Elimina, Duplica |
| Home/Dashboard | Refresh dati, Cambia periodo, Esporta report | — |

Azione globale sempre presente: Command Palette ("Cerca...").

### Sotto-menu (max 1 livello)

Alcune azioni aprono un sotto-menu radiale (es. "Cambia stato"):
- Appare con animazione scale-in dalla posizione dell'item padre
- Max 6 opzioni
- Back = click al centro o Escape

### Adattamento per tema

| Aspetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Sfondo item | `bg-card border` solid | `bg-card/90 backdrop-blur` rounded-full | `bg-card/80 border border-primary/20` |
| Hover | `bg-accent` | Scale 1.08 + shadow | Glow `shadow-[0_0_12px]` colore dominio |
| Apertura | Fade-in 150ms, tutti insieme | Spring stagger 30ms per item | Items "sparano" dal centro con glow trail |
| Chiusura | Fade-out 100ms | Scale-down 0.8 spring | Dissolve con fade glow |
| Centro | Punto invisibile | Cerchio sfumato pastello | Punto con pulse glow |
| Linee | Nessuna | Nessuna | Linee sottili neon dal centro agli items |

### Mobile FAB

- 56x56px, colore primario del dominio corrente
- Tap → apre radial menu centrato sopra il FAB
- Quando aperto: FAB diventa X (chiudi)
- Non appare su desktop

### Accessibilita'

- `role="menu"` + `role="menuitem"` ARIA
- Navigazione frecce direzionali
- Enter/Space per attivare, Escape per chiudere
- Focus trap, aria-label su ogni item
- Items disabilitati: `aria-disabled="true"` + tooltip

### File

```
NUOVI:
  components/features/RadialMenu/RadialMenu.tsx
  components/features/RadialMenu/RadialMenuItem.tsx
  components/features/RadialMenu/RadialSubMenu.tsx
  components/features/RadialMenu/useRadialMenu.ts
  components/features/RadialMenu/index.ts
  lib/radial-actions.ts

MODIFICATI:
  components/layout/AppShell.tsx
```

---

## 3. Progress Visualization

### 3 livelli di granularita'

```
Livello 1: SINGOLA ENTITA'    → ProgressRing
Livello 2: DISTRIBUZIONE      → StatusDistribution
Livello 3: TREND NEL TEMPO    → TrendSparkline
```

### ProgressRing — singola entita'

Cerchio SVG con arco proporzionale alla % completamento.

```tsx
interface ProgressRingProps {
  value: number              // 0-100
  size?: "sm" | "md" | "lg"  // 32px | 48px | 72px
  showLabel?: boolean
  showValue?: boolean         // "12/17"
  total?: number
  completed?: number
  animated?: boolean
  colorMode?: "auto" | "domain"
}
```

Colore automatico: 0-33% rosso, 34-66% amber, 67-100% verde.

Dove appare:
- Card progetto in EntityList (sm, inline)
- Hero EntityDetail progetto (lg, sidebar)
- Card milestone (md)
- KPI card HomePage (lg)

| Tema | Stroke | Track | Animazione |
|------|--------|-------|-----------|
| Office Classic | Solido 3px, round cap | muted | Ease-out 400ms |
| Asana Like | Solido 4px, round cap, ombra soft | muted 0.3 | Spring 500ms overshoot |
| Tech HUD | Solido 2px, butt cap, glow neon | muted 0.15 | Ease-in 300ms + glow pulse |

### StatusDistribution — distribuzione su collezione

**Variante A — Stacked Bar** (default per liste):
Barra segmentata colorata per status con legenda.

**Variante B — Donut** (per dashboard/KPI):
Cerchio segmentato con totale al centro.

```tsx
interface StatusDistributionProps {
  items: { status: string; count: number; label: string }[]
  total: number
  variant?: "bar" | "donut"
  size?: "sm" | "md" | "lg"
  showLegend?: boolean
  showCounts?: boolean
  animated?: boolean
  domain?: Domain
}
```

Dove appare:
- Sidebar EntityDetail progetto (bar, md)
- HomePage KPI (donut, lg)
- Header EntityList task (bar, sm)
- AnalyticsPage (donut, lg)

| Tema | Bar | Donut | Hover | Animazione |
|------|-----|-------|-------|-----------|
| Office Classic | Squadrata, gap 1px | Stroke 12px, gap 2px | Tooltip | Wipe 300ms |
| Asana Like | Pill, gap 2px | Stroke 16px, gap 3px, ombra interna | Scale-up 1.05 | Spring da centro 400ms |
| Tech HUD | Netta, no gap, glow | Stroke 8px, glow esterno | Glow intenso | Segmenti "accendono" in sequenza 200ms |

### TrendSparkline — andamento nel tempo

Mini grafico lineare per trend.

```tsx
interface TrendSparklineProps {
  data: { date: string; value: number }[]
  size?: "sm" | "md"          // 80x24px | 200x60px
  color?: string
  showDelta?: boolean         // +/-% badge
  showArea?: boolean
  showPoints?: boolean
  showTooltip?: boolean
}
```

Delta badge: positivo → success + TrendingUp, negativo → destructive + TrendingDown, stabile → muted + Minus.

Dove appare:
- KPI cards HomePage (sm, inline)
- AnalyticsPage (md)
- Sidebar EntityDetail progetto (sm)

### ProgressSummary — composizione

Combina i 3 livelli in un wrapper:

```tsx
interface ProgressSummaryProps {
  progress: number
  total: number
  completed: number
  statusBreakdown: { status: string; count: number; label: string }[]
  trend?: { date: string; value: number }[]
  domain?: Domain
}
```

Dove appare: sidebar EntityDetail, card KPI espandibile, AnalyticsPage.

### File

```
NUOVI:
  components/common/ProgressRing.tsx
  components/common/StatusDistribution.tsx
  components/common/TrendSparkline.tsx
  components/common/ProgressSummary.tsx

MODIFICATI:
  components/common/EntityDetail.tsx
  components/common/EntityList.tsx
  pages/home/ManagementDashboard.tsx
  pages/analytics/AnalyticsPage.tsx
  lib/constants.ts (STATUS_COLORS_HSL)
```

---

## 4. Guided Workflows

### Architettura

```
WorkflowEngine (lib/workflow-engine.ts)    ← logica pura, no UI
  ├── WorkflowDefinition                    ← fasi, prerequisiti, transizioni
  ├── evaluatePhase()                       ← valuta prerequisiti
  └── getNextActions()                      ← suggerisce prossime azioni

WorkflowStepper (componente)               ← visualizzazione unificata
  ├── StepperBar                            ← barra fasi
  ├── PhaseValidationPanel                  ← checklist prerequisiti
  └── NextActionSuggestion                  ← CTA prossima azione
```

### Workflow definiti

#### Progetto Lifecycle (5 fasi)

```
[Pianificazione] → [Setup] → [In Corso] → [Revisione] → [Completato]
```

| Fase | Prerequisiti per avanzare | Suggerimento |
|------|--------------------------|-------------|
| Pianificazione | Nome, date, responsabile | "Aggiungi almeno una milestone per passare a Setup" |
| Setup | >=1 milestone, >=3 task, team assegnato | "Assegna i task ai membri del team per avviare" |
| In Corso | Tutti i task hanno assegnatario, >=1 task avviato | "12 task completati su 17 — 3 bloccati richiedono attenzione" |
| Revisione | >=90% task completati, no rischi critici aperti | "2 task ancora aperti — completali per chiudere" |
| Completato | 100% task completati, documenti approvati | Stato finale |

#### Task Lifecycle (4 fasi)

```
[Da fare] → [In Corso] → [In Revisione] → [Completato]
```

| Fase | Prerequisiti | Suggerimento |
|------|-------------|-------------|
| Da fare | Assegnatario, data scadenza | "Avvia il task per iniziare a tracciare il tempo" |
| In Corso | >=1 time entry (se richiesto) | "Completa la checklist (3/5) prima di inviare in revisione" |
| In Revisione | Checklist 100% (se presente), ore <= 150% stimate | "In attesa di approvazione dal responsabile" |
| Completato | Approvazione da responsabile | Stato finale |

**Fase speciale — Bloccato:** raggiungibile da qualsiasi fase, richiede motivazione obbligatoria, badge rosso pulsante, ritorno alla fase precedente alla rimozione blocco.

#### Documento Lifecycle (3 fasi)

```
[Bozza] → [In Revisione] → [Approvato]
```

| Fase | Prerequisiti | Suggerimento |
|------|-------------|-------------|
| Bozza | File allegato | "Allega il file e invia in revisione" |
| In Revisione | >=1 revisore assegnato | "In attesa di approvazione" |
| Approvato | Approvazione esplicita | Stato finale |

#### Richiesta Lifecycle (4 fasi)

```
[Nuova] → [In Valutazione] → [Accettata] → [Convertita / Rifiutata]
```

| Fase | Chi | Prerequisiti | Suggerimento |
|------|-----|-------------|-------------|
| Nuova | Tutti | Titolo, descrizione | "In attesa di valutazione" |
| In Valutazione | Admin, Direzione | Valutatore assegnato | "Valuta e decidi se accettarla" |
| Accettata | Admin, Direzione | Priorita' assegnata | "Converti in progetto o task" |
| Convertita | Admin, Direzione | Collegata a progetto/task | Stato finale |
| Rifiutata | Admin, Direzione | Motivazione obbligatoria | Stato finale |

**Conversione richiesta:** apre ProjectFormPage/TaskFormPage pre-compilata con dati dalla richiesta. Al salvataggio la richiesta diventa "Convertita" con link.

### Workflow Engine

```tsx
interface WorkflowDefinition {
  id: string
  phases: WorkflowPhase[]
}

interface WorkflowPhase {
  id: string
  label: string
  prerequisites: Prerequisite[]
  suggestions: Suggestion[]
  transitions: string[]
}

interface Prerequisite {
  id: string
  label: string
  evaluate: (data: ValidationData) => {
    met: boolean
    current?: number
    required?: number
    detail?: string
  }
  blocking: boolean
}

interface Suggestion {
  label: string
  action: { type: "navigate"; href: string } | { type: "open-dialog"; dialog: string }
  priority: "high" | "medium" | "low"
  condition?: (data: ValidationData) => boolean
}
```

### WorkflowStepper — componente unificato

Sostituisce i 3 stepper separati esistenti:

```
 ● Pianificazione ─── ● Setup ─── ○ In Corso ─── ○ Rev.
 check                check attivo  prossimo

 ┌──────────────────────────────────────────────────────┐
 │  Setup — Prepara il progetto per l'avvio             │
 │                                                      │
 │  check Almeno 1 milestone creata (2 presenti)        │
 │  check Almeno 3 task creati (8 presenti)             │
 │  empty Team assegnato (0 membri)                     │
 │                                                      │
 │  > Aggiungi membri al team per avviare il progetto   │
 │    [Gestisci Team ->]                                │
 └──────────────────────────────────────────────────────┘
```

```tsx
interface WorkflowStepperProps {
  workflow: WorkflowDefinition
  currentPhase: string
  validationData: ValidationData
  onAdvance?: (nextPhase: string) => void
  onBlock?: (reason: string) => void
  collapsed?: boolean
  position?: "before-content" | "sidebar"
}
```

Stati visivi fase: `completed` (check verde), `current` (cerchio pieno + pulse), `available` (cerchio vuoto), `locked` (lucchetto grigio), `blocked` (rosso pulsante).

### Interazione avanzamento

- L'engine suggerisce, l'utente conferma (mai automatico)
- Prerequisiti non soddisfatti → bottone disabilitato con tooltip
- Blocco → dialog con textarea motivazione obbligatoria
- Avanzamento → dialog conferma → mutation API → toast

### Integrazione con Radial Menu

In contesto detail, il radial menu mostra azioni workflow-aware come primi items:
- "Avanza a In Corso" (se prerequisiti ok) o "Vedi prerequisiti"
- "Blocca progetto/task"

### Adattamento per tema

| Aspetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Linea stepper | Solida 2px border | Sfumata 3px gradient | Tratteggiata 1px glow |
| Fase completed | check cerchio verde | check + micro-confetti (una volta) | check + glow verde |
| Fase current | Cerchio + ring pulse | Cerchio + bounce subtle | Cerchio + glow pulse neon |
| Fase locked | Grigio + lucchetto | Grigio + opacita' 0.4 | Grigio + bordo tratteggiato |
| Animazione avanzamento | Fade 200ms | Linea "scorre" 400ms spring | Glow "viaggia" lungo la linea 300ms |

### File

```
NUOVI:
  lib/workflow-engine.ts
  lib/workflows/projectWorkflow.ts
  lib/workflows/taskWorkflow.ts
  lib/workflows/documentWorkflow.ts
  lib/workflows/userInputWorkflow.ts
  components/common/WorkflowStepper.tsx
  components/common/PhaseValidationPanel.tsx
  components/common/NextActionSuggestion.tsx

RIMOSSI (sostituiti da WorkflowStepper):
  components/domain/projects/MilestoneWorkflowStepper.tsx
  components/domain/projects/MilestoneValidationPanel.tsx
  components/domain/tasks/TaskStatusStepper.tsx
  components/domain/documents/DocumentStatusStepper.tsx

MODIFICATI:
  pages/projects/ProjectDetailPage.tsx
  pages/tasks/TaskDetailPage.tsx
  pages/documents/DocumentDetailPage.tsx
  pages/inputs/UserInputDetailPage.tsx
  lib/radial-actions.ts
```

---

## 5. Role-Aware Actions

### 3 livelli di autorizzazione

**Livello 1 — Ruolo sistema:** `admin`, `direzione`, `dipendente`, `guest`
**Livello 2 — Ruolo progetto:** `owner`, `manager`, `member`, `viewer`
**Livello 3 — Contesto entita':** creatore, assegnatario, responsabile

### Permission Engine

```tsx
interface PermissionContext {
  user: { id: string; role: SystemRole }
  projectRole?: ProjectRole
  entity?: {
    type: Domain
    assigneeId?: string
    creatorId?: string
    responsibleId?: string
  }
}

interface ResolvedPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAdvancePhase: boolean
  canBlock: boolean
  canAssign: boolean
  canLogTime: boolean
  canExport: boolean
  canManageTeam: boolean
  canEvaluate: boolean     // richieste
  canConvert: boolean      // richieste
  canApprove: boolean      // documenti
}
```

### Matrice completa

| Azione | Admin | Direzione | Dipendente (creatore) | Dipendente (assegnatario) | Dipendente (altri) | Guest |
|--------|-------|-----------|----------------------|--------------------------|-------------------|-------|
| Visualizza progetto | check | check | check | check | check | check |
| Crea progetto | check | check | — | — | config | config |
| Modifica progetto | check | check | check | x | config | x |
| Elimina progetto | check | config | check | x | x | x |
| Avanza fase progetto | check | check | check | x | x | x |
| Gestisci team progetto | check | check (owner/manager) | check | x | x | x |
| Crea task | check | check | check (suo progetto) | x | config | x |
| Modifica task | check | check | check | check | config | x |
| Avanza fase task | check | check | check | check | x | x |
| Blocca task | check | check | check | check | x | x |
| Elimina task | check | config | check | x | x | x |
| Log ore | check | check | check (proprie) | check (proprie) | check (proprie) | x |
| Crea rischio | check | check | check (suo progetto) | x | config | x |
| Modifica rischio | check | check | check | x | config | x |
| Upload documento | check | check | check | check | check | x |
| Elimina documento | check | check | check (se creatore) | x | x | x |
| Approva documento | check | check | x | x | x | x |
| Crea richiesta | check | check | check | check | check | x |
| Visualizza richieste (tutte) | check | check | x | x | x | x |
| Visualizza richieste (proprie) | check | check | check | check | check | x |
| Modifica richiesta | check | check | check (creatore, solo fase Nuova) | x | x | x |
| Valuta/Accetta/Rifiuta richiesta | check | check | x | x | x | x |
| Converti richiesta | check | check | x | x | x | x |
| Gestisci utenti | check | x | x | x | x | x |
| Vedi analytics | check | check | solo propri | solo propri | x | x |
| Esporta dati | check | check | config | config | config | x |

**Legenda**: check = sempre permesso, x = mai permesso, config = configurabile da admin (vedi sezione 6)

### Hook usePermissions

```tsx
function usePermissions(domain?: Domain, entity?: EntityRef): ResolvedPermissions
```

1. Legge utente dal TanStack Query auth hook
2. Legge ruolo progetto dal PageContext
3. Carica policies da cache TanStack Query
4. Chiama `resolvePermissions()` con contesto completo
5. Restituisce permessi memoizzati

### Integrazione

- **Radial Menu**: filtra azioni per `permission` field
- **WorkflowStepper**: bottone avanzamento se `canAdvancePhase`
- **EntityDetail**: headerActions condizionate (`canEdit`, `canDelete`)
- **EntityList**: `createHref` se `canCreate`, `rowActions` filtrate
- **Sidebar**: sezioni nascoste per ruolo

### Feedback visivo

1. Azioni strutturali (sidebar, bottone Nuovo, tab) → **nascoste** se non permesse
2. Azioni su entita' specifiche → **disabilitate** con tooltip "Permessi insufficienti"
3. Mai azioni cliccabili che rispondono 403

### File

```
NUOVI:
  lib/permissions.ts
  hooks/ui/usePermissions.ts

MODIFICATI:
  lib/radial-actions.ts
  components/common/EntityDetail.tsx
  components/common/EntityList.tsx
  components/common/EntityForm.tsx
  components/common/WorkflowStepper.tsx
  components/layout/Sidebar.tsx
  components/layout/Header.tsx
```

---

## 6. Permission Management System (Admin UI)

### Concetto

L'admin configura i permessi per ogni combinazione **ruolo x dominio** da una tab dedicata nell'AdminConfigPage. I permessi sono salvati in DB e caricati all'avvio. Le regole contestuali (creatore, assegnatario) restano automatiche.

### Modello dati

```prisma
model PermissionPolicy {
  id        String   @id @default(uuid())
  role      String   // "admin" | "direzione" | "dipendente" | "guest"
  domain    String   // "project" | "task" | "risk" | "document" | "input" | "time_entry" | "user" | "analytics"
  action    String   // "view" | "create" | "edit" | "delete" | "advance_phase" | "block" | "assign" | "export" | "manage_team" | "approve" | "evaluate" | "convert"
  allowed   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([role, domain, action])
}
```

~192 righe totali (8 domini x ~6 azioni x 4 ruoli).

### Azioni per dominio

| Dominio | Azioni configurabili |
|---------|---------------------|
| project | view, create, edit, delete, advance_phase, export, manage_team |
| task | view, create, edit, delete, advance_phase, block, assign, export |
| risk | view, create, edit, delete, export |
| document | view, create, edit, delete, approve, export |
| input | view, create, edit, delete, evaluate, convert |
| time_entry | view, create, edit, delete, export |
| user | view, create, edit, delete |
| analytics | view, export |

### Regole automatiche (non configurabili)

| Regola | Logica | Motivo |
|--------|--------|--------|
| Creatore = full access | `entity.creatorId === user.id` → canEdit, canDelete, canAdvancePhase | Controllo su cio' che si crea |
| Assegnatario = operativita' | `entity.assigneeId === user.id` → canEdit, canAdvancePhase, canBlock | Chi lavora deve poter agire |
| Admin = override | Ruolo admin ha sempre tutti i permessi | Admin non si blocca fuori |
| Time entry = solo proprie | Non-privilegiato vede/modifica solo proprie ore | Privacy dati lavorativi |
| Richiesta in fase Nuova | Creatore puo' modificare/eliminare solo in fase Nuova | Dopo valutazione, gestita dalla direzione |

Visualizzate nell'UI come righe grigie non modificabili con tooltip.

### UI Admin — Tab "Autorizzazioni"

```
Configurazione > Autorizzazioni

Ruolo: [Dipendente v]     [Confronta ruoli]  [Ripristina default]

┌─ Progetti (icona FolderKanban, colore blu) ──────────────────┐
│  [x] Visualizza  [ ] Crea  [ ] Modifica  [ ] Elimina        │
│  [ ] Avanza fase [ ] Esporta  [ ] Gestisci team              │
│  info Il creatore ha sempre accesso completo ai propri       │
└──────────────────────────────────────────────────────────────┘

┌─ Task (icona CheckSquare, colore blu) ───────────────────────┐
│  [x] Visualizza  [ ] Crea  [x] Modifica  [ ] Elimina        │
│  [x] Avanza fase [x] Blocca  [ ] Assegna  [ ] Esporta       │
│  info L'assegnatario puo' sempre modificare e avanzare fase  │
└──────────────────────────────────────────────────────────────┘

┌─ Richieste (icona MessageSquarePlus, colore amber) ──────────┐
│  [x] Visualizza  [x] Crea  [ ] Modifica  [ ] Elimina        │
│  [ ] Valuta  [ ] Converti                                    │
│  info Il creatore puo' modificare/eliminare solo in fase     │
│      Nuova                                                    │
└──────────────────────────────────────────────────────────────┘

... (Rischi, Documenti, Time Tracking, Utenti, Analytics)

                                      [Annulla]  [Salva modifiche]
```

**Elementi UI:**
- Selettore ruolo: `Select` shadcn/ui
- Sezione dominio: `Card` collapsabile con icona + colore Context Color System
- Checkbox azione: `Checkbox` shadcn/ui
- Regola automatica: `Alert` info, non modificabile
- Admin override: tutte checked + disabled
- Confronta ruoli: Dialog modale con tabella comparativa tutti i ruoli
- Ripristina default: AlertDialog conferma → POST /reset
- Salva: Button primary con loading → PUT batch

### Vista "Confronta ruoli"

Dialog con matrice completa:

```
Confronto Autorizzazioni

Progetti         Admin  Direzione  Dipendente  Guest
Visualizza        [x]     [x]        [x]        [x]
Crea              [x]     [x]        [ ]        [ ]
Modifica          [x]     [x]        [ ]        [ ]
Elimina           [x]     [ ]        [ ]        [ ]
...

Legenda: [x] Sempre  [~] Configurato  [ ] Negato  [=] Automatico
```

### API Backend

```
GET  /api/permissions/policies
  → { success: true, data: PermissionPolicy[] }
  → Auth: admin only

PUT  /api/permissions/policies
  → Body: { policies: { role, domain, action, allowed }[] }
  → Upsert batch
  → Auth: admin only
  → Validazione: non puo' disabilitare permessi admin

POST /api/permissions/policies/reset
  → Ripristina default dalla seed
  → Auth: admin only
```

### Integrazione con Permission Engine

```tsx
function resolvePermissions(ctx: PermissionContext): ResolvedPermissions {
  // 1. Carica policies da cache TanStack Query
  const policies = getPoliciesFromCache()

  // 2. Risolvi permessi base da policies DB
  const basePerms = resolveFromPolicies(policies, ctx.user.role, ctx.domain)

  // 3. Override automatici (non configurabili)
  if (ctx.user.role === "admin") return ALL_PERMISSIONS

  if (ctx.entity?.creatorId === ctx.user.id) {
    basePerms.canEdit = true
    basePerms.canDelete = true
    basePerms.canAdvancePhase = true
  }

  if (ctx.entity?.assigneeId === ctx.user.id) {
    basePerms.canEdit = true
    basePerms.canAdvancePhase = true
    basePerms.canBlock = true
  }

  return basePerms
}
```

### TanStack Query hooks

```tsx
// Cache lungo — policies cambiano raramente
usePermissionPoliciesQuery()    // staleTime: 5min, gcTime: 30min
useUpdatePolicies()             // mutation + invalidation + toast
useResetPolicies()              // mutation + invalidation + toast
```

### Audit trail

Ogni modifica loggata: `admin@projectpulse — Dipendente > Progetti > Crea: OFF → ON`

### File

```
NUOVI:
  server/src/schemas/permissionSchemas.ts
  server/src/services/permissionService.ts
  server/src/controllers/permissionController.ts
  server/src/routes/permissionRoutes.ts
  client/src/hooks/api/usePermissionPolicies.ts
  client/src/pages/admin/tabs/PermissionsTab.tsx
  client/src/pages/admin/tabs/PermissionsCompareDialog.tsx

MODIFICATI:
  server/prisma/schema.prisma (model PermissionPolicy)
  server/src/app.ts (mount permission routes)
  server/prisma/seed.ts (seed default policies)
  client/src/lib/permissions.ts (legge da cache)
  client/src/hooks/ui/usePermissions.ts (usa policies TanStack Query)
  client/src/pages/admin/AdminConfigPage.tsx (aggiunge tab)
```

---

## Riepilogo file totali

### Nuovi (~30 file)

```
client/src/
├── components/common/
│   ├── ProgressRing.tsx
│   ├── StatusDistribution.tsx
│   ├── TrendSparkline.tsx
│   ├── ProgressSummary.tsx
│   ├── WorkflowStepper.tsx
│   ├── PhaseValidationPanel.tsx
│   └── NextActionSuggestion.tsx
├── components/features/RadialMenu/
│   ├── RadialMenu.tsx
│   ├── RadialMenuItem.tsx
│   ├── RadialSubMenu.tsx
│   ├── useRadialMenu.ts
│   └── index.ts
├── hooks/ui/
│   ├── usePageContext.ts
│   └── usePermissions.ts
├── hooks/api/
│   └── usePermissionPolicies.ts
├── lib/
│   ├── permissions.ts
│   ├── radial-actions.ts
│   ├── theme-config.ts
│   ├── workflow-engine.ts
│   └── workflows/
│       ├── projectWorkflow.ts
│       ├── taskWorkflow.ts
│       ├── documentWorkflow.ts
│       └── userInputWorkflow.ts
├── pages/admin/tabs/
│   ├── PermissionsTab.tsx
│   └── PermissionsCompareDialog.tsx

server/src/
├── schemas/permissionSchemas.ts
├── services/permissionService.ts
├── controllers/permissionController.ts
└── routes/permissionRoutes.ts
```

### Modificati (~25 file)

```
client/src/
├── components/layout/AppShell.tsx
├── components/layout/Header.tsx
├── components/layout/Sidebar.tsx
├── components/common/Breadcrumbs.tsx
├── components/common/EntityDetail.tsx
├── components/common/EntityList.tsx
├── components/common/EntityForm.tsx
├── lib/constants.ts
├── stores/themeStore.ts
├── styles/globals.css
├── pages/ (tutte le ~28 pagine per usePageContext)
├── pages/home/ManagementDashboard.tsx
├── pages/analytics/AnalyticsPage.tsx
├── pages/projects/ProjectDetailPage.tsx
├── pages/tasks/TaskDetailPage.tsx
├── pages/documents/DocumentDetailPage.tsx
├── pages/inputs/UserInputDetailPage.tsx
├── pages/admin/AdminConfigPage.tsx

server/
├── prisma/schema.prisma
├── prisma/seed.ts
├── src/app.ts
```

### Rimossi (4 file, sostituiti da WorkflowStepper)

```
client/src/components/domain/projects/MilestoneWorkflowStepper.tsx
client/src/components/domain/projects/MilestoneValidationPanel.tsx
client/src/components/domain/tasks/TaskStatusStepper.tsx
client/src/components/domain/documents/DocumentStatusStepper.tsx
```
