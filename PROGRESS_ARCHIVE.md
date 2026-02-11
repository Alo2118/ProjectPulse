# ProjectPulse - Progress Archive

> Dettagli implementativi delle feature completate. Consultare solo se serve contesto specifico.

## Phase 1 MVP - COMPLETATA

### Backend (100%)
- Auth: login, logout, refresh, me
- Projects: CRUD + list con filtri
- Tasks: CRUD + list con filtri
- Time Entries: CRUD + running timer
- Comments: CRUD per task
- Dashboard: stats endpoint

### Frontend - Pagine (100%)
- Login, Dashboard, Layout con sidebar
- Projects: list, detail, create/edit
- Tasks: list, detail, create/edit
- Time tracking, Kanban board

### Frontend - Stores (100%)
- authStore, projectStore, taskStore, dashboardStore, timeEntryStore, commentStore

---

## Phase 2 - Completati

### Risks Management
- Backend: riskService, riskController, riskRoutes con CRUD completo
- Frontend: riskStore, RiskListPage, RiskDetailPage, RiskFormPage
- Risk level calcolato (Probability x Impact), notifiche per rischi high-level

### User Inputs (Segnalazioni/Suggerimenti)
- Schema Prisma: model UserInput con enum InputCategory, InputStatus, ResolutionType
- Backend: userInputService (CRUD + convertToTask + convertToProject + acknowledge + reject)
- Frontend: userInputStore, UserInputListPage, UserInputDetailPage, UserInputFormModal
- ConvertToTaskModal, ConvertToProjectModal
- Notifiche automatiche per input ricevuti/processati/convertiti

### Task Standalone & Hierarchy
- Schema Prisma: `projectId` nullable, `parentTaskId`, relazione `TaskHierarchy`
- Backend: taskService per null project_id, parent_task_id, eredita progetto da parent
- Endpoint: GET /api/tasks/standalone, GET /api/tasks/:id/subtasks
- Frontend: TaskForm con checkbox standalone e select parent task
- TaskList con badge Standalone, indicatori hierarchy, filtro standalone
- prisma.config.ts aggiornato con `datasource.url` per db push

### Task Self-Management per Dipendenti (2026-02-02)
- Frontend: `TaskListPage.tsx` - `canCreateTask = !!user` per mostrare pulsante "Nuovo Task" a tutti
- Frontend: `TaskFormPage.tsx` - `canManageTasks = !isEditMode || isPrivilegedRole || isTaskOwner`
- I dipendenti possono creare task e modificare/eliminare quelli che hanno creato o sono assegnati a loro
- Backend già supportava questa logica (check `createdById` e `assigneeId` in taskController)

### Auth & User Management Fixes (2026-02-02)
- Backend: `authService.ts` - Login ora usa `findFirst` con `isDeleted: false` invece di `findUnique`
- Backend: `userController.ts` - Aggiunto campo `password` a `updateUserSchema` (opzionale, min 8 char)
- Backend: `userController.ts` - Password hashata con bcrypt 12 rounds prima del salvataggio in updateUser
- Fix: cambio email utente ora funziona correttamente con il login
- Fix: admin può aggiornare password utenti dalla gestione utenti

### Time Tracking Disabilitato per Direzione (2026-02-02)
- Frontend: `Sidebar.tsx` - Menu "Time Tracking" visibile solo per admin e dipendente
- Frontend: `TaskDetailPage.tsx` - Pulsante timer nascosto per direzione (`canTrackTime`)
- Frontend: `TaskListPage.tsx` - Pulsante timer nascosto per direzione
- Frontend: `KanbanBoardPage.tsx` - Pulsante timer nascosto per direzione (props propagate attraverso componenti)
- Frontend: `DashboardPage.tsx` - Pulsante timer e sezione "Ultime Registrazioni Tempo" nascosti per direzione
- La direzione può ancora vedere Tempo Team per monitorare il lavoro del team
