# UX Overhaul — Foundation First Design

**Data**: 2026-03-13
**Branch**: `feature/ux-redesign-jarvis`
**Approccio**: Foundation First (Fase 1: mattoni condivisi → Fase 2: applicazione pagine)

---

## Problemi Identificati

1. **Informazioni frammentate e dispersive** — dati ricchissimi nel backend (30 servizi, 4 servizi centrali) sfruttati solo parzialmente dal frontend
2. **Difficoltà a individuare elementi critici** — nessun colpo d'occhio su problemi, scadenze, blocchi
3. **Mancanza di controllo live** — nessun feed real-time, notifiche isolate, tag non visibili
4. **Pagine non coordinate** — pattern visivi inconsistenti, KPI in alcune pagine sì altre no, sidebar in alcune sì altre no
5. **Tab e contenuti mancanti** — Note placeholder, nessun tab Budget/Team/Versioni/Dipendenze, UserInput scheletrico, nessun UserDetailPage
6. **Differenziazione ruoli insufficiente** — stesse pagine per tutti ma filtro dati non coerente
7. **Temi senza personalità** — solo differenza cosmetica (colori/radius), nessun effetto distinto

---

## Decisioni di Design

| Decisione | Scelta | Alternativa scartata |
|-----------|--------|---------------------|
| Vista per ruolo | A: Stesse pagine, contenuto filtrato per ruolo | Dashboard diverse per ruolo / navigazione separata |
| Differenziazione temi | B: Cosmetico + effetti distinti (hover, animazioni, glow) | Solo cosmetico / esperienza completamente diversa per tema |
| Approccio implementativo | B: Foundation First (mattoni → applicazione) | Page-by-page polish / Big bang redesign |
| Scope dati admin/dipendente | Record creati OR assegnati OR taggati | Solo assegnati / tutto |
| Scope dati direzione | Tutti i record | Filtrato |
| Preferenze tema | Persistite su backend (User model) | Solo localStorage |

---

## 1. Matrice Permessi e Scope Dati

### Scope per ruolo

| Ruolo | Scope liste/homepage | Azioni |
|-------|---------------------|--------|
| **Direzione** | Tutti i record | Sola lettura panoramica, no modifiche operative (vedi matrice sotto) |
| **Admin** | Record creati OR assegnati OR taggati dall'utente | Come dipendente + gestione utenti, config, automazioni |
| **Dipendente** | Record creati OR assegnati OR taggati dall'utente | Azioni operative limitate (vedi matrice sotto) |

### Filtro `scope=mine` (backend)

Per admin e dipendente, tutte le liste applicano un filtro automatico server-side basato sul ruolo dell'utente autenticato (nessun query param, il backend lo applica automaticamente):

```sql
WHERE (
  createdById = :userId
  OR assigneeId = :userId
  OR id IN (SELECT entityId FROM entity_tags et JOIN tags t ON et.tagId = t.id WHERE et.createdById = :userId)
)
```

**Criteri combinati in OR** — basta uno per vedere il record:
1. `createdById` — l'utente ha creato il record
2. `assigneeId` — l'utente è assegnato al record (per task/risk/userInput)
3. **Tag match** — l'utente ha applicato almeno un tag a quel record (entity_tags.createdById = userId). Non è basato sul "tipo" di tag ma su chi ha creato l'associazione tag-entità.

**La direzione bypassa questo filtro** e vede tutti i record.

**Servizi da modificare** (aggiungere filtro nella `getAll()`/lista):
- `projectService.getAll()` — filtro su createdById OR EXISTS in ProjectMember
- `taskService.getAll()` — filtro su createdById OR assigneeId OR tag match
- `riskService.getAll()` — filtro su createdById OR ownerId OR tag match
- `documentService.getAll()` — filtro su createdById OR tag match
- `userInputService.getAll()` — filtro su createdById OR assignedToId OR tag match

**Per i progetti** il criterio `assigneeId` non esiste direttamente — si usa l'appartenenza a `ProjectMember` come equivalente.

**Performance**: il tag match richiede una subquery sulla tabella entity_tags. Per dataset fino a ~10K record è accettabile. Se serve ottimizzare in futuro, si può aggiungere un campo denormalizzato.

### Matrice permessi UI (esistente, confermata)

| Azione | Admin | Direzione | Dipendente |
|--------|-------|-----------|------------|
| Crea/modifica progetto | ✅ | ✅ | ❌ |
| Elimina progetto | ✅ | ❌ | ❌ |
| Crea/modifica task | ✅ | ✅ | ❌ |
| Avanza fase task | ✅ | ✅ | ✅ (solo assegnati) |
| Log ore | ✅ | ✅ | ✅ (solo propri) |
| Gestisci rischi | ✅ | ✅ | 👁️ solo view |
| Gestisci utenti | ✅ | ❌ | ❌ |
| Report e statistiche | ✅ | ✅ | 👁️ solo propri |
| Documenti: upload | ✅ | ✅ | ✅ |
| Documenti: elimina | ✅ | ✅ | ❌ |

---

## 2. Template Components Potenziati (Fase 1)

### 2.1 EntityList — Page Contract obbligatorio

Ogni pagina lista DEVE fornire:

```
┌─────────────────────────────────────────────────┐
│ KpiStrip (obbligatorio — usa useStatsQuery)     │
├─────────────────────────────────────────────────┤
│ AlertStrip (condizionale — attention items)      │
├──────────────┬──────────────────────────────────┤
│ Filtri+Tag   │  Azioni bulk + Crea + ViewToggle │
├──────────────┴──────────────────────────────────┤
│ GroupHeader (status group, collapsible)          │
│ ┌─────────────────────────────────────────────┐ │
│ │ EntityRow: icona│nome│tag│badge│progress│   │ │
│ │   assignee│deadline│indicators│chevron      │ │
│ └─────────────────────────────────────────────┘ │
│ ... (stagger animation)                         │
├─────────────────────────────────────────────────┤
│ PaginationControls                              │
└─────────────────────────────────────────────────┘
```

- **KpiStrip**: sempre presente, alimentato da `useStatsQuery(domain)`. 4-5 card con trend.
- **AlertStrip**: attention items critici per il dominio corrente.
- **EntityRow**: componente riga ricca configurabile — nome leggibile (mai codice primario), status badge, progress bar inline, assignee avatar, deadline con urgenza, problem indicators, tag inline (max 3 + "+N").
- **GroupBy**: tutte le liste supportano raggruppamento per status con conteggio per gruppo.
- **Filtro tag**: multi-select tag in ListFilters.
- Se una pagina non fornisce KPI → è un bug.

### 2.2 EntityDetail — Page Contract obbligatorio

Ogni pagina dettaglio DEVE fornire:

```
┌─────────────────────────────────────────────────┐
│ Breadcrumbs (gerarchici: Home > Progetti > X)   │
├─────────────────────────────────────────────────┤
│ beforeContent (stepper workflow/fasi)            │
├─────────────────────────────────────────────────┤
│ Hero: titolo + badge + tag + azioni             │
│ KpiRow (obbligatorio — usa useSummaryQuery)     │
├────────────────────────────────┬────────────────┤
│ Tabs (contenuto principale)   │ Sidebar        │
│                                │ ┌────────────┐│
│ Tab 1: Panoramica             │ │ Meta info  ││
│ Tab 2: [dominio-specifico]    │ │ Related    ││
│ Tab N-1: Attività (timeline)  │ │ Tag        ││
│ Tab N: Note                   │ │ Actions    ││
│                                │ └────────────┘│
├────────────────────────────────┴────────────────┤
```

- **KpiRow**: sempre presente. Per project e task usa `useSummaryQuery(domain, id)` (endpoint esistente). Per risk e document, il KpiRow è calcolato inline dai dati già presenti nella query di dettaglio + `useRelatedQuery()` — non serve un nuovo endpoint summary. Vedi sezione 3 per i KPI specifici.
- **Tab "Attività"**: presente in TUTTE le entity detail, usa `useActivityQuery(entityType, entityId)` (hook: `hooks/api/useActivity.ts`).
- **Tab "Note"**: presente dove serve, usa `useNoteListQuery(entityType, entityId)`, `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()` da `hooks/api/useNotes.ts`.
- **Sidebar**: sempre presente con MetaRow + RelatedEntitiesSidebar + tag + SidebarActionSuggestion.
- **Tag**: visibili nella hero area, modificabili inline. Usa `useEntityTagsQuery(entityType, entityId)` per leggere, `useAssignTag()` per aggiungere, `useDeleteTag()` per rimuovere, da `hooks/api/useTags.ts`.
- Se una pagina non fornisce KPI o sidebar → è un bug.
- **Loading states**: ogni nuovo componente (NoteTab, ActivityTab, TagEditor, EntityRow) deve implementare skeleton loading e EmptyState con messaggio specifico (es. "Nessuna nota", "Nessuna attività", "Nessun tag").

### 2.3 Nuovi componenti condivisi (Fase 1)

| Componente | Scopo | Usato in |
|-----------|-------|----------|
| `EntityRow` | Riga ricca configurabile per dominio. Vedi props contract sotto. | Tutte le EntityList |
| `NoteTab` | Tab note riutilizzabile con CRUD. Hooks: `useNoteListQuery`, `useCreateNote`, `useUpdateNote`, `useDeleteNote`. Empty: "Nessuna nota". Loading: skeleton 3 righe. | RiskDetail, DocumentDetail, UserInputDetail |
| `ActivityTab` | Tab timeline da audit log. Hook: `useActivityQuery(entityType, entityId)`. Empty: "Nessuna attività". Loading: skeleton timeline. | Tutte le EntityDetail |
| `TagInline` | Tag badge inline (max 3 + overflow "+N"). Click su tag → filtra lista. | EntityRow, EntityDetail hero |
| `TagEditor` | Aggiunta/rimozione tag con autocomplete. Hooks: `useTagListQuery`, `useAddTagToEntity`. Empty: "Aggiungi tag...". | EntityDetail hero, form |
| `TagFilter` | Filtro multi-select tag per ListFilters. Hook: `useTagListQuery`. | ListFilters |

#### Props contract EntityRow

```typescript
interface EntityRowProps {
  // Obbligatori
  id: string
  name: string                    // Nome leggibile (mai codice)
  status: string                  // Chiave status per badge
  entityType: string              // 'project' | 'task' | 'risk' | 'document' | 'userInput'
  onClick: () => void             // Navigazione al dettaglio

  // Opzionali (domain-specific)
  code?: string                   // Codice secondario (muted, font piccolo)
  progress?: number               // 0-100, mostra ProgressGradient inline
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string }
  deadline?: string               // ISO date, mostra DeadlineCell con urgenza
  priority?: string               // low/medium/high/critical
  tags?: Array<{ id: string; name: string; color?: string }>
  indicators?: {                  // ProblemIndicators
    isBlocked?: boolean
    isOverdue?: boolean
    isAtRisk?: boolean
  }
  subtitle?: string               // Riga secondaria (es. nome progetto padre)
  extraBadges?: React.ReactNode   // Badge aggiuntivi (es. taskType, recurrence)
}
```

EntityRow interagisce con DataTable come custom row renderer. Le pagine passano `renderRow` a EntityList che usa EntityRow internamente. Le colonne DataTable rimangono per la vista tabella; EntityRow è per la vista lista.

---

## 3. Pagine Specifiche — Tab e Contenuti (Fase 2)

### 3.1 ProjectDetailPage

**Tab attuali**: Panoramica, Task, Rischi, Documenti, Attività

**Modifiche:**

| Tab | Azione | Contenuto | Source backend |
|-----|--------|-----------|---------------|
| **Panoramica** | Potenziare | Fase corrente stepper, prossima milestone con deadline, rischi critici inline, banner on_hold/cancelled | Già disponibile |
| **Task** | Mantenere | Milestone tree con nested tasks | Già implementato |
| **Budget** | Nuovo | Budget € totale vs speso, ore stimate vs loggate, costo per membro (ore × hourlyRate), progress bar, breakdown tabella | `useSummaryQuery('project', id)` per KPI totali + nuovo endpoint `GET /api/projects/:id/budget-breakdown` che ritorna dettaglio per membro (join TimeEntry → User.hourlyRate). Il campo `User.hourlyRate` è pianificato nella spec gap-analysis (non ancora migrato, va nella stessa migrazione dei campi User preferences). Il campo `Project.budget` è anch'esso pianificato nella spec gap-analysis. |
| **Team** | Nuovo | Membri con ruolo progetto, ore loggate, task assegnati, workload bar. Add/remove se privilegiato | `useProjectMembersQuery(id)` + stats |
| **Rischi** | Potenziare | Matrice rischio visuale (P × I grid), collegamento risk↔task visibile | `useProjectRiskMatrixQuery(id)` |
| **Documenti** | Mantenere | Grid documenti con upload zone | Già implementato |
| **Attività** | Potenziare | Timeline reale da audit log | `useActivityQuery('project', id)` |

**KpiRow**:
```
[Avanzamento %] [Task aperti/totali] [Ore loggate/stimate] [Budget usato %] [Rischi critici] [Team count]
```

### 3.2 TaskDetailPage

**Tab attuali**: Dettagli, Subtask, Log ore, Allegati, Attività, Checklist

**Modifiche:**

| Tab | Azione | Modifica | Source backend |
|-----|--------|----------|---------------|
| **Dettagli** | Potenziare | + Dipendenze (blocca/bloccato da) con link navigabili, + tag visibili e modificabili | `useCreateTaskDependency()`, `useDeleteTaskDependency()`, `useEntityTagsQuery('task', id)`, `useAssignTag()` |
| **Allegati** | Fix | Collegare handler upload al bottone, preview file, download | `useUploadAttachment()`, `useAttachmentListQuery()` |
| **Attività** | Potenziare | Timeline reale da audit log, non solo commenti | `useActivityQuery('task', id)` |

**KpiRow**:
```
[Completamento %] [Subtask done/total] [Ore loggate/stimate] [Ore rimanenti] [Assignee avatar]
```

### 3.3 RiskDetailPage

**Tab attuali**: Dettagli, Note (placeholder)

**Modifiche:**

| Tab | Azione | Contenuto | Source backend |
|-----|--------|-----------|---------------|
| **Dettagli** | Mantenere | Score P×I, descrizione, mitigation plan | Già implementato |
| **Note** | Implementare | Note reali con CRUD | `useNoteListQuery('risk', id)`, `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()` |
| **Task collegati** | Nuovo | Lista task mitigazione/verifica/correlati con linkType badge, aggiunta nuovi link | `useRelatedQuery('risk', id)` — il backend `relatedEntitiesService` supporta già `risk → tasks` via RiskTask join |
| **Attività** | Nuovo | Timeline audit log | `useActivityQuery('risk', id)` |

**KpiRow** (calcolato inline dalla query dettaglio + related, no endpoint summary dedicato):
```
[Score P×I colorato] [Task mitigazione done/total] [Giorni apertura] [Progetto link]
```

### 3.4 DocumentDetailPage

**Tab attuali**: Dettagli, Note (placeholder), Attività

**Modifiche:**

| Tab | Azione | Modifica | Source backend |
|-----|--------|----------|---------------|
| **Dettagli** | Mantenere | Descrizione, file, download | Già implementato |
| **Note** | Implementare | Note reali con CRUD | `useNoteListQuery('document', id)`, `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()` |
| **Versioni** | Nuovo | Storico versioni, download per versione, nota revisione, chi ha caricato | Nuovo hook `useDocumentVersionsQuery(documentId)` → `GET /api/documents/:id/versions` (endpoint da creare nel documentController, legge da DocumentVersion model) |
| **Attività** | Potenziare | Timeline reale da audit log | `useActivityQuery('document', id)` |

**KpiRow** (calcolato inline dalla query dettaglio, no endpoint summary dedicato):
```
[Stato workflow] [Versione corrente] [Giorni in stato corrente] [Progetto link]
```

### 3.5 UserInputListPage — Riscrittura completa

**KpiStrip**: richieste pendenti, in lavorazione, risolte questa settimana, tempo medio risposta

**Righe ricche**: titolo, autore con avatar, stato, data creazione, numero risposte, priorità

**Filtri**: stato, autore, data range, tag

**GroupBy**: stato (pending → processing → resolved)

### 3.6 UserInputDetailPage — Riscrittura completa

| Tab | Contenuto |
|-----|-----------|
| **Conversazione** | Thread cronologico richiesta + risposte (stile ticket). Ogni messaggio: avatar, nome, data, contenuto. Form risposta in fondo |
| **Dettagli** | Metadati: autore, assegnato a, stato, priorità, data creazione, data risoluzione |
| **Attività** | Timeline audit log |

**Flusso stati**: `pending → processing → resolved`

Al passaggio a `processing` → assegnazione operatore + notifica all'autore.
Al passaggio a `resolved` → notifica all'autore.

**Modello threading**: Il modello `UserInput` attuale ha solo `resolutionNotes` (stringa singola), non supporta risposte multiple. Serve un **nuovo modello `UserInputReply`**:

```prisma
model UserInputReply {
  id          String   @id @default(uuid())
  inputId     String
  userId      String
  content     String
  createdAt   DateTime @default(now())

  input       UserInput @relation(fields: [inputId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@index([inputId])
  @@map("user_input_replies")
}
```

**Da aggiungere alla migrazione** insieme ai campi User preferences e TagAssignment.createdById.

**Endpoint**: `POST /api/inputs/:id/reply` — crea UserInputReply + notifica all'autore.
**Hook**: nuovo `useReplyToInput()` in `hooks/api/useInputs.ts`.
Il tab Conversazione legge `useInputQuery(id)` che include le risposte via `include: { replies: { include: { user: true } } }`.

### 3.7 UserDetailPage — Nuovo

Pagina dettaglio utente (visibile a direzione/admin):

| Tab | Contenuto |
|-----|-----------|
| **Panoramica** | Info profilo, ruolo, dipartimento, hourlyRate, tema preferito, ultimo accesso |
| **Progetti** | Progetti assegnati con ruolo progetto, ore loggate per progetto |
| **Task** | Task assegnati con stato, deadline, ore |
| **Ore** | Storico time entries, grafico settimanale, totali |
| **Attività** | Timeline audit log dell'utente |

**Route**: `GET /admin/users/:id` → UserDetailPage (pagina standalone, separata da AdminConfigPage. Va aggiunta nel router React come nuova route sotto `/admin/users/:id`)

---

## 4. HomePage — Cruscotto Operativo Live

### Layout — Singola vista densa, no tab

```
┌─────────────────────────────────────────────────────────┐
│ Header: Buongiorno [Nome] · [data] · Settimana [N]     │
├─────────────────────────────────────────────────────────┤
│ KpiStrip (ruolo-filtrato):                              │
│ [Progetti attivi] [Task aperti] [Ore oggi ▶ timer]     │
│ [Rischi critici] [Scadenze 7gg] [Budget medio %]       │
├─────────────────────────────────────────────────────────┤
│ AlertStrip: ⚠ 2 task bloccati · 1 rischio critico ·   │
│             1 milestone a rischio   (click → naviga)    │
├──────────────────────────────┬──────────────────────────┤
│ COLONNA SX (60%)            │ COLONNA DX (40%)         │
│                              │                          │
│ ┌──────────────────────────┐ │ ┌────────────────────┐  │
│ │ I miei task oggi         │ │ │ Feed attività live │  │
│ │ (status dot, progetto,   │ │ │ (socket.io push)   │  │
│ │  deadline, quick status) │ │ │ aggiornamento      │  │
│ └──────────────────────────┘ │ │ real-time           │  │
│                              │ └────────────────────┘  │
│ ┌──────────────────────────┐ │                          │
│ │ Scadenze prossime 7gg   │ │ ┌────────────────────┐  │
│ │ (timeline compatta,      │ │ │ Notifiche recenti  │  │
│ │  deadline urgency color) │ │ │ (con mark as read, │  │
│ └──────────────────────────┘ │ │  link diretto)      │  │
│                              │ └────────────────────┘  │
│ ┌──────────────────────────┐ │                          │
│ │ Progetti — stato rapido  │ │ ┌────────────────────┐  │
│ │ (top 5-8, progress bar,  │ │ │ Tag frequenti      │  │
│ │  fase, rischi, budget)   │ │ │ (click → filtra)   │  │
│ └──────────────────────────┘ │ └────────────────────┘  │
├──────────────────────────────┴──────────────────────────┤
```

### Differenze per ruolo (stessa pagina, contenuto filtrato)

| Sezione | Direzione | Admin / Dipendente |
|---------|-----------|-------------------|
| KPI | Tutti i progetti, team intero | Solo propri (creati/assegnati/taggati) |
| Alert | Tutti gli alert critici | Solo propri task bloccati/scadenze |
| Task oggi | Task del team raggruppati per persona | Solo i miei task |
| Scadenze | Tutte le milestone + task critici | Solo le mie scadenze |
| Progetti | Tutti con overview | Solo progetti a cui sono assegnato/creatore/taggato |
| Feed | Attività globale | Attività dei miei progetti |
| Notifiche | Tutte | Solo le mie |

### Live updates

- Feed attività si aggiorna via Socket.io senza refresh
- KPI si invalidano su eventi socket (task completato → counter aggiornato)
- Timer ore sempre visibile nella KPI strip con link al task attivo

**Fallback disconnessione socket**: se la connessione socket cade, il feed mostra un indicatore discreto "Aggiornamento in pausa" (badge giallo). Il socket si riconnette automaticamente (già gestito da socket.io client). Al riconnect, si invalida la cache TanStack Query per aggiornare i dati. Non serve polling — il refetch automatico di TanStack Query (refetchOnWindowFocus) copre i gap brevi.

---

## 5. Sistema Notifiche Integrato

### 5.1 Badge contatore in Header

- Icona campanella con badge numerico (unread count)
- Aggiornamento real-time via socket evento `notification`
- Click apre NotificationPanel slide-over (già esiste)

### 5.2 Notifiche azionabili

- Ogni notifica ha link diretto all'entità
- Azioni inline: "Segna come letto", "Vai al [entità]", "Archivia"
- Raggruppamento per tipo/giorno

### 5.3 Notifiche nella HomePage

- Sezione "Notifiche recenti" nella colonna DX
- Ultime 5-8 non lette con azione diretta
- "Vedi tutte" apre NotificationPanel completo

### 5.4 Preferenze notifiche nel ProfilePage

- Toggle per tipo di notifica (task, rischi, documenti, automazioni)
- Toggle suono/desktop (già in notificationUiStore)
- Salvate su backend nel profilo utente

---

## 6. Sistema Tag Trasversale

### 6.1 Tag nelle righe lista

- Ogni EntityRow mostra tag dell'entità come mini-badge colorati
- Taglio a 3 tag visibili + "+N" overflow
- Click su tag → filtra lista per quel tag

### 6.2 Tag nei dettagli

- Sezione tag nella hero area (sotto titolo)
- Aggiunta/rimozione inline con autocomplete
- Componente `TagEditor` riutilizzabile

### 6.3 Filtro tag nelle liste

- Filtro multi-select tag in ListFilters
- Combinabile con altri filtri (status, assignee, date)

### 6.4 Tag nella HomePage

- Sezione "Tag frequenti" nella colonna DX
- Tag più usati dall'utente come chip cliccabili
- Click → naviga alla lista filtrata per quel tag
- **Dati**: calcolati client-side da `useTagListQuery()` + conteggio dalle entity_tags dell'utente. Se serve un endpoint dedicato per performance, aggiungere `GET /api/tags/frequent?limit=10` che conta le entity_tags.createdById = userId raggruppate per tagId. Per ora la versione client-side è sufficiente.

### 6.5 Scope `mine` e tag

- Per admin/dipendente: un record su cui l'utente ha applicato almeno un tag appare nel suo scope
- Il criterio è: entity_tags.createdById = userId (chi ha creato l'associazione tag-entità)
- NON è basato sul "tipo" o "nome" del tag, ma sull'azione di tagging dell'utente
- Terzo criterio del filtro scope: createdBy OR assigneeId OR tag association by user

---

## 7. Preferenze Utente su Backend

### Campi da aggiungere al modello User

| Campo | Tipo | Default | Note |
|-------|------|---------|------|
| `preferredTheme` | `String?` | `null` (→ office-classic) | Valori: `office-classic`, `asana-like`, `tech-hud` |
| `preferredMode` | `String?` | `null` (→ system) | Valori: `light`, `dark`, `system` |
| `notificationPreferences` | `Json?` | `null` | `{ sound, desktop, types: { task, risk, doc, automation } }` |

### Flusso sincronizzazione tema

1. **Login** → backend ritorna preferenze → se non null, themeStore si inizializza da backend; se null (primo login o utente esistente prima della migrazione), themeStore usa i valori da localStorage (se presenti) o i default (office-classic, system)
2. **Cambio tema UI** → themeStore aggiorna localmente (reattivo) + `PATCH /api/users/me/preferences` in background (fire-and-forget)
3. **Fallback** → se backend non risponde al PATCH, localStorage rimane valido. Il prossimo login sincronizzerà
4. **Utenti esistenti** → i 3 nuovi campi sono nullable, quindi nessuna migrazione dati necessaria. Primo cambio tema salva la preferenza

### Endpoint

- `PATCH /api/users/me/preferences` — body: `{ preferredTheme?, preferredMode?, notificationPreferences? }`
- Risposta login arricchita con `preferences: { theme, mode, notifications }`

---

## 8. Effetti Tema per Componente

I 3 temi condividono layout identico ma hanno personalità visiva diversa. Effetti gestiti da `THEME_EFFECTS` in `lib/theme-config.ts`, letti dai template tramite `useThemeConfig()`.

### Card / Righe lista

| Effetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Hover | `bg-muted/50` | `scale(1.01)` + `bg-accent/10` | `border-primary/30` + `shadow-[0_0_6px]` glow |
| Bordo | `border` solido | `border` leggero, radius 12px | `border` sottile, radius 8px |
| Ombra | `shadow-sm` | `shadow-md` soft | `shadow-[0_0_8px] shadow-primary/10` |
| Transizione | `ease 150ms` | `spring bounce 200ms` | `ease 250ms` |

### Badge / Chip

| Effetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Stile | Flat, bordo sottile | Sfondo pastello, rounded-full | Bordo glow, font monospace |
| Hover | Nessuno | Leggero scale | Glow pulse |

### Progress bar (ProgressGradient)

| Effetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Stile | Barra solida, angoli squadrati | Barra arrotondata, gradiente morbido | Barra con glow trail |
| Animazione | Nessuna | Ease-out 300ms | Pulse sottile sul bordo |

### KpiStrip card

| Effetto | Office Classic | Asana Like | Tech HUD |
|---------|---------------|------------|----------|
| Sfondo | `bg-card` flat | `bg-card` con gradiente leggero | `bg-card` con bordo glow contestuale |
| Trend arrow | Testo colorato | Testo + icona bounce | Testo + glow colore |

### Implementazione

Singolo oggetto `THEME_EFFECTS` in `lib/theme-config.ts`:

```typescript
export const THEME_EFFECTS = {
  'office-classic': {
    cardHover: 'hover:bg-muted/50 transition-colors duration-150',
    cardShadow: 'shadow-sm',
    badgeStyle: 'border',
    progressStyle: 'rounded-sm',
    kpiStyle: 'bg-card',
    transitionDuration: 150,
    transitionType: 'ease',
  },
  'asana-like': {
    cardHover: 'hover:scale-[1.01] hover:bg-accent/10 transition-all duration-200',
    cardShadow: 'shadow-md',
    badgeStyle: 'rounded-full bg-opacity-20',
    progressStyle: 'rounded-full',
    kpiStyle: 'bg-gradient-to-br from-card to-accent/5',
    transitionDuration: 200,
    transitionType: 'spring',
  },
  'tech-hud': {
    cardHover: 'hover:border-primary/30 hover:shadow-[0_0_6px] hover:shadow-primary/20 transition-all duration-250',
    cardShadow: 'shadow-[0_0_8px] shadow-primary/10',
    badgeStyle: 'border border-primary/20 font-mono',
    progressStyle: 'rounded shadow-[0_0_4px] shadow-primary/20',
    kpiStyle: 'bg-card border border-primary/10 shadow-[0_0_6px] shadow-primary/5',
    transitionDuration: 250,
    transitionType: 'ease',
  },
} as const
```

I template leggono `THEME_EFFECTS[currentTheme]` e applicano le classi. Nessuna logica condizionale sparsa nelle pagine.

---

## 9. Coordinamento Navigazione

### 9.1 Link inline ovunque

- Ogni menzione di entità (progetto in task, task in rischio, utente in log) è un link cliccabile
- Hover mostra `EntityPreviewTooltip` (già esiste, usa cache TanStack Query)

### 9.2 Breadcrumb gerarchici consistenti

```
Home > Progetti > Sistema Monitoraggio v2 > Task > Calibrazione sensori
```
- Sempre presenti, sempre navigabili
- Il progetto padre è sempre nel breadcrumb per task/rischio/documento collegati

### 9.3 Sidebar relazionale in tutti i dettagli

Sidebar destra mostra SEMPRE entità correlate:
- **Progetto** → milestone, rischi critici, documenti recenti, team
- **Task** → progetto padre, subtask, rischi collegati, allegati
- **Rischio** → progetto, task di mitigazione
- **Documento** → progetto, versioni
- **Utente** → progetti assegnati, task attivi

Click su qualsiasi item → navigazione diretta.

### 9.4 Pattern visivo uniforme — Regole

**Ogni pagina lista**: KpiStrip → AlertStrip → Filtri+azioni → Tabella raggruppata → Paginazione. Nessuna eccezione.

**Ogni pagina dettaglio**: Breadcrumb → Stepper (se ha stati) → Hero+KpiRow → Tab+Sidebar. Nessuna eccezione.

---

## 10. Riepilogo Modifiche

### Schema DB (migrazione)

| Modifica | Tipo |
|----------|------|
| `User.preferredTheme` | Nuovo campo `String?` |
| `User.preferredMode` | Nuovo campo `String?` |
| `User.notificationPreferences` | Nuovo campo `Json?` |
| `TagAssignment.createdById` | Nuovo campo `String` + FK a User | Necessario per il filtro scope=mine (chi ha assegnato il tag) |
| `UserInputReply` | Nuovo modello | id, inputId, userId, content, createdAt. Per il tab Conversazione in UserInputDetailPage |

### Backend

| Modifica | File |
|----------|------|
| Endpoint `PATCH /api/users/me/preferences` | userController, userService, userRoutes |
| Filtro `scope=mine` automatico su tutte le liste | projectService, taskService, riskService, documentService, userInputService |
| Login ritorna preferenze tema | authService, authController |
| Endpoint `GET /api/projects/:id/budget-breakdown` | projectController, statsService (o projectService) |
| Endpoint `GET /api/documents/:id/versions` | documentController, documentService |
| Verifica modello UserInput per risposte multiple | userInputService, schema Prisma (aggiungere UserInputReply se mancante) |
| Stats KPI: verificare che `getProjectStats`, `getTaskKpis`, `getRiskStats`, `getDocumentStats` filtrano per scope/ruolo | statsService (già parzialmente implementato, verificare) |

### Frontend — Fase 1: Fondamenta condivise

| Componente | Azione |
|-----------|--------|
| `EntityList` | Potenziare: KpiStrip obbligatorio, AlertStrip, righe ricche, tag inline, effetti tema |
| `EntityDetail` | Potenziare: KpiRow obbligatorio, sidebar sempre presente, tab Attività/Note standard, effetti tema |
| `EntityRow` | Nuovo: riga ricca configurabile per dominio |
| `NoteTab` | Nuovo: tab note riutilizzabile (CRUD) |
| `ActivityTab` | Nuovo: tab timeline riutilizzabile (audit log) |
| `TagInline` | Nuovo: tag badge inline per liste e dettagli |
| `TagEditor` | Nuovo: aggiunta/rimozione tag con autocomplete |
| `TagFilter` | Nuovo: filtro tag per ListFilters |
| `THEME_EFFECTS` | Nuovo: oggetto effetti tema in `lib/theme-config.ts` |
| `themeStore` | Potenziare: sync con backend al login/cambio |

### Frontend — Fase 2: Applicazione pagine

| Pagina | Modifiche principali |
|--------|---------------------|
| **HomePage** | Riscrittura: layout 2 colonne, feed live socket, KPI ruolo-filtrato, alert, scadenze, notifiche, tag frequenti |
| **ProjectDetailPage** | +Tab Budget, +Tab Team, KpiRow, sidebar potenziata, matrice rischi in tab Rischi |
| **TaskDetailPage** | Dipendenze in Dettagli, fix allegati upload, tag, KpiRow, timeline reale |
| **RiskDetailPage** | +Tab Task collegati, +Tab Attività, Note reali, KpiRow |
| **DocumentDetailPage** | +Tab Versioni, Note reali, timeline reale, KpiRow |
| **UserInputListPage** | Riscrittura completa — KPI, righe ricche, groupBy stato |
| **UserInputDetailPage** | Riscrittura completa — tab Conversazione/Dettagli/Attività |
| **UserDetailPage** | Nuovo — Panoramica, Progetti, Task, Ore, Attività |
| **ProfilePage** | +Preferenze tema/mode, +Preferenze notifiche |
| **Tutte le liste** | KpiStrip, tag, righe ricche, groupBy, filtro scope=mine, effetti tema |
| **Tutti i dettagli** | KpiRow, sidebar relazionale, tab Attività, tag, effetti tema, breadcrumb gerarchici |

---

## 11. Ordine di Implementazione

### Fase 1 — Fondamenta (~40%)

1. Schema DB: User preferences (migrazione)
2. Backend: endpoint preferences, scope=mine, login con preferenze
3. `THEME_EFFECTS` + potenziamento `useThemeConfig()`
4. `EntityRow` componente riga ricca
5. `NoteTab`, `ActivityTab` componenti tab riutilizzabili
6. `TagInline`, `TagEditor`, `TagFilter` sistema tag
7. Potenziamento `EntityList` (KpiStrip obbligatorio, AlertStrip, righe ricche, tag, effetti)
8. Potenziamento `EntityDetail` (KpiRow obbligatorio, sidebar sempre, tab standard, tag, effetti)
9. `themeStore` sync con backend

### Fase 2 — Applicazione pagine (~60%)

**Dipendenze**: tutti gli step di Fase 2 dipendono dal completamento di Fase 1. All'interno di Fase 2, le pagine sono indipendenti tra loro e possono essere implementate in qualsiasi ordine. L'ordine sotto è per priorità d'impatto, non per dipendenza tecnica.

1. **Tutte le liste: uniformazione pattern** (KpiStrip, tag, righe ricche, groupBy, scope) — applica i mattoni Fase 1 a ProjectList, TaskList, RiskList, DocumentList. Questo va fatto PRIMA delle singole pagine per garantire coerenza.
2. **Tutti i dettagli: uniformazione pattern** (KpiRow, sidebar, Attività, tag, breadcrumb) — applica i mattoni Fase 1 a tutti i dettagli esistenti.
3. HomePage riscrittura (cruscotto operativo live) — dipende da scope=mine funzionante
4. ProjectDetailPage (+Budget, +Team, potenziamenti) — dipende da endpoint budget-breakdown
5. TaskDetailPage (dipendenze, fix allegati, potenziamenti)
6. RiskDetailPage (+Task collegati, +Attività, Note reali)
7. DocumentDetailPage (+Versioni, Note reali, potenziamenti) — dipende da endpoint document versions
8. UserInputListPage (riscrittura completa)
9. UserInputDetailPage (riscrittura completa) — dipende da verifica modello risposte
10. UserDetailPage (nuova pagina + route)
11. ProfilePage (preferenze tema/notifiche)
12. Notifiche: badge Header, azionabili, preferenze
