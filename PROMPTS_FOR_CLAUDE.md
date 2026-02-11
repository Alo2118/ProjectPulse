# Prompts Ottimizzati per Claude Code

## 📋 Come Usare Questo File

Questo documento contiene **prompt copy-paste ready** ottimizzati per Claude Code. Ogni prompt è strutturato per:
- ✅ Massima chiarezza e specificità
- ✅ Riferimenti ai file PRD e guide
- ✅ Checklist di verifica
- ✅ Istruzioni step-by-step

**Workflow suggerito:**
1. Leggi la sezione della fase che vuoi implementare
2. Copia il prompt
3. Incollalo in Claude Code
4. Verifica l'output con la checklist
5. Procedi al prompt successivo

---

## 🚀 Phase 1: Project Setup

### Prompt 1.1: Initialize Monorepo

```
Task: Initialize ProjectPulse monorepo structure

Context: As specified in PRD.md, PROJECT_STRUCTURE.md, and SETUP_LOCALHOST.md

Create a complete monorepo with:

Root Structure:
- package.json with npm workspaces ["client", "server"]
- .gitignore (node_modules, .env, dist, build, logs, uploads)
- .prettierrc (2 spaces, single quotes, trailing comma)
- .eslintrc.cjs (TypeScript rules)
- README.md (basic project info)

Client Folder (client/):
- Vite + React 18 + TypeScript setup
- package.json with dependencies:
  - react ^18.2.0
  - react-dom ^18.2.0
  - react-router-dom ^6.21.0
  - zustand ^4.4.7
  - axios ^1.6.2
  - react-hook-form ^7.49.2
  - zod ^3.22.4
  - @hookform/resolvers ^3.3.3
  - framer-motion ^10.16.16
  - lucide-react ^0.300.0
  - date-fns ^3.0.6
- vite.config.ts with proxy to localhost:3000
- tsconfig.json for React
- index.html
- src/ folder with main.tsx, App.tsx, vite-env.d.ts
- .env.example

Server Folder (server/):
- Express + TypeScript setup
- package.json with dependencies:
  - express ^4.18.2
  - @prisma/client ^5.8.0
  - prisma ^5.8.0
  - bcrypt ^5.1.1
  - jsonwebtoken ^9.0.2
  - zod ^3.22.4
  - cors ^2.8.5
  - helmet ^7.1.0
  - winston ^3.11.0
  - dotenv ^16.3.1
- tsconfig.json for Node
- src/ with index.ts, app.ts
- .env.example
- nodemon.json

Root Scripts:
- "install:all": install all workspaces
- "dev": run both client and server with concurrently
- "build": build both
- "start:prod": run production builds

All TypeScript configs should be strict mode.
Include proper type definitions (@types/*).

Verification:
- npm run install:all should complete
- Folder structure matches PROJECT_STRUCTURE.md
- TypeScript compiles without errors
```

---

### Prompt 1.2: Tailwind CSS Configuration

```
Task: Setup Tailwind CSS with ProjectPulse design system

Context: As specified in PRD.md (Design System section)

In client/ folder:

1. Install Tailwind:
   - tailwindcss ^3.4.0
   - autoprefixer ^10.4.16
   - postcss ^8.4.32

2. Create tailwind.config.js with:
   - Dark mode: 'class'
   - Content paths: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
   - Theme extensions:
     - Colors:
       - primary: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' }
       - success: '#10b981'
       - warning: '#f59e0b'
       - danger: '#ef4444'
       - info: '#3b82f6'
       - Status colors: todo: '#94a3b8', in-progress: '#3b82f6', blocked: '#ef4444', completed: '#10b981'
     - fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }

3. Create postcss.config.js with tailwindcss and autoprefixer

4. Create src/index.css with:
   - @tailwind base;
   - @tailwind components;
   - @tailwind utilities;
   - Custom CSS variables for dark mode
   - Inter font import from Google Fonts

5. Update main.tsx to import './index.css'

6. Update index.html to include:
   - <link rel="preconnect" href="https://fonts.googleapis.com">
   - <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

Verification:
- npm run dev starts without errors
- Tailwind classes work in components
- Inter font loads
- Dark mode toggle works (test with <html class="dark">)
```

---

### Prompt 1.3: Prisma Setup and Database Schema

```
Task: Setup Prisma ORM with complete ProjectPulse schema

Context: As specified in DATABASE_SCHEMA.sql and PRD.md

In server/ folder:

1. Initialize Prisma:
   npx prisma init --datasource-provider postgresql

2. Update .env with:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectpulse"

3. Create prisma/schema.prisma based on DATABASE_SCHEMA.sql:
   - All enums (UserRole, ProjectStatus, TaskStatus, etc.)
   - All models:
     - User
     - ProjectTemplate
     - Project
     - Task
     - TimeEntry
     - Comment
     - Risk
     - Document
     - DocumentVersion
     - AuditLog
     - Notification
     - RefreshToken
   - All relations with proper @relation annotations
   - All indexes with @@index
   - Map table names with @@map("table_name")
   - Map field names with @map("field_name") for snake_case DB

4. Create prisma/seed.ts:
   - Import @prisma/client
   - Create 3 users:
     - admin@projectpulse.local / Admin123! (role: admin)
     - direzione@projectpulse.local / Direzione123! (role: direzione)
     - dipendente@projectpulse.local / Dipendente123! (role: dipendente)
   - Create 2 sample projects
   - Create 5 sample tasks assigned to dipendente
   - Use bcrypt to hash passwords (12 rounds)

5. Add to package.json scripts:
   - "migrate": "prisma migrate dev"
   - "seed": "tsx prisma/seed.ts"
   - "studio": "prisma studio"
   - "generate": "prisma generate"

Important:
- Use UUID for all IDs (@default(uuid()))
- Add proper DateTime defaults (@default(now()), @updatedAt)
- Include all foreign key relations
- Add indexes for performance

Verification:
- npx prisma migrate dev --name init creates migration
- npx prisma generate creates client
- npm run seed populates data
- npx prisma studio opens and shows tables with data
```

---

## 🔐 Phase 2: Authentication System

### Prompt 2.1: Backend Authentication

```
Task: Implement complete JWT authentication system

Context: As specified in PRD.md (Authentication section) and IMPLEMENTATION_GUIDE.md Phase 1.5

In server/src/:

1. Create utils/jwtUtils.ts:
   - generateAccessToken(userId, role) → returns JWT (8h expiry)
   - generateRefreshToken(userId) → returns JWT (7d expiry)
   - verifyAccessToken(token) → returns decoded payload or throws
   - verifyRefreshToken(token) → returns decoded payload or throws
   - Use JWT_SECRET and JWT_REFRESH_SECRET from env
   - Payload: { userId: string, role: string, iat, exp }

2. Create utils/passwordUtils.ts:
   - hashPassword(password) → bcrypt hash with 12 rounds
   - comparePassword(password, hash) → boolean
   - validatePassword(password) → validates min 8 chars, 1 uppercase, 1 number, 1 special

3. Create middleware/authMiddleware.ts:
   - authenticateToken: extract JWT from Authorization header, verify, attach user to req
   - authorize(...roles): check if req.user.role is in allowed roles
   - Handle 401 Unauthorized, 403 Forbidden

4. Create controllers/authController.ts:
   - register(req, res): create new user, hash password, return success
   - login(req, res): validate credentials, generate tokens, set refresh token as httpOnly cookie, return access token
   - logout(req, res): revoke refresh token, clear cookie
   - refreshToken(req, res): verify refresh token from cookie, generate new access token
   - getMe(req, res): return current user from req.user

5. Create routes/authRoutes.ts:
   - POST /register
   - POST /login
   - POST /logout (protected)
   - POST /refresh-token
   - GET /me (protected)

6. Create services/authService.ts with business logic:
   - validateCredentials(email, password)
   - createUser(userData)
   - storeRefreshToken(userId, token)
   - revokeRefreshToken(token)

7. Add Zod validation schemas for:
   - RegisterInput: email, password, firstName, lastName, role
   - LoginInput: email, password

8. Update app.ts:
   - Import authRoutes
   - Use authRoutes: app.use('/api/auth', authRoutes)

Important:
- All routes return consistent format: { success: boolean, data?: any, error?: string }
- Hash passwords before storing
- Set refresh token as httpOnly, secure, sameSite cookie
- Clear sensitive data from responses (no password hash)

Verification:
- POST /api/auth/register creates user
- POST /api/auth/login returns access token
- GET /api/auth/me returns user with valid token
- 401 on invalid/expired token
- 403 on wrong role
```

---

### Prompt 2.2: Frontend Authentication

```
Task: Implement frontend authentication with Zustand

Context: As specified in IMPLEMENTATION_GUIDE.md Phase 2.1

In client/src/:

1. Create services/api.ts:
   - Axios instance with baseURL from VITE_API_URL
   - Request interceptor: attach access token from authStore
   - Response interceptor:
     - On 401: try refresh token, retry request
     - On error: format and return consistent error
   - Export api instance

2. Create services/authService.ts:
   - login(email, password): POST /api/auth/login
   - register(userData): POST /api/auth/register
   - logout(): POST /api/auth/logout
   - refreshToken(): POST /api/auth/refresh-token
   - getMe(): GET /api/auth/me

3. Create stores/authStore.ts (Zustand):
   State:
   - user: User | null
   - token: string | null
   - isAuthenticated: boolean
   - isLoading: boolean
   
   Actions:
   - login(email, password): call authService, set user + token
   - logout(): clear user + token, redirect to login
   - setUser(user): set user
   - setToken(token): set token
   - initAuth(): load from localStorage, verify token with getMe()
   
   Persist token and user in localStorage

4. Create hooks/useAuth.ts:
   - Return authStore state and actions
   - Easy access: const { user, login, logout, isAuthenticated } = useAuth()

5. Create components/auth/LoginForm.tsx:
   - React Hook Form + Zod validation
   - Fields: email, password
   - On submit: call login from useAuth
   - Show loading state
   - Show error messages
   - Link to password reset (placeholder)

6. Create pages/auth/LoginPage.tsx:
   - AuthLayout wrapper
   - LoginForm component
   - ProjectPulse logo/title
   - Tailwind styling

7. Create components/layout/AuthLayout.tsx:
   - Centered card on full-screen background
   - Responsive design

8. Update App.tsx:
   - React Router setup
   - Routes:
     - /login (public)
     - / redirects to /login if not authenticated, else /dashboard
   - Call initAuth() on mount

9. Create components/common/ProtectedRoute.tsx:
   - Check isAuthenticated from useAuth
   - Redirect to /login if not authenticated
   - Render children if authenticated

Important:
- Store token in localStorage for persistence
- Clear token on logout
- Auto-refresh token on 401
- Redirect to login on auth failure

Verification:
- Can register new user
- Can login with credentials
- Token stored in localStorage
- Refresh page keeps login
- Logout clears token and redirects
- Protected routes redirect if not authenticated
```

---

## 📊 Phase 3: Core Features - Projects

### Prompt 3.1: Projects Backend

```
Task: Implement complete Projects CRUD backend

Context: As specified in PRD.md (Project Management section) and IMPLEMENTATION_GUIDE.md Phase 3.1

In server/src/:

1. Create services/projectService.ts:
   - getAllProjects(filters, pagination): list projects with filters (status, priority, owner), pagination (page, limit), sorting
   - getProjectById(id): get single project with tasks, risks, documents
   - createProject(data, userId): create new project, generate code (PRJ-YYYY-NNN), audit log
   - updateProject(id, data, userId): update project, audit log with old/new data
   - deleteProject(id, userId): soft delete (is_deleted = true), audit log
   - changeProjectStatus(id, newStatus, userId): validate status transition, audit log
   - generateProjectCode(): auto-generate unique code

2. Create controllers/projectController.ts:
   - Validation with Zod schemas
   - Delegate to projectService
   - Error handling
   - Routes:
     - GET /projects (query: status, priority, owner, page, limit, sort)
     - GET /projects/:id
     - POST /projects
     - PUT /projects/:id
     - DELETE /projects/:id
     - PATCH /projects/:id/status

3. Create routes/projectRoutes.ts:
   - Apply authMiddleware to all routes
   - Apply authorize('direzione', 'admin') to POST, PUT, DELETE
   - GET routes accessible by all authenticated users

4. Create services/auditService.ts:
   - logAudit(entityType, entityId, action, userId, oldData, newData, ipAddress, userAgent)
   - Compute changes: diff between oldData and newData
   - Store in audit_logs table

5. Create middleware/auditMiddleware.ts:
   - Capture req.ip and req.get('user-agent')
   - Attach to req for services to use

6. Zod Schemas (validation):
   - CreateProjectSchema: name (required), description, status, priority, startDate, targetDate, ownerId, templateId
   - UpdateProjectSchema: same as create but all optional
   - Validate dates (startDate < targetDate)

7. Update app.ts:
   - Import projectRoutes
   - app.use('/api/projects', authMiddleware, projectRoutes)

Important:
- Generate project code automatically if not provided
- Soft delete (never actually delete records)
- Audit every create/update/delete
- Validate user permissions
- Include related data (tasks, risks) in getById

Verification:
- GET /api/projects returns list
- POST /api/projects creates project (direzione/admin only)
- PUT /api/projects/:id updates project
- DELETE /api/projects/:id soft deletes
- Filters, pagination, sorting work
- Audit logs created for all changes
```

---

### Prompt 3.2: Projects Frontend

```
Task: Implement Projects UI with list, detail, and form

Context: As specified in IMPLEMENTATION_GUIDE.md Phase 3.2

In client/src/:

1. Create types/project.types.ts:
   - Project interface matching backend model
   - ProjectStatus, Priority enums
   - CreateProjectInput, UpdateProjectInput

2. Create services/projectService.ts:
   - getProjects(filters, pagination): GET /api/projects
   - getProject(id): GET /api/projects/:id
   - createProject(data): POST /api/projects
   - updateProject(id, data): PUT /api/projects/:id
   - deleteProject(id): DELETE /api/projects/:id
   - changeStatus(id, status): PATCH /api/projects/:id/status

3. Create stores/projectStore.ts (Zustand):
   State:
   - projects: Project[]
   - currentProject: Project | null
   - isLoading: boolean
   - filters: { status, priority, search }
   
   Actions:
   - fetchProjects(): load projects
   - fetchProject(id): load single project
   - createProject(data): create and add to list
   - updateProject(id, data): update in list
   - deleteProject(id): remove from list
   - setFilters(filters): update filters
   - resetFilters(): clear filters

4. Create components/features/projects/ProjectCard.tsx:
   - Display: code, name, status badge, priority, owner, dates
   - Actions: View, Edit, Delete (permission-based)
   - Tailwind card styling
   - Hover effect (Framer Motion)

5. Create components/features/projects/ProjectList.tsx:
   - Table view with columns: Code, Name, Status, Priority, Owner, Start Date, Target Date, Actions
   - Use Table component from common/
   - Pagination controls
   - Loading state (Spinner)

6. Create components/features/projects/ProjectFilters.tsx:
   - Status multi-select
   - Priority multi-select
   - Search input (debounced)
   - Reset filters button
   - Apply filters on change

7. Create components/features/projects/ProjectFormModal.tsx:
   - React Hook Form + Zod validation
   - Fields: name, description, status, priority, startDate, targetDate, ownerId (select), templateId (optional)
   - Mode: create or edit
   - On submit: call createProject or updateProject
   - Close modal on success
   - Show validation errors

8. Create pages/projects/ProjectListPage.tsx:
   - Header with "New Project" button (direzione/admin only)
   - ProjectFilters
   - ProjectList
   - ProjectFormModal (controlled by state)
   - Load projects on mount
   - Handle create/edit/delete

9. Create pages/projects/ProjectDetailPage.tsx:
   - Project info card
   - Tabs: Overview, Tasks, Risks, Documents
   - Edit/Delete buttons (permission-based)
   - Navigate with React Router

10. Update App.tsx routes:
    - /dashboard/projects (list)
    - /dashboard/projects/:id (detail)

Important:
- Permission-based buttons (check user role)
- Optimistic updates (update UI immediately, rollback on error)
- Loading states for all actions
- Error handling with Toast notifications
- Responsive design

Verification:
- Projects list loads and displays
- Filters work (status, priority, search)
- Pagination works
- Create project modal opens and saves
- Edit project modal pre-fills data and updates
- Delete confirmation works
- Detail page shows project with tabs
- Permission checks work (dipendente cannot create)
```

---

## ✅ Phase 4: Tasks & Time Tracking

### Prompt 4.1: Tasks Backend

```
Task: Implement Tasks CRUD and Time Tracking backend

Context: As specified in PRD.md (Task Management, Time Tracking sections)

In server/src/:

1. Create services/taskService.ts:
   - getAllTasks(filters, pagination): list tasks with filters (status, priority, assignedTo, projectId)
   - getMyTasks(userId): tasks assigned to current user
   - getTaskById(id): single task with time entries and comments
   - createTask(data, userId): create task, generate code (TASK-PRJ-XXX-NNN), audit log
   - updateTask(id, data, userId): update task, audit log
   - deleteTask(id, userId): soft delete
   - changeTaskStatus(id, newStatus, userId): validate transitions (todo → in_progress → completed/blocked), require blocked_reason if blocked
   - assignTask(id, assigneeId, userId): assign to user
   - updateActualHours(taskId): compute from time entries

2. Create services/timeService.ts:
   - startTimer(taskId, userId): create time_entry with start_time, set is_active=true, auto-change task status to in_progress
   - stopTimer(entryId, userId): set end_time, calculate duration, set is_active=false, update task.actual_hours
   - pauseTimer(entryId, userId): stop current entry
   - getActiveTimer(userId): get currently running timer
   - getTimeEntries(taskId): all time entries for task
   - createManualEntry(data, userId): manual time entry

3. Create controllers/taskController.ts + timeController.ts:
   - Validation with Zod
   - Error handling
   - Task Routes:
     - GET /tasks
     - GET /tasks/my-tasks
     - GET /tasks/:id
     - POST /tasks
     - PUT /tasks/:id
     - DELETE /tasks/:id
     - PATCH /tasks/:id/status
     - PATCH /tasks/:id/assign
   - Time Routes:
     - POST /tasks/:id/time/start
     - POST /time-entries/:id/stop
     - POST /time-entries/:id/pause
     - GET /tasks/:id/time/entries
     - GET /time-entries/active (current user)

4. Zod Schemas:
   - CreateTaskSchema: projectId, title, description, status, priority, assignedTo, estimatedHours, dueDate, tags
   - UpdateTaskSchema: all optional
   - ChangeStatusSchema: newStatus, blockedReason (required if status=blocked)
   - Validate status transitions (todo can only go to in_progress, etc.)

5. Update routes and app.ts

Important:
- Auto-change task status to in_progress on timer start
- Compute duration_minutes = (end_time - start_time) in minutes
- Update task.actual_hours after stopping timer
- Only one active timer per user at a time
- Audit all task changes

Verification:
- CRUD operations work
- Status transitions validated
- Timer start/stop works
- Actual hours updated correctly
- Can't start multiple timers simultaneously
- Blocked tasks require reason
```

---

### Prompt 4.2: Tasks Frontend - Kanban Board

```
Task: Implement Kanban board with drag & drop for tasks

Context: As specified in PRD.md and IMPLEMENTATION_GUIDE.md Phase 3.3

In client/src/:

1. Install @dnd-kit/core and @dnd-kit/sortable

2. Create types/task.types.ts:
   - Task interface
   - TaskStatus, Priority enums
   - TimeEntry interface

3. Create services/taskService.ts:
   - getTasks(filters)
   - getMyTasks()
   - getTask(id)
   - createTask(data)
   - updateTask(id, data)
   - deleteTask(id)
   - changeStatus(id, status, reason?)
   - assignTask(id, userId)

4. Create services/timeService.ts:
   - startTimer(taskId)
   - stopTimer(entryId)
   - pauseTimer(entryId)
   - getActiveTimer()
   - getTimeEntries(taskId)

5. Create stores/taskStore.ts (Zustand):
   State:
   - tasks: Task[]
   - currentTask: Task | null
   - activeTimer: TimeEntry | null
   - filters: { status, priority, project }
   
   Actions:
   - fetchTasks(), fetchMyTasks()
   - createTask(data), updateTask(id, data)
   - changeStatus(id, status)
   - startTimer(taskId), stopTimer()
   - updateActiveTimer(timer)

6. Create components/features/tasks/Timer.tsx:
   - Display: HH:MM:SS (formatted duration)
   - Buttons: Start, Pause, Stop
   - Visual indicator when running (pulsing dot)
   - Auto-update every second when running
   - Persist timer in localStorage (survives refresh)
   - Auto-save to backend every 5 minutes

7. Create components/features/tasks/TaskCard.tsx:
   - Display: title, description (truncated), priority badge, status badge, assigned user avatar, due date, estimated vs actual hours
   - Timer component if assigned to current user
   - Actions: View, Edit, Delete
   - Draggable (use @dnd-kit/core)
   - Tailwind card styling with hover effect

8. Create components/features/tasks/KanbanColumn.tsx:
   - Props: status, tasks[]
   - Column header with status name and task count
   - Droppable area (use @dnd-kit/core)
   - List of TaskCard components
   - Empty state if no tasks

9. Create components/features/tasks/KanbanBoard.tsx:
   - DndContext from @dnd-kit/core
   - Columns: Todo, In Progress, Blocked, Completed
   - Handle onDragEnd: update task status, call changeStatus API
   - Optimistic update (update UI immediately)

10. Create components/features/tasks/TaskFormModal.tsx:
    - React Hook Form + Zod
    - Fields: projectId (select), title, description, status, priority, assignedTo, estimatedHours, dueDate, tags
    - Mode: create or edit
    - Validation

11. Create pages/tasks/MyTasksPage.tsx (Dipendente dashboard):
    - Header with "New Task" button
    - Filters: project, priority
    - Toggle: Kanban vs List view
    - KanbanBoard component
    - TaskFormModal

12. Create pages/tasks/TasksOverviewPage.tsx (Direzione dashboard):
    - Global view of all tasks
    - Advanced filters
    - Table view with pagination
    - Bulk actions (optional)

Important:
- Timer persists in localStorage
- Auto-sync timer every 5 min to backend
- Drag & drop smooth with animations
- Status change validates transitions
- Only assigned user can start timer
- Permission-based actions

Verification:
- Kanban board displays 4 columns with tasks
- Drag task from Todo to In Progress changes status
- Timer starts/stops correctly
- Timer continues after page refresh
- Blocked tasks require reason
- Create/Edit task works
- Filters work
```

---

## 💬 Phase 5: Comments & Communication

### Prompt 5: Comments System

```
Task: Implement comments thread with @mentions

Context: As specified in PRD.md (Communication section)

Backend (server/src/):

1. Create services/commentService.ts:
   - createComment(taskId, userId, content, isInternal): parse @mentions, save comment, send notifications to mentioned users
   - getComments(taskId): get all comments with user info, order by created_at
   - updateComment(id, userId, content): only owner can edit
   - deleteComment(id, userId): soft delete, only owner
   - parseMentions(content): extract @username from text, return array of mentioned userIds

2. Create controllers/commentController.ts:
   - POST /tasks/:taskId/comments
   - GET /tasks/:taskId/comments
   - PUT /comments/:id
   - DELETE /comments/:id

3. On comment creation:
   - Call notificationService.sendPushNotification() for each mentioned user
   - Type: 'comment'

Frontend (client/src/):

1. Create types/comment.types.ts

2. Create services/commentService.ts:
   - getComments(taskId)
   - createComment(taskId, content, isInternal)
   - updateComment(id, content)
   - deleteComment(id)

3. Create components/features/comments/Comment.tsx:
   - User avatar + name
   - Content with highlighted @mentions
   - Timestamp (relative: "2 hours ago")
   - Edit/Delete buttons (own comments only)
   - "edited" indicator if edited

4. Create components/features/comments/CommentForm.tsx:
   - Textarea with @mention autocomplete (use react-mentions or simple regex)
   - Submit button
   - Loading state
   - Character count

5. Create components/features/comments/CommentThread.tsx:
   - List of Comment components
   - CommentForm at bottom
   - Auto-scroll to new comment
   - Loading state
   - Empty state

6. Update TaskDetailPage to include CommentThread

7. Create stores/commentStore.ts (optional, or keep in taskStore)

Important:
- Parse @username and highlight in UI
- Send notifications to mentioned users
- Internal comments visible only to direzione/admin
- Real-time updates with polling (every 10s) or Socket.io later

Verification:
- Can add comment
- @mentions parsed and highlighted
- Mentioned users receive notification
- Can edit/delete own comments
- Internal comments hidden from dipendente
- Thread updates in real-time
```

---

## 🚨 Phase 6: Risk Management & Document Control

### Prompt 6.1: Risk Management

```
Task: Implement Risk Management with Risk Matrix visualization

Context: As specified in PRD.md (Risk Management section)

Backend (server/src/):

1. Create services/riskService.ts:
   - createRisk(projectId, data, userId): create risk, calculate risk_level, generate code (RISK-PRJ-XXX-NNN), audit log
   - updateRisk(id, data, userId): update, recalculate risk_level
   - deleteRisk(id, userId): soft delete
   - getRisks(projectId, filters): list with filters (status, risk_level)
   - calculateRiskLevel(probability, impact): Low×Low=1 (low), Low×Med=2 (low), Med×Med=4 (medium), High×High=9 (high), etc.

2. Create controllers/riskController.ts + routes/riskRoutes.ts

3. Zod Schemas

Frontend (client/src/):

1. Create types/risk.types.ts

2. Create services/riskService.ts

3. Create components/features/risks/RiskMatrix.tsx:
   - 3×3 grid (Probability: Low/Med/High, Impact: Low/Med/High)
   - Each cell is clickable
   - Risks plotted as colored dots (low=green, medium=yellow, high=red)
   - Click risk to view details
   - Responsive design

4. Create components/features/risks/RiskCard.tsx:
   - Display: code, title, category, probability, impact, risk_level badge, status, mitigation plan
   - Actions: Edit, Delete

5. Create components/features/risks/RiskFormModal.tsx:
   - Fields: title, description, category, probability (select), impact (select), mitigation_plan, ownerId
   - Risk level auto-calculated and displayed

6. Create components/features/risks/RiskList.tsx:
   - Table view
   - Filters: status, risk_level
   - Sort by risk_level (high first)

7. Create pages/risks/RisksPage.tsx (Direzione dashboard):
   - Toggle: Matrix vs List view
   - "New Risk" button
   - RiskMatrix or RiskList
   - RiskFormModal

8. Add "Risks" tab to ProjectDetailPage

Important:
- Risk level calculated automatically: probability (1-3) × impact (1-3)
- Color coding consistent: low=green, medium=yellow, high=red
- Matrix interactive (click cells)
- Permission: only direzione/admin can manage risks

Verification:
- Risk matrix displays correctly
- Risks plotted in correct cells
- Click risk to view/edit
- Risk level calculated correctly
- List view filters work
- Create/Edit/Delete work
```

---

### Prompt 6.2: Document Control

```
Task: Implement Document Control with upload and approval workflow

Context: As specified in PRD.md (Document Control section)

Backend (server/src/):

1. Install multer for file uploads

2. Create middleware/uploadMiddleware.ts:
   - multer config: dest = './uploads/documents/', max size = 10MB
   - Accept: PDF, DOCX, XLSX only
   - Filename: {timestamp}-{originalname}

3. Create services/documentService.ts:
   - uploadDocument(projectId, file, metadata, userId): save file, create document record, generate code (DOC-YYYY-NNN), audit log
   - getDocuments(projectId, filters)
   - getDocument(id)
   - updateDocument(id, metadata, userId)
   - approveDocument(id, approverId): set status=approved, approved_by, approved_at
   - deleteDocument(id, userId): soft delete, delete file from disk
   - downloadDocument(id): stream file

4. Create controllers/documentController.ts:
   - POST /projects/:id/documents/upload (multer middleware)
   - GET /projects/:id/documents
   - GET /documents/:id
   - GET /documents/:id/download (stream file)
   - PUT /documents/:id
   - POST /documents/:id/approve (direzione/admin only)
   - DELETE /documents/:id

Frontend (client/src/):

1. Create types/document.types.ts

2. Create services/documentService.ts:
   - uploadDocument(projectId, file, metadata)
   - getDocuments(projectId)
   - getDocument(id)
   - updateDocument(id, metadata)
   - approveDocument(id)
   - deleteDocument(id)
   - downloadDocument(id): fetch blob, trigger download

3. Create components/features/documents/DocumentUploadModal.tsx:
   - Drag & drop or file picker (use react-dropzone)
   - Fields: title, document_type, version, notes
   - Show file name, size
   - Upload progress bar
   - On success: close modal, refresh list

4. Create components/features/documents/DocumentList.tsx:
   - Table: Title, Type, Version, Status, Approved By, Actions
   - Status badges (draft, review, approved, obsolete)
   - Actions: View, Download, Approve (direzione/admin), Delete

5. Create components/features/documents/DocumentViewer.tsx (optional):
   - Embed PDF in iframe
   - Show DOCX/XLSX preview or download link

6. Create pages/documents/DocumentsPage.tsx:
   - "Upload Document" button
   - DocumentList
   - DocumentUploadModal

7. Add "Documents" tab to ProjectDetailPage

Important:
- Files stored in server/uploads/documents/
- File path in database
- Approval workflow: draft → review → approved
- Only direzione/admin can approve
- Delete removes file from disk
- Audit all uploads/approvals

Verification:
- Can upload PDF/DOCX/XLSX (max 10MB)
- File saved to uploads/
- Document record created in DB
- Can download document
- Approval workflow works
- Status changes reflected in UI
- Delete removes file
```

---

## 🔔 Phase 7: Real-time Notifications

### Prompt 7: Socket.io Notifications

```
Task: Implement real-time notifications with Socket.io

Context: As specified in PRD.md (Notifications section)

Backend (server/src/):

1. Install socket.io

2. Create socket/index.ts:
   - Setup Socket.io server attached to Express
   - Namespace: /notifications
   - On connection: authenticate JWT, join room 'user_${userId}'
   - Events:
     - 'notification': send notification to user
     - 'mark_read': mark notification as read

3. Create services/notificationService.ts:
   - createNotification(userId, type, title, message, relatedEntity): save to DB, emit via Socket.io to user room
   - getNotifications(userId, filters)
   - markAsRead(id, userId)
   - markAllAsRead(userId)
   - deleteNotification(id, userId)

4. Create controllers/notificationController.ts:
   - GET /notifications
   - PATCH /notifications/:id/read
   - PATCH /notifications/read-all
   - DELETE /notifications/:id

5. Integrate notifications in services:
   - commentService: on comment with @mention → notify mentioned users
   - taskService: on status change to blocked → notify direzione
   - taskService: on task assigned → notify assignee
   - riskService: on high risk created → notify direzione
   - documentService: on document uploaded → notify approver

Frontend (client/src/):

1. Install socket.io-client

2. Create services/socketService.ts:
   - Connect to Socket.io on mount
   - Authenticate with JWT
   - Listen for 'notification' event
   - Update notificationStore on receive
   - Emit 'mark_read' event

3. Create stores/notificationStore.ts (Zustand):
   State:
   - notifications: Notification[]
   - unreadCount: number
   
   Actions:
   - addNotification(notification): add to list, increment unread
   - markAsRead(id): update notification, decrement unread
   - markAllAsRead(): update all, reset unread
   - fetchNotifications(): load from API

4. Create hooks/useNotifications.ts:
   - Setup Socket.io connection on mount
   - Listen for notifications
   - Show toast on new notification
   - Update store

5. Create components/features/notifications/NotificationBell.tsx (Header):
   - Bell icon (lucide-react)
   - Badge with unread count
   - Click to open dropdown

6. Create components/features/notifications/NotificationDropdown.tsx:
   - List last 10 notifications
   - Each notification: icon, title, message, timestamp, unread dot
   - Click to mark as read and navigate to related entity
   - "Mark all as read" button
   - "See all" link to NotificationsPage

7. Create components/features/notifications/NotificationItem.tsx:
   - Icon based on type (comment, task, risk, etc.)
   - Title + message
   - Relative timestamp ("5 min ago")
   - Unread indicator (blue dot)
   - Click to navigate

8. Create pages/NotificationsPage.tsx:
   - Full list with pagination
   - Filters: unread, type
   - Group by date (Today, Yesterday, Older)
   - Mark as read/unread toggle
   - Delete button

9. Update Header.tsx to include NotificationBell

10. Create components/common/Toast.tsx (for in-app notifications):
    - Slide in from top-right
    - Auto-dismiss after 5s
    - Close button
    - Framer Motion animations

Important:
- Socket.io authenticated (verify JWT)
- Notifications sent only to intended user (room-based)
- Toast for new notifications (non-intrusive)
- Badge counter updates in real-time
- Mark as read on click
- Reconnect on disconnect

Verification:
- Socket.io connects on login
- New comment triggers notification
- Notification appears in real-time (toast + bell badge)
- Click notification navigates to related entity
- Mark as read works
- Full notifications page shows all
- Reconnects after disconnect
```

---

## 📊 Phase 8: Analytics & Reporting

### Prompt 8.1: Daily Report PDF

```
Task: Implement Daily Report PDF generation

Context: As specified in PRD.md (Reporting section)

Backend (server/src/):

1. Install pdfkit

2. Create utils/pdfGenerator.ts:
   - generateDailyReport(userId, date): fetch user's tasks for date, generate PDF
   - Sections:
     - Header: ProjectPulse logo, user name, date
     - Summary: total hours, tasks completed, in progress, blocked
     - Completed tasks table (title, project, hours)
     - In Progress tasks table
     - Blocked tasks with reasons
     - Footer: generated timestamp
   - Styling: professional, clean, company branding
   - Return PDF buffer

3. Create services/reportService.ts:
   - getDailyReport(userId, date): aggregate data from tasks and time_entries
   - Structure:
     - completedTasks: { title, project, hours }[]
     - inProgressTasks: { title, project, hours }[]
     - blockedTasks: { title, project, reason }[]
     - totalHours: number
     - summary: { completed: number, inProgress: number, blocked: number }

4. Create controllers/reportController.ts:
   - GET /reports/daily/:userId/:date
   - Validate: user can only request their own report (unless admin/direzione)
   - Call pdfGenerator, send PDF as response
   - Set headers: Content-Type: application/pdf, Content-Disposition: attachment

Frontend (client/src/):

1. Create services/reportService.ts:
   - getDailyReport(userId, date): GET /api/reports/daily/:userId/:date, returns blob
   - downloadReport(blob, filename): trigger browser download

2. Create components/features/reports/ReportForm.tsx:
   - Date picker (default: today)
   - "Generate Report" button
   - Loading state
   - On click: call getDailyReport, download PDF

3. Add to DipendenteDashboardPage or create ReportsPage

Important:
- PDF generated on-demand (not stored)
- Professional styling
- All data accurate
- Download triggered in browser
- Validation: users can only get their own reports

Verification:
- Click "Generate Report" downloads PDF
- PDF contains correct data for selected date
- Styling is professional
- All sections present
- Download works in all browsers
```

---

### Prompt 8.2: Analytics Dashboard

```
Task: Implement Analytics Dashboard for Direzione with charts

Context: As specified in PRD.md (Analytics section)

Backend (server/src/):

1. Create services/analyticsService.ts:
   - getDashboardMetrics(dateRange):
     - taskCompletionRate: { completed, total, rate }
     - teamVelocity: { week, tasksCompleted }[] (last 8 weeks)
     - hoursDistribution: { projectName, hours }[]
     - activeBlockers: { taskTitle, projectName, reason }[]
     - riskExposure: { low, medium, high }
   - Aggregate from tasks, time_entries, projects, risks
   - Cache results for 5 minutes

2. Create controllers/analyticsController.ts:
   - GET /analytics/dashboard (query: dateRange - week, month, quarter)
   - Only direzione and admin

Frontend (client/src/):

1. Install recharts

2. Create services/analyticsService.ts:
   - getDashboardMetrics(dateRange)

3. Create components/features/analytics/TaskCompletionRateChart.tsx:
   - Donut chart (Recharts PieChart)
   - Completed vs Total tasks
   - Center label with percentage
   - Color: completed=green, pending=gray

4. Create components/features/analytics/VelocityChart.tsx:
   - Bar chart (Recharts BarChart)
   - X-axis: weeks, Y-axis: tasks completed
   - Color: primary blue

5. Create components/features/analytics/HoursDistributionChart.tsx:
   - Pie chart (Recharts PieChart)
   - Slices: projects with hours
   - Legend with project names

6. Create components/features/analytics/ActiveBlockersWidget.tsx:
   - Card with alert icon
   - Count of blocked tasks
   - List top 5 blocked tasks with projects
   - Click to navigate

7. Create components/features/analytics/RiskExposureWidget.tsx:
   - Gauge-style chart or simple counts
   - High/Medium/Low risk counts
   - Color coded

8. Create pages/direzione/AnalyticsPage.tsx:
   - Date range selector (week, month, quarter)
   - Grid layout (2-3 columns)
   - Widgets:
     - TaskCompletionRateChart
     - VelocityChart
     - HoursDistributionChart
     - ActiveBlockersWidget
     - RiskExposureWidget
   - Responsive design
   - Loading states

Important:
- Charts interactive (tooltips on hover)
- Responsive grid layout
- Date range filter updates all widgets
- Performance: load in <2s
- Cache backend responses

Verification:
- All 5 widgets render correctly
- Data accurate
- Charts interactive (tooltips, hover)
- Date range filter works
- Responsive on tablet/mobile
- Loading states
```

---

## 🎨 Phase 9: UI Polish

### Prompt 9.1: Dark Mode

```
Task: Implement complete dark mode with toggle

Context: As specified in PRD.md (Dark/Light Mode)

In client/src/:

1. Create hooks/useDarkMode.ts:
   - State: isDark (boolean)
   - Toggle function
   - Persist in localStorage ('theme': 'light' | 'dark')
   - Apply 'dark' class to <html> element
   - Initialize from localStorage or system preference

2. Create stores/themeStore.ts (Zustand):
   State:
   - isDark: boolean
   
   Actions:
   - toggleDark(): switch mode, save to localStorage
   - setDark(value): set mode
   - initTheme(): load from localStorage or system

3. Update tailwind.config.js with dark mode colors:
   - Backgrounds: dark:bg-slate-900
   - Text: dark:text-slate-100
   - Cards: dark:bg-slate-800
   - Borders: dark:border-slate-700
   - Inputs: dark:bg-slate-700
   - Hover: dark:hover:bg-slate-700

4. Update ALL components to support dark mode:
   - Add dark: classes to every Tailwind class
   - Ensure proper contrast in dark mode
   - Test all pages

5. Create components/common/DarkModeToggle.tsx:
   - Sun/Moon icon (lucide-react)
   - Smooth transition
   - Tooltip: "Switch to dark/light mode"
   - Framer Motion animation

6. Add DarkModeToggle to Header

7. Update App.tsx to call initTheme() on mount

Important:
- Smooth transitions (transition-colors duration-200)
- Persist preference
- System preference as default if no preference saved
- All components tested in both modes

Verification:
- Toggle switches mode
- Preference persists on refresh
- All pages look good in dark mode
- Proper contrast (no unreadable text)
- Smooth transitions
```

---

### Prompt 9.2: Framer Motion Animations

```
Task: Add subtle animations with Framer Motion

Context: As specified in PRD.md (Animations section)

In client/src/:

1. Install framer-motion (already installed)

2. Create utils/animations.ts with preset configs:
   - fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
   - slideUp: { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 20, opacity: 0 } }
   - scaleIn: { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 } }
   - All with duration: 0.2-0.3s, easing: "easeOut"

3. Animate Page Transitions:
   - Wrap page components with motion.div
   - Apply fadeIn animation
   - Example:
     ```tsx
     <motion.div {...fadeIn}>
       <ProjectListPage />
     </motion.div>
     ```

4. Animate List Items (tasks, projects):
   - Use AnimatePresence from framer-motion
   - Stagger animation on mount (staggerChildren: 0.05)
   - Example in KanbanBoard:
     ```tsx
     <motion.div variants={container} initial="hidden" animate="visible">
       {tasks.map((task, i) => (
         <motion.div key={task.id} variants={item}>
           <TaskCard task={task} />
         </motion.div>
       ))}
     </motion.div>
     ```

5. Animate Modals:
   - scaleIn + backdrop fade
   - AnimatePresence for mount/unmount

6. Animate Cards on Hover:
   - whileHover: { y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }

7. Animate Status Badge Changes:
   - layout prop for smooth morphing

8. Animate Notifications (Toast):
   - Slide in from top-right
   - Auto-dismiss with fade out

9. Loading States:
   - Skeleton screens with shimmer effect
   - Use motion.div with animate={{ opacity: [0.5, 1, 0.5] }}

Important:
- Keep animations subtle (200-300ms)
- No animations that cause motion sickness
- GPU-accelerated (transform, opacity only)
- Optional: reduce motion for accessibility (prefers-reduced-motion)

Verification:
- Page transitions smooth
- List items stagger on load
- Card hover lifts
- Modals scale + fade
- Status changes animated
- No performance issues (60fps)
- Looks polished and professional
```

---

## 🧪 Phase 10: Testing

### Prompt 10.1: Backend Tests

```
Task: Setup Jest and write tests for backend

Context: As specified in IMPLEMENTATION_GUIDE.md Phase 8.1

In server/:

1. Install Jest, Supertest, @types/jest, @types/supertest

2. Create jest.config.js:
   - testEnvironment: 'node'
   - coverageDirectory: './coverage'
   - testMatch: ['**/__tests__/**/*.test.ts']

3. Create test database:
   - DATABASE_URL_TEST in .env.test
   - Use separate PostgreSQL database for tests

4. Create server/src/__tests__/setup.ts:
   - Setup test database connection
   - Clear database before each test
   - Seed minimal data

5. Write Unit Tests (server/src/__tests__/unit/):
   - services/authService.test.ts:
     - Test login with valid/invalid credentials
     - Test password hashing
     - Test JWT generation/verification
   - services/projectService.test.ts:
     - Test createProject, updateProject, deleteProject
     - Test project code generation
   - services/taskService.test.ts:
     - Test status transitions
     - Test validation
   - utils/passwordUtils.test.ts

6. Write Integration Tests (server/src/__tests__/integration/):
   - api/auth.test.ts:
     - POST /api/auth/register
     - POST /api/auth/login
     - GET /api/auth/me
   - api/projects.test.ts:
     - CRUD operations
     - Permission checks
   - api/tasks.test.ts:
     - CRUD operations
     - Status changes
     - Timer operations

7. Add scripts to package.json:
   - "test": "jest"
   - "test:watch": "jest --watch"
   - "test:coverage": "jest --coverage"

Coverage target: 70%+

Verification:
- npm test runs all tests
- All tests pass
- Coverage >70%
```

---

### Prompt 10.2: Frontend Tests

```
Task: Setup Vitest and write tests for frontend

Context: As specified in IMPLEMENTATION_GUIDE.md Phase 8.2

In client/:

1. Install vitest, @testing-library/react, @testing-library/jest-dom, msw

2. Create vitest.config.ts

3. Create client/src/__tests__/setup.ts:
   - Setup MSW for API mocking
   - Setup testing library

4. Write Component Tests:
   - components/common/Button.test.tsx:
     - Renders correctly
     - Handles click
     - Shows loading state
   - components/common/Modal.test.tsx
   - components/auth/LoginForm.test.tsx:
     - Validates inputs
     - Submits form
     - Shows errors
   - components/features/tasks/TaskCard.test.tsx
   - components/features/projects/ProjectList.test.tsx

5. Mock API calls with MSW:
   - Mock successful responses
   - Mock error responses
   - Test loading states

6. Add scripts:
   - "test": "vitest"
   - "test:ui": "vitest --ui"
   - "test:coverage": "vitest --coverage"

Coverage target: 60%+

Verification:
- npm test runs all tests
- All tests pass
- Coverage >60%
- MSW mocks API correctly
```

---

## 📚 Final Steps

### Prompt 11: Documentation

```
Task: Generate complete API documentation with Swagger

In server/:

1. Install swagger-jsdoc, swagger-ui-express

2. Create server/src/swagger.ts:
   - Configure swagger-jsdoc
   - OpenAPI 3.0 spec
   - Info: title, version, description
   - Servers: localhost:3000

3. Add JSDoc comments to all routes:
   - @swagger tags
   - Document request/response schemas
   - Examples

4. Setup Swagger UI:
   - app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

5. Create USER_GUIDE.md:
   - Getting Started
   - Dashboard Overview (per role)
   - Managing Projects, Tasks
   - Time Tracking
   - Risk Management
   - Document Control
   - Notifications
   - Reports

Verification:
- Navigate to http://localhost:3000/api-docs
- All endpoints documented
- Can test endpoints via Swagger UI
- USER_GUIDE.md complete
```

---

## 🎉 Complete Project Checklist

### Backend
- [ ] Monorepo setup
- [ ] Prisma schema and migrations
- [ ] Authentication (JWT, bcrypt)
- [ ] Projects CRUD
- [ ] Tasks CRUD
- [ ] Time tracking
- [ ] Comments
- [ ] Risk management
- [ ] Document control
- [ ] Audit trail
- [ ] Notifications (Socket.io)
- [ ] Analytics
- [ ] PDF reports
- [ ] API documentation (Swagger)
- [ ] Tests (Jest)

### Frontend
- [ ] React + Vite setup
- [ ] Tailwind + Dark mode
- [ ] React Router
- [ ] Zustand stores
- [ ] Authentication UI
- [ ] Projects UI
- [ ] Tasks Kanban board
- [ ] Timer component
- [ ] Comments thread
- [ ] Risk matrix
- [ ] Document upload
- [ ] Notifications center
- [ ] Analytics dashboard
- [ ] Framer Motion animations
- [ ] Tests (Vitest)

### Deployment
- [ ] Production build works
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Seed data loaded
- [ ] Runs on localhost
- [ ] Documentation complete

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Nicola (with Claude)

## 💡 Tips for Success

1. **Follow prompts in order** - they build on each other
2. **Test after each prompt** - don't skip ahead
3. **Use checklist** - verify each feature works
4. **Read PRD first** - understand requirements
5. **Ask Claude Code for clarification** - if anything unclear
6. **Commit often** - git commit after each working feature
7. **Take breaks** - this is a lot of work!

Good luck building ProjectPulse! 🚀
