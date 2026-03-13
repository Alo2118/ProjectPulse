# ProjectPulse — Mappa Completa dell'Applicazione

> Generato il 2026-02-27. Copre tutte le pagine, componenti, store, hook e route dell'app.

---

## Indice

- [Autenticazione](#autenticazione)
- [Dashboard](#dashboard)
- [Progetti](#progetti)
- [Task](#task)
- [Kanban](#kanban)
- [Calendario](#calendario)
- [Time Tracking](#time-tracking)
- [Documenti](#documenti)
- [Rischi](#rischi)
- [Segnalazioni (User Inputs)](#segnalazioni-user-inputs)
- [Utenti](#utenti)
- [Pianificazione](#pianificazione)
- [Analytics](#analytics)
- [Report Settimanale](#report-settimanale)
- [Notifiche](#notifiche)
- [Admin](#admin)
- [Audit](#audit)
- [Componenti Condivisi](#componenti-condivisi)
- [Stores](#stores-27-zustand)
- [Hooks](#hooks-13)
- [Routes](#routes-47)

---

## Autenticazione

### LoginPage — `pages/auth/LoginPage.tsx`

- Form email + password con validazione Zod
- Toggle visibilità password
- Inizializzazione tema al login
- Redirect a dashboard

### AcceptInvitationPage — `pages/auth/AcceptInvitationPage.tsx`

- Wizard 3 step: verifica token → registrazione → successo
- Creazione account guest da invito progetto
- Auto-redirect a login dopo 4s

---

## Dashboard

### DashboardPage — `pages/dashboard/DashboardPage.tsx`

**Layout direzione**: TrafficLight → Attention → DeliveryOutlook → TeamCapacity → ProjectHealth
**Layout dipendente**: FocusToday → Attention → RecentTasks

| Componente | Scopo |
|---|---|
| TrafficLightSection | 4 card semaforo (healthy/at_risk/critical/utilization) |
| AttentionSection | Alert auto-hiding per ruolo |
| FocusTodaySection | Focus giornaliero (task horizons + timer + progresso settimanale) |
| DeliveryOutlookSection | Previsioni consegna progetti (velocity-based) |
| TeamPerformanceSection | Capacità team con soglie 80%/100% |
| PeriodSelector | Toggle Settimana/Mese/3 Mesi |

---

## Progetti

### ProjectListPage — `pages/projects/ProjectListPage.tsx`

- Tabella con colonne ordinabili (Nome, Stato, Progresso, Scadenza)
- Filtri: ricerca, stato (8 opzioni), priorità
- Health dots animati (rosso/ambra/verde)
- Barre progresso con % completamento
- Indicatori scadenza overdue

### ProjectDetailPage — `pages/projects/ProjectDetailPage.tsx`

**Colonna sinistra**:

- Nome/descrizione progetto
- Card avanzamento (barra + conteggio task + ore)
- TaskTreeView (modo compact, skipProjectLevel)
- Sezione Membri Progetto (collapsible)
- Sezione Automazioni (collapsible)
- Activity Feed

**Sidebar destra (sticky)**:

- Info card: stato, priorità, owner, date, task totali, ore
- BudgetCard (ore lavorate/stimate, % utilizzo, sforamento)
- Note (collapsible, con conteggio)
- Allegati (collapsible, con conteggio)
- Quick links (Rischi, Documenti, Tempo, Gantt)

### ProjectFormPage — `pages/projects/ProjectFormPage.tsx`

- Selettore template (solo in creazione)
- Campi: nome, descrizione, stato, priorità, date, owner, budget
- React Hook Form + Zod validation
- FormPageShell (skeleton/not-found/unauthorized)
- FormActionBar (salva/elimina/annulla)
- Modale conferma eliminazione

---

## Task

### TaskListPage — `pages/tasks/TaskListPage.tsx`

**6 modalità vista**: List, Table, Kanban, Gantt, Calendar (lazy-loaded)

- Filtri: ricerca, stato, priorità, progetto, dipartimento
- Advanced Filter Builder (logica AND/OR, 8 tipi campo)
- Saved Views bar (salva/applica filtri)
- Export CSV
- Selezione multipla + azioni bulk (elimina, cambia stato)
- Toggle "Mostra tutti i task" (admin/direzione)
- Sezioni collassabili per stato (in_progress, todo, review, blocked, done, recurring)
- Stat pills cliccabili (filtro per stato)
- QuickAddTask inline

### TaskDetailPage — `pages/tasks/TaskDetailPage.tsx`

**Colonna sinistra**:

- Header: codice, titolo, tipo, priorità, edit/clone/delete
- Status Timeline / Workflow Stepper
- Descrizione
- Tab: Dettagli, Checklist, Custom Fields, Commenti, Allegati
- CommentSection con supporto @mention
- Activity Feed

**Sidebar destra (sticky)**:

- Workflow stepper visivo
- Metadata: stato, priorità, assegnatario, date, ore, livello rischio, parent task, subtask count
- Blockers (se presenti)
- Team members
- Tags (aggiungi/rimuovi)
- Timer start/stop
- Time entries

**Funzionalità chiave**: socket.io real-time, inline editing, checklist, custom fields, undo toast

### TaskFormPage — `pages/tasks/TaskFormPage.tsx`

- Selettore tipo task (milestone/task/subtask)
- Campi: titolo, descrizione, stato, priorità, progetto, parent task, assegnatario, date, ore stimate, dipartimento, tag, ricorrenza, custom fields
- FormPageShell + FormActionBar (sticky)

### TaskTableView — `pages/tasks/TaskTableView.tsx`

- Vista spreadsheet con 9+ colonne ordinabili
- Ordinamento multi-colonna (Shift+Click)
- Inline editing: stato, priorità, assegnatario, date, titolo
- Checkbox selezione multipla + select-all

### GanttInlineView — `pages/tasks/GanttInlineView.tsx`

- 4 livelli zoom (Giorno, Settimana, Mese, Anno)
- Navigazione timeline (Prev, Oggi, Next)
- Filtri progetto + assegnatario
- Linee dipendenza con frecce (4 tipi)
- Barre task con indicatore progresso

### CalendarInlineView — `pages/tasks/CalendarInlineView.tsx`

- Toggle Mese/Settimana
- Navigazione tra mesi/settimane
- Chip task colorati per stato
- Click per navigare al dettaglio

---

## Kanban

### KanbanBoardPage — `pages/kanban/KanbanBoardPage.tsx`

- 5 colonne stato: Todo, In Progress, Review, Blocked, Done (+ Recurring)
- **Drag & drop** per cambiare stato
- Filtri: progetto, priorità, assegnatario, toggle subtask
- Card task con: bordo priorità, titolo, progetto, ore, assegnatario, scadenza
- QuickAddTask per colonna
- Timer start/stop per card
- Modale motivo blocco (quando drag su Blocked)
- Navigazione keyboard (frecce + Enter)

---

## Calendario

### CalendarPage — `pages/calendar/CalendarPage.tsx`

- Dual mode: Task / Time Entries
- Vista Mese / Settimana
- Filtri: progetto, assegnatario (admin/direzione)
- Chip colorati per stato/tipo
- Click task → navigazione a dettaglio

---

## Time Tracking

### TimeTrackingPage — `pages/time-tracking/TimeTrackingPage.tsx`

**Due modalità**: Lista / Timesheet

**Vista Lista**:

- Banner timer attivo (se in esecuzione)
- Quick start timer: cerca task + avvia
- Filtri: progetto, utente (admin), range date
- Card riassunto: ore totali, conteggio entry, conteggio progetti
- Entries raggruppate per data (Oggi/Ieri/[data])
- Per entry: progetto, task, descrizione, range orario, durata, edit/delete

**Vista Timesheet**:

- Navigazione settimanale (prev/oggi/next)
- Griglia: righe = task (raggruppati per progetto), colonne = Lun–Ven + Totale
- Celle colorate (verde ≥ target, ambra parziale, grigio 0)
- Footer con target giornaliero e progresso settimanale

### TeamTimePage — `pages/time-tracking/TeamTimePage.tsx`

- 5 card riassunto: ore totali, utenti attivi, progetti, entries, media per utente
- Filtri: date, progetto, utente
- Sezione **Per Utente**: righe espandibili con avatar, progress bar, top 10 entries
- Sezione **Per Progetto**: righe con nome, ore totali, % del totale
- Export CSV

### TimesheetView — `pages/time-tracking/TimesheetView.tsx`

- Griglia settimanale Lun–Ven
- Cell editing (click per loggare ore)
- Totali colonna + riga
- Highlight colonna "oggi"

---

## Documenti

### DocumentListPage — `pages/documents/DocumentListPage.tsx`

- Filtri: ricerca, progetto, stato (draft/review/approved/obsolete), tipo (5 opzioni)
- Tabella: Codice, Titolo, Tipo, Versione, Stato, Dimensione, Date
- Badge stato/tipo colorati
- Link download
- Paginazione

### DocumentDetailPage — `pages/documents/DocumentDetailPage.tsx`

- Header: titolo + codice + versione
- Badge tipo e stato
- Descrizione, preview file, versioning
- Sidebar: metadata, transizioni stato, upload file, review schedule
- Delete confirmation

### DocumentFormPage — `pages/documents/DocumentFormPage.tsx`

- Campi: progetto, titolo, descrizione, tipo documento, review due date, frequenza review
- Drag & drop file upload (max 10MB)
- Validazione tipo file
- FormPageShell + FormActionBar

---

## Rischi

### RiskListPage — `pages/risks/RiskListPage.tsx`

- Toggle vista: **Lista** / **Matrice** (heatmap 3×3)
- Filtri: ricerca, progetto, stato, categoria
- Tabella: Titolo, Stato, Categoria, Probabilità, Impatto, Livello Rischio
- Calcolo livello rischio (probabilità × impatto, scala 1–9)
- Colori: rosso (alto), ambra (medio), verde (basso)
- Vista matrice: click su cella per filtrare

### RiskDetailPage — `pages/risks/RiskDetailPage.tsx`

- Badge livello rischio calcolato
- Badge categoria
- Matrice probabilità/impatto
- Piano mitigazione
- Sidebar: metadata, transizioni stato, owner, progetto

### RiskFormPage — `pages/risks/RiskFormPage.tsx`

- Campi: progetto, titolo, descrizione, categoria (5), probabilità, impatto, stato, owner, piano mitigazione
- Calcolo livello rischio in tempo reale
- FormPageShell + FormActionBar

---

## Segnalazioni (User Inputs)

### UserInputListPage — `pages/inputs/UserInputListPage.tsx`

- Filtri: ricerca, stato, categoria (bug/feature/improvement/question/other), priorità
- Toggle "Le mie segnalazioni"
- Tabella con icone categoria colorate
- Paginazione

### UserInputDetailPage — `pages/inputs/UserInputDetailPage.tsx`

- Header: titolo + codice + stato
- Descrizione, categoria, priorità, autore, date
- Azioni: Avvia Lavorazione, Prendi in Carico, Rifiuta (con motivo), Converti in Task, Converti in Progetto, Elimina
- **ConvertToTaskModal**: selettore progetto/assegnatario/priorità/scadenza/ore
- **ConvertToProjectModal**: nome/descrizione/owner/priorità

---

## Utenti

### UserListPage — `pages/users/UserListPage.tsx`

- Filtri: ricerca (nome/email), ruolo, stato attivo/inattivo
- Card utente: avatar, nome, email, badge ruolo, stato, edit/delete
- ListPageHeader + ListPageSkeleton
- Paginazione

### UserFormPage — `pages/users/UserFormPage.tsx`

- Campi: nome, cognome, email, password, ruolo (admin/direzione/dipendente/guest), stato attivo
- Toggle visibilità password
- FormPageShell + FormActionBar

---

## Pianificazione

### PlanningDashboardPage — `pages/planning/PlanningDashboardPage.tsx`

- EstimationMetricsCard (per utente, per tipo, globale)
- TeamCapacityChart (breakdown settimanale con soglie 80%/100%)
- Selettore progetto + BottleneckAlerts
- Pulsante "Pianifica Progetto" → wizard

### PlanningWizardPage — `pages/planning/PlanningWizardPage.tsx`

**3 step**:

1. Selezione Progetto + Template
2. PlanTreeEditor (aggiungi/modifica/rimuovi task) + "Suggerisci Timeline" + PlanTimelinePreview
3. PlanSummaryPanel (riepilogo, capacità team, durata) + Conferma

---

## Analytics

### AnalyticsPage — `pages/analytics/AnalyticsPage.tsx`

- 5 KPI card: Progetti attivi, % completamento task, Task in corso, Ore totali, Rischi aperti
- Grafici Recharts: Task per stato (bar), Ore per progetto (pie), Trend completamento (line), Top contributor
- BudgetOverviewSection
- DeliveryOutlookSection
- TeamPerformanceSection
- PeriodSelector (settimana/mese/3 mesi)

---

## Report Settimanale

### WeeklyReportPage — `pages/reports/WeeklyReportPage.tsx`

- Selettore settimana + generazione report
- Card salute progetti (stato, %, bloccati)
- Milestone raggruppate per progetto (stato, progress bar, task breakdown, giorni rimanenti)
- TaskTreeView gerarchico
- Metriche chiave: task completati, in corso, bloccati, ore, progetti a rischio

---

## Notifiche

### NotificationCenterPage — `pages/notifications/NotificationCenterPage.tsx`

- Badge conteggio non lette
- Azioni bulk: "Segna tutte come lette" + "Elimina lette"
- Filtri: ricerca, tipo notifica, stato (tutte/non lette/lette)
- Card notifica: dot non letto, icona tipo, titolo, tempo relativo, messaggio, badge tipo
- Click → naviga all'entità correlata
- Preferenze: toggle notifiche desktop + toggle suono
- 18 tipi notifica supportati

---

## Admin

### CustomFieldsPage — `pages/admin/CustomFieldsPage.tsx`

- Tabella definizioni: Nome, Tipo (text/number/dropdown/date/checkbox), Progetto, Obbligatorio, Stato
- Modale crea/modifica: nome, tipo, opzioni (se dropdown), progetto, obbligatorio, posizione
- Toggle attivo/inattivo

### ImportPage — `pages/admin/ImportPage.tsx`

**Wizard 4 step**: Upload CSV → Mappa Colonne (CsvFieldMapper) → Impostazioni → Risultati

- Drag & drop (solo CSV, max 5MB)
- Auto-detection mapping colonne
- Preview dati
- Report errori per riga

### WorkflowEditorPage — `pages/admin/WorkflowEditorPage.tsx`

- Lista template workflow
- Editor: definizione stati (label, key, colore), definizione transizioni (da → a)
- Template sistema vs custom
- Diagramma flusso visuale

### AutomationListPage — `pages/admin/AutomationListPage.tsx`

- Tabella regole con filtro per dominio (Task/Risk/Document/Project)
- Toggle attivo/inattivo per regola
- Sezione Raccomandazioni (pattern rilevati + impatto)
- Sezione Packages (base, risk_management, document_compliance, strict_deadlines)

### AutomationEditorPage — `pages/admin/AutomationEditorPage.tsx`

**Wizard 5 step**: Dominio → Trigger → Condizioni (AND/OR) → Azioni → Impostazioni (cooldown, nome)

---

## Audit

### AuditTrailPage — `pages/audit/AuditTrailPage.tsx`

- Filtri: tipo entità (11), azione (6), utente, range date
- Tabella: Data/Ora, Utente (avatar), Azione (badge), Tipo Entità, ID, Dettagli (espandibile)
- DataDiff: vecchi vs nuovi valori (rosso/verde)
- 50 entry per pagina

---

## Componenti Condivisi

### Layout

| Componente | File | Scopo |
|---|---|---|
| DashboardLayout | `components/layout/DashboardLayout.tsx` | Wrapper principale: sidebar + header + socket.io + shortcuts |
| Header | `components/layout/Header.tsx` | Breadcrumb auto, timer attivo, toggle tema |
| Sidebar | `components/layout/Sidebar.tsx` | Navigazione con gruppi collassabili, role-based, badge notifiche |
| AuthLayout | `components/layout/AuthLayout.tsx` | Wrapper pagine auth, redirect se autenticato |

### Common (riutilizzabili)

| Componente | File | Scopo |
|---|---|---|
| DetailPageHeader | `components/common/DetailPageHeader.tsx` | Header pagine dettaglio (back, titolo, azioni) |
| FormPageShell | `components/common/FormPageShell.tsx` | Wrapper form: skeleton/not-found/unauthorized |
| FormActionBar | `components/common/FormActionBar.tsx` | Pulsanti salva/elimina/annulla (opz. sticky) |
| ListPageHeader | `components/common/ListPageHeader.tsx` | Header liste: titolo, sottotitolo, pulsante crea |
| ListPageSkeleton | `components/common/ListPageSkeleton.tsx` | Skeleton loading per liste |
| TabSection | `components/common/TabSection.tsx` | Tab con icone, badge conteggio, contenuto lazy |
| CollapsibleSection | `components/common/CollapsibleSection.tsx` | Sezione espandibile/collassabile |
| InfoCard | `components/common/InfoCard.tsx` | Card wrapper con padding opzionale |
| MetaRow | `components/common/MetaRow.tsx` | Riga metadata con icone e link |
| QuickLinksGrid | `components/common/QuickLinksGrid.tsx` | Griglia link rapidi (2/3/4 colonne) |
| EmptyState | `components/common/EmptyState.tsx` | Placeholder per liste vuote |
| Pagination | `components/common/Pagination.tsx` | Controlli paginazione |
| MentionTextarea | `components/common/MentionTextarea.tsx` | Textarea con @mention autocomplete |
| AttachmentSection | `components/common/AttachmentSection.tsx` | Upload file drag & drop + gestione allegati |
| NoteSection | `components/common/NoteSection.tsx` | Note con @mention e toggle "interna" |
| ActivityFeed | `components/common/ActivityFeed.tsx` | Timeline audit log per entità |
| ConfirmDialog | `components/common/ConfirmDialog.tsx` | Modale conferma (danger/warning/info) |
| Breadcrumb | `components/common/Breadcrumb.tsx` | Breadcrumb manuale |

### UI Primitives

| Componente | File | Scopo |
|---|---|---|
| BaseModal | `components/ui/BaseModal.tsx` | Portal + focus trap + escape + animazione |
| FormField | `components/ui/FormField.tsx` | Label + input + errore + required/optional |
| InlineSelect | `components/ui/InlineSelect.tsx` | Click-to-edit dropdown (badge) |
| InlineDatePicker | `components/ui/InlineDatePicker.tsx` | Click-to-edit data |
| InlineTextInput | `components/ui/InlineTextInput.tsx` | Click-to-edit testo/numero |
| InlineUserSelect | `components/ui/InlineUserSelect.tsx` | Click-to-edit assegnatario (con ricerca) |
| ProgressBar | `components/ui/ProgressBar.tsx` | Barra progresso con gradiente e label |
| CircularProgress | `components/ui/CircularProgress.tsx` | Progresso circolare con label |
| DeleteConfirmModal | `components/ui/DeleteConfirmModal.tsx` | Modale conferma eliminazione |
| StatusIcon | `components/ui/StatusIcon.tsx` | Icone stato/priorità con colori |
| SkeletonLoader | `components/ui/SkeletonLoader.tsx` | Componenti skeleton (base, card, list item) |
| Tooltip | `components/ui/Tooltip.tsx` | Tooltip hover posizionabile |

### Feature

| Componente | File | Scopo |
|---|---|---|
| CommandPalette | `components/features/CommandPalette.tsx` | Ricerca globale (Ctrl+K), risultati raggruppati |
| KeyboardShortcutsModal | `components/features/KeyboardShortcutsModal.tsx` | Lista scorciatoie (Ctrl+Shift+?) |
| SavedViewsBar | `components/features/SavedViewsBar.tsx` | Barra pill per viste salvate |
| SaveViewModal | `components/features/SaveViewModal.tsx` | Crea/modifica vista salvata |
| ExportButton | `components/features/ExportButton.tsx` | Export CSV con loading |
| AdvancedFilterBuilder | `components/features/AdvancedFilterBuilder.tsx` | Costruttore filtri AND/OR |

### Task-specific

| Componente | File | Scopo |
|---|---|---|
| TaskTreeView | `components/reports/TaskTreeView.tsx` | Albero gerarchico progetti → milestone → task → subtask |
| QuickAddTask | `components/tasks/QuickAddTask.tsx` | Riga inline per creazione rapida task |
| ChecklistSection | `components/tasks/ChecklistSection.tsx` | Gestione checklist con progresso |
| CustomFieldsSection | `components/tasks/CustomFieldsSection.tsx` | Display/edit campi custom per task |
| CommentSection | `components/tasks/CommentSection.tsx` | Commenti con @mention e allegati |

### Project-specific

| Componente | File | Scopo |
|---|---|---|
| BudgetCard | `components/projects/BudgetCard.tsx` | Ore lavorate/stimate, % utilizzo, sforamento |
| ProjectMembersSection | `components/projects/ProjectMembersSection.tsx` | Gestione membri progetto (RBAC) |

### Planning

| Componente | File | Scopo |
|---|---|---|
| EstimationMetricsCard | `components/planning/EstimationMetricsCard.tsx` | Metriche stima per utente/tipo |
| TeamCapacityChart | `components/planning/TeamCapacityChart.tsx` | Grafico capacità settimanale |
| BottleneckAlerts | `components/planning/BottleneckAlerts.tsx` | Alert colli di bottiglia |
| PlanStepIndicator | `components/planning/PlanStepIndicator.tsx` | Indicatore step wizard |
| PlanTreeEditor | `components/planning/PlanTreeEditor.tsx` | Editor albero task del piano |
| PlanTaskRow | `components/planning/PlanTaskRow.tsx` | Riga singola task nel piano |
| PlanTimelinePreview | `components/planning/PlanTimelinePreview.tsx` | Preview Gantt del piano |
| PlanSummaryPanel | `components/planning/PlanSummaryPanel.tsx` | Riepilogo piano prima del commit |

---

## Stores (27 Zustand)

### Core

| Store | Stato chiave | Persistenza |
|---|---|---|
| authStore | user, token, isAuthenticated | Sì |
| themeStore | theme, themeStyle | Sì (v2 migration) |
| toastStore | toasts[], toast.withUndo() | No |

### Entity (CRUD)

| Store | Stato chiave | Note |
|---|---|---|
| taskStore | tasks, myTasks, currentTask, kanbanTasks, taskStats | Optimistic updates |
| projectStore | projects, currentProject, projectStats | 2-min cache |
| riskStore | risks, currentRisk, riskStats, riskMatrix | — |
| documentStore | documents, currentDocument, documentStats | FormData upload |
| userStore | users, currentUser | — |
| userInputStore | inputs, myInputs, stats | convertToTask/Project |

### Feature-specific

| Store | Stato chiave | Note |
|---|---|---|
| dashboardStore | myTasks, recentProjects, runningTimer, weeklyHours | Optimistic timer |
| taskTreeStore | treeData, expanded Sets, filters | — |
| calendarStore | currentDate, viewMode, dataMode, tasks, timeEntries | — |
| ganttStore | tasks, zoomLevel, viewRange, dependencies | — |
| analyticsStore | overview, charts, deliveryForecast, budgetOverview | — |
| weeklyReportStore | currentWeekPreview, reports, teamReports | — |
| teamTimeStore | byUser, byProject, entries, summary | — |
| notificationStore | notifications, unreadCount, prefs | Sì (solo prefs) |
| searchStore | query, results (5 tipi), isOpen | — |

### Advanced

| Store | Stato chiave | Note |
|---|---|---|
| customFieldStore | definitions, taskFieldValues (Map) | — |
| savedViewStore | views, activeViewId | — |
| planningStore | metrics, capacity, bottlenecks, wizard state | — |
| automationStore | rules, templates, recommendations, packages | — |
| workflowStore | templates, projectWorkflows | — |
| departmentStore | departments | — |
| tagStore | tags | — |
| auditStore | logs, filters | — |
| templateStore | templates, currentTemplate | — |

---

## Hooks (13)

| Hook | File | Scopo |
|---|---|---|
| useAuthInit | `hooks/useAuthInit.ts` | Validazione token + refresh proattivo |
| useKeyboardShortcuts | `hooks/useKeyboardShortcuts.ts` | Scorciatoie globali con sequenze (G+D, G+T, ecc.) |
| useInlineEdit | `hooks/useInlineEdit.ts` | Editing inline con update ottimistico + rollback |
| useListFilters | `hooks/useListFilters.ts` | Filtri lista con sync URL + debounce ricerca |
| useClickOutside | `hooks/useClickOutside.ts` | Detect click esterno |
| useEscapeKey | `hooks/useEscapeKey.ts` | Detect tasto Escape |
| usePrivilegedRole | `hooks/usePrivilegedRole.ts` | Check rapido admin/direzione |
| useDebounce | `hooks/useDebounce.ts` | Debounce generico (default 300ms) |
| useTimerToggle | `hooks/useTimerToggle.ts` | Logica start/stop timer condivisa |
| useTaskRoom | `hooks/useTaskRoom.ts` | Socket.io room per task detail (commenti real-time) |
| useNotificationSound | `hooks/useNotificationSound.ts` | Chime Web Audio API |
| useDesktopNotifications | `hooks/useDesktopNotifications.ts` | Browser Notification API |
| useFocusTrap | `hooks/useFocusTrap.ts` | Focus trap per modali |

---

## Routes (47)

### Pubbliche

| Route | Pagina |
|---|---|
| `/login` | LoginPage |
| `/invite/:token` | AcceptInvitationPage |

### Dashboard

| Route | Pagina |
|---|---|
| `/` | DefaultRedirect → `/my-day` o `/dashboard` |
| `/dashboard` | DashboardPage |
| `/my-day` | MyDayPage |

### Progetti

| Route | Pagina |
|---|---|
| `/projects` | ProjectListPage |
| `/projects/new` | ProjectFormPage |
| `/projects/:id` | ProjectDetailPage |
| `/projects/:id/edit` | ProjectFormPage |

### Task

| Route | Pagina |
|---|---|
| `/tasks` | TaskListPage (con ?view=list/table/kanban/gantt/calendar) |
| `/tasks/new` | TaskFormPage |
| `/tasks/:id` | TaskDetailPage |
| `/tasks/:id/edit` | TaskFormPage |

### Time Tracking

| Route | Pagina |
|---|---|
| `/time-tracking` | TimeTrackingPage |
| `/team-time` | TeamTimePage |

### Calendario

| Route | Pagina |
|---|---|
| `/calendar` | CalendarPage |

### Rischi

| Route | Pagina |
|---|---|
| `/risks` | RiskListPage |
| `/risks/new` | RiskFormPage |
| `/risks/:id` | RiskDetailPage |
| `/risks/:id/edit` | RiskFormPage |

### Segnalazioni

| Route | Pagina |
|---|---|
| `/inputs` | UserInputListPage |
| `/inputs/:id` | UserInputDetailPage |

### Documenti

| Route | Pagina |
|---|---|
| `/documents` | DocumentListPage |
| `/documents/new` | DocumentFormPage |
| `/documents/:id` | DocumentDetailPage |
| `/documents/:id/edit` | DocumentFormPage |

### Pianificazione

| Route | Pagina |
|---|---|
| `/planning` | PlanningDashboardPage |
| `/planning/wizard` | PlanningWizardPage |

### Analytics & Report

| Route | Pagina |
|---|---|
| `/analytics` | AnalyticsPage |
| `/reports/weekly` | WeeklyReportPage |

### Notifiche

| Route | Pagina |
|---|---|
| `/notifications` | NotificationCenterPage |

### Utenti

| Route | Pagina |
|---|---|
| `/profile` | ProfilePage |
| `/users` | UserListPage |
| `/users/new` | UserFormPage |
| `/users/:id/edit` | UserFormPage |

### Admin

| Route | Pagina |
|---|---|
| `/admin/templates` | TemplateListPage |
| `/admin/templates/new` | TemplateFormPage |
| `/admin/templates/:id/edit` | TemplateFormPage |
| `/admin/departments` | DepartmentListPage |
| `/admin/custom-fields` | CustomFieldsPage |
| `/admin/import` | ImportPage |
| `/admin/workflows` | WorkflowEditorPage |
| `/admin/automations` | AutomationListPage |
| `/admin/automations/new` | AutomationEditorPage |
| `/admin/automations/:id/edit` | AutomationEditorPage |

### Audit

| Route | Pagina |
|---|---|
| `/audit` | AuditTrailPage |

### Altro

| Route | Pagina |
|---|---|
| `*` | NotFoundPage (404) |

---

## Scorciatoie Keyboard

| Tasto | Azione |
|---|---|
| `Ctrl+K` / `Cmd+K` | Apri ricerca globale |
| `C` | Nuovo task |
| `G → D` | Vai a Dashboard |
| `G → P` | Vai a Progetti |
| `G → T` | Vai a Task |
| `G → K` | Vai a Kanban |
| `G → G` | Vai a Gantt |
| `G → R` | Vai a Report |
| `?` / `Ctrl+Shift+?` | Mostra scorciatoie |

---

## Servizi & Utility

### API (`services/api.ts`)

- Axios con baseURL `/api`
- Interceptor request: aggiunge Bearer token, gestisce FormData
- Interceptor response: refresh automatico 401 con coda richieste
- Logout automatico se refresh fallisce (401/403)

### Socket.io (`services/socket.ts`)

- Singleton con lazy init
- Eventi: `join:task`, `leave:task`, `comment:created/updated/deleted`
- Auto-reconnect con exponential backoff (max 10 tentativi)

### Utility (`utils/`)

| File | Exports principali |
|---|---|
| `avatarColors.ts` | `getAvatarColor()`, `getAvatarColorByName()`, `getUserInitials()` |
| `dateFormatters.ts` | `formatDate()`, `formatDateShort()`, `formatDateRelative()`, `formatDateTime()`, `formatRelativeTime()`, `formatDuration()`, `formatHoursFromDecimal()`, `isOverdue()`, `getDueDateColor()`, `formatFileSize()` |
| `advancedFilterUtils.ts` | `evaluateAdvancedFilter()` — filtro client-side AND/OR con 8 operatori |
